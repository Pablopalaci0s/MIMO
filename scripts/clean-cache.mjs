// Borra las cachés de desarrollo que crecen sin límite mientras se usa
// `npm run dev`/`build`/`lint` (Turborepo y Turbopack nunca las limpian
// solas). No borra código ni datos — todo se regenera en la siguiente
// corrida, solo un poco más lento la primera vez.
import { existsSync, rmSync } from "node:fs";

const targets = [".turbo/cache", "apps/web/.next"];

for (const target of targets) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    console.log(`Borrado: ${target}`);
  } else {
    console.log(`Ya estaba limpio: ${target}`);
  }
}
