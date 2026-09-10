import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Solo lógica pura (packages/validation cubre los schemas, y las
    // rutas /api/* ya se prueban a mano en el navegador — ver README,
    // "Diseño: testing y revisión completa"). No corre nada que necesite
    // Postgres ni Next.js levantado.
    include: ["src/**/*.test.ts"],
  },
});
