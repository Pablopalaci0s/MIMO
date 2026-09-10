import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  passwordChangeSchema,
  registerBusinessSchema,
  registerSchema,
  resetPasswordSchema,
  userUpdateSchema,
} from "./auth";

describe("registerSchema", () => {
  const valid = { name: "María López", email: "Maria@Correo.com", phone: "78991234", password: "Abcdef12" };

  it("acepta datos válidos y normaliza el correo a minúsculas", () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe("maria@correo.com");
  });

  it("el teléfono es opcional", () => {
    const { phone: _phone, ...rest } = valid;
    expect(() => registerSchema.parse(rest)).not.toThrow();
  });

  it.each(["12345678", "3", "789912345", "789-91234"])(
    "rechaza teléfonos que no empiezan con 2/6/7 o no tienen 8 dígitos: %s",
    (phone) => {
      expect(() => registerSchema.parse({ ...valid, phone })).toThrow();
    },
  );

  it.each(["abcdefgh", "abcdefg1", "ABCDEFGH"])(
    "rechaza contraseñas sin mayúscula+número: %s",
    (password) => {
      expect(() => registerSchema.parse({ ...valid, password })).toThrow();
    },
  );

  it("rechaza contraseñas de menos de 8 caracteres", () => {
    expect(() => registerSchema.parse({ ...valid, password: "Ab1" })).toThrow();
  });

  it("rechaza un correo inválido", () => {
    expect(() => registerSchema.parse({ ...valid, email: "no-es-un-correo" })).toThrow();
  });

  it("rechaza un nombre de un solo caracter", () => {
    expect(() => registerSchema.parse({ ...valid, name: "A" })).toThrow();
  });
});

describe("loginSchema", () => {
  it("no exige ningún formato de contraseña, solo que no esté vacía", () => {
    expect(() => loginSchema.parse({ email: "a@b.com", password: "x" })).not.toThrow();
    expect(() => loginSchema.parse({ email: "a@b.com", password: "" })).toThrow();
  });
});

describe("registerBusinessSchema", () => {
  const valid = {
    businessName: "Rosas del Valle",
    ownerName: "Ana",
    email: "ana@rosas.com",
    phone: "78991234",
    municipalityId: "8f14e45f-ceea-467e-adf1-4e9c66c1a0d3",
    addressLine: "Colonia Escalón, calle 1",
    password: "Abcdef12",
  };

  it("acepta datos válidos", () => {
    expect(() => registerBusinessSchema.parse(valid)).not.toThrow();
  });

  it("el teléfono NO es opcional acá (a diferencia de registerSchema)", () => {
    const { phone: _phone, ...rest } = valid;
    expect(() => registerBusinessSchema.parse(rest)).toThrow();
  });

  it("requiere un municipalityId con formato UUID", () => {
    expect(() => registerBusinessSchema.parse({ ...valid, municipalityId: "no-es-uuid" })).toThrow();
  });
});

describe("userUpdateSchema", () => {
  it("acepta teléfono vacío ('') además de undefined — a diferencia de registerSchema", () => {
    expect(() => userUpdateSchema.parse({ name: "Ana", phone: "" })).not.toThrow();
  });

  it("sigue validando el formato si se manda un teléfono no vacío", () => {
    expect(() => userUpdateSchema.parse({ name: "Ana", phone: "123" })).toThrow();
  });
});

describe("forgotPasswordSchema", () => {
  it("normaliza el correo a minúsculas", () => {
    expect(forgotPasswordSchema.parse({ email: "Ana@Correo.COM" }).email).toBe("ana@correo.com");
  });

  it("rechaza un correo con formato inválido", () => {
    expect(() => forgotPasswordSchema.parse({ email: "no-es-correo" })).toThrow();
  });
});

describe("resetPasswordSchema", () => {
  it("acepta un token y una contraseña que cumple el formato", () => {
    expect(() => resetPasswordSchema.parse({ token: "abc123", password: "Abcdef12" })).not.toThrow();
  });

  it("rechaza un token vacío", () => {
    expect(() => resetPasswordSchema.parse({ token: "", password: "Abcdef12" })).toThrow();
  });

  it("exige el mismo formato de contraseña que el registro", () => {
    expect(() => resetPasswordSchema.parse({ token: "abc123", password: "debil" })).toThrow();
  });
});

describe("passwordChangeSchema", () => {
  it("currentPassword no tiene reglas de formato, solo newPassword", () => {
    expect(() =>
      passwordChangeSchema.parse({ currentPassword: "cualquier-cosa", newPassword: "Abcdef12" }),
    ).not.toThrow();
  });

  it("rechaza newPassword débil aunque currentPassword sea válida", () => {
    expect(() =>
      passwordChangeSchema.parse({ currentPassword: "Abcdef12", newPassword: "debil" }),
    ).toThrow();
  });
});
