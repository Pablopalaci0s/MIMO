import { describe, expect, it } from "vitest";
import { daysBetweenUtc, parseUtcDateOnly, utcDateOnly } from "./date-utils";

describe("utcDateOnly", () => {
  it("descarta la hora, conservando solo el día calendario en UTC", () => {
    const withTime = new Date("2026-03-15T23:45:00Z");
    expect(utcDateOnly(withTime).toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });

  it("no se ve afectado por la hora local del proceso que corre el test — usa siempre los getUTC*", () => {
    // 23:45 UTC del 15 no debe convertirse en 16 solo por correr en una
    // zona horaria con offset positivo — exactamente el bug real de
    // CLAUDE.md ("Zona horaria") que esta utilidad existe para prevenir.
    const lateInDay = new Date(Date.UTC(2026, 0, 1, 23, 59, 59));
    expect(utcDateOnly(lateInDay).getUTCDate()).toBe(1);
  });
});

describe("parseUtcDateOnly", () => {
  it("interpreta 'YYYY-MM-DD' como medianoche UTC de ese día, no la hora local", () => {
    const parsed = parseUtcDateOnly("2026-12-25");
    expect(parsed.toISOString()).toBe("2026-12-25T00:00:00.000Z");
  });
});

describe("daysBetweenUtc", () => {
  it("devuelve 0 para el mismo día calendario, aunque las horas difieran", () => {
    const morning = new Date("2026-06-01T02:00:00Z");
    const night = new Date("2026-06-01T23:00:00Z");
    expect(daysBetweenUtc(morning, night)).toBe(0);
  });

  it("devuelve positivo cuando 'to' es en el futuro respecto a 'from'", () => {
    expect(daysBetweenUtc(parseUtcDateOnly("2026-01-01"), parseUtcDateOnly("2026-01-08"))).toBe(7);
  });

  it("devuelve negativo cuando 'to' ya pasó", () => {
    expect(daysBetweenUtc(parseUtcDateOnly("2026-01-08"), parseUtcDateOnly("2026-01-01"))).toBe(-7);
  });

  it("cruza correctamente un límite de mes/año", () => {
    expect(daysBetweenUtc(parseUtcDateOnly("2025-12-30"), parseUtcDateOnly("2026-01-02"))).toBe(3);
  });
});
