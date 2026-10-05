import { describe, expect, it } from "vitest";
import {
  HELP_MATCH_CONFIDENT_SCORE,
  buildEscalationSummary,
  detectHumanRequest,
  detectSensitiveTopic,
  extractOrderNumber,
  extractProductQuery,
  isGreeting,
  isOrderStatusIntent,
  isThanks,
  matchHelpItems,
  normalizeText,
} from "./bot-rules";

describe("normalizeText", () => {
  it("quita tildes, signos y mayúsculas", () => {
    expect(normalizeText("¿Cómo PAGO, por favor?")).toBe("como pago por favor");
  });
});

describe("extractOrderNumber", () => {
  it("encuentra el número en medio de una frase y lo normaliza a mayúsculas", () => {
    expect(extractOrderNumber("mi pedido es mimo-20260912-ab12c, gracias")).toBe("MIMO-20260912-AB12C");
  });

  it("no inventa un número cuando no hay", () => {
    expect(extractOrderNumber("dónde está mi pedido")).toBeNull();
    expect(extractOrderNumber("MIMO-2026-ABC")).toBeNull();
  });
});

describe("detectHumanRequest", () => {
  it.each([
    "quiero hablar con una persona",
    "necesito un agente",
    "pasame con soporte",
    "Quiero hablar con alguien del equipo",
    "no quiero hablar con un bot",
    "atención humana por favor",
    "agente",
  ])("detecta: %s", (text) => {
    expect(detectHumanRequest(text)).toBe(true);
  });

  it.each([
    "¿cómo hago un pedido?",
    "qué métodos de pago aceptan",
    "quiero una persona para regalar flores",
    "hola",
  ])("no se dispara con: %s", (text) => {
    expect(detectHumanRequest(text)).toBe(false);
  });
});

describe("detectSensitiveTopic", () => {
  it.each([
    "me cobraron doble",
    "quiero un reembolso",
    "esto es una estafa",
    "mi pedido no llegó",
    "no me llegó el regalo",
    "quiero que me devuelvan mi dinero",
  ])("detecta: %s", (text) => {
    expect(detectSensitiveTopic(text)).toBe(true);
  });

  it.each(["¿cómo pago?", "cuánto cuesta el envío", "qué es una cabuda"])("no se dispara con: %s", (text) => {
    expect(detectSensitiveTopic(text)).toBe(false);
  });
});

describe("matchHelpItems", () => {
  const top = (text: string) => matchHelpItems(text)[0];

  it("encuentra la pregunta correcta por frases clave", () => {
    expect(top("¿qué métodos de pago hay?")?.item.question).toContain("métodos de pago");
    expect(top("cuánto cuesta el envío")?.item.question).toContain("costo de envío");
    expect(top("olvidé mi contraseña")?.item.question).toContain("contraseña");
    expect(top("qué es una cabuda")?.item.question).toContain("cabuda");
    expect(top("quiero hablar con una persona de soporte")?.item.question).toContain("persona del equipo");
  });

  it("las coincidencias fuertes superan el umbral de confianza", () => {
    expect(top("cómo uso un cupón")!.score).toBeGreaterThanOrEqual(HELP_MATCH_CONFIDENT_SCORE);
  });

  it("un mensaje sin relación no llega al umbral de confianza", () => {
    const best = top("xyz qwerty asdf");
    expect(best === undefined || best.score < HELP_MATCH_CONFIDENT_SCORE).toBe(true);
    expect(matchHelpItems("hola buenas tardes")[0]?.score ?? 0).toBeLessThan(HELP_MATCH_CONFIDENT_SCORE);
  });

  it("devuelve como máximo el límite pedido, ordenado de mayor a menor", () => {
    const matches = matchHelpItems("pago envío pedido cupón", undefined, 2);
    expect(matches.length).toBeLessThanOrEqual(2);
    if (matches.length === 2) expect(matches[0]!.score).toBeGreaterThanOrEqual(matches[1]!.score);
  });
});

describe("extractProductQuery", () => {
  it("se queda con las palabras del producto", () => {
    expect(extractProductQuery("busco rosas rojas")).toBe("rosas rojas");
    expect(extractProductQuery("¿tienen chocolates?")).toBe("chocolates");
  });

  it("queda vacío si solo hay palabras de relleno", () => {
    expect(extractProductQuery("hola, quiero algo")).toBe("");
  });
});

describe("buildEscalationSummary", () => {
  it("incluye lo último que dijo la persona, no los mensajes del bot", () => {
    const summary = buildEscalationSummary([
      { role: "USER", body: "Mi pedido no llegó" },
      { role: "BOT", body: "Lamento escuchar eso" },
      { role: "USER", body: "Ya pasó una semana" },
    ]);
    expect(summary).toContain("Mi pedido no llegó");
    expect(summary).toContain("Ya pasó una semana");
    expect(summary).not.toContain("Lamento escuchar eso");
  });

  it("no repite el motivo (se guarda y se muestra aparte)", () => {
    expect(buildEscalationSummary([{ role: "USER", body: "hola" }])).not.toContain("Motivo");
  });

  it("recorta los mensajes largos", () => {
    const summary = buildEscalationSummary([{ role: "USER", body: "a".repeat(500) }]);
    expect(summary.length).toBeLessThan(260);
    expect(summary).toContain("…");
  });

  it("tiene un texto por defecto si no hay nada que resumir", () => {
    expect(buildEscalationSummary([])).toBe("La persona pidió hablar con alguien del equipo.");
  });
});

describe("isGreeting / isThanks", () => {
  it("reconoce saludos y agradecimientos cortos", () => {
    expect(isGreeting("Hola!")).toBe(true);
    expect(isGreeting("buenas tardes")).toBe(true);
    expect(isThanks("muchas gracias")).toBe(true);
  });

  it("no confunde una consulta que arranca con hola", () => {
    expect(isGreeting("hola quiero saber cómo pago con tarjeta en el checkout")).toBe(false);
    expect(isThanks("gracias pero no me sirvió, mi pedido sigue sin llegar")).toBe(false);
  });
});

describe("isOrderStatusIntent", () => {
  it.each(["¿cuál es el estado de mi pedido?", "dónde está mi pedido", "cuándo llega mi regalo", "mis pedidos"])(
    "detecta: %s",
    (text) => expect(isOrderStatusIntent(text)).toBe(true),
  );

  it("no se dispara con preguntas generales", () => {
    expect(isOrderStatusIntent("¿cómo hago un pedido?")).toBe(false);
  });
});
