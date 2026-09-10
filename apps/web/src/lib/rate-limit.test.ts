import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, getClientIp } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("permite hasta el límite y bloquea el siguiente", () => {
    const key = `test-${crypto.randomUUID()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000).limited).toBe(false);
    }
    expect(checkRateLimit(key, 3, 60_000).limited).toBe(true);
  });

  it("baldes distintos no se pisan entre sí", () => {
    const keyA = `test-a-${crypto.randomUUID()}`;
    const keyB = `test-b-${crypto.randomUUID()}`;
    for (let i = 0; i < 3; i++) checkRateLimit(keyA, 3, 60_000);
    expect(checkRateLimit(keyA, 3, 60_000).limited).toBe(true);
    expect(checkRateLimit(keyB, 3, 60_000).limited).toBe(false);
  });

  it("la ventana se reinicia después de que pasa el tiempo", () => {
    vi.useFakeTimers();
    const key = `test-${crypto.randomUUID()}`;
    checkRateLimit(key, 1, 1000);
    expect(checkRateLimit(key, 1, 1000).limited).toBe(true);

    vi.advanceTimersByTime(1001);
    expect(checkRateLimit(key, 1, 1000).limited).toBe(false);
    vi.useRealTimers();
  });

  it("retryAfterSeconds es positivo cuando está limitado", () => {
    const key = `test-${crypto.randomUUID()}`;
    checkRateLimit(key, 1, 60_000);
    const result = checkRateLimit(key, 1, 60_000);
    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("getClientIp", () => {
  it("usa el primer IP de x-forwarded-for cuando hay varios", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("cae a x-real-ip si no hay x-forwarded-for", () => {
    const request = new Request("http://localhost", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(getClientIp(request)).toBe("9.9.9.9");
  });

  it("devuelve 'unknown' si no hay ningún header (no revienta)", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request)).toBe("unknown");
  });
});
