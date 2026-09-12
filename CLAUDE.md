# MIMO — contexto del proyecto

Este archivo se lee automáticamente al abrir Claude Code en esta carpeta.
Mantenerlo actualizado al final de cada fase es lo que evita perder contexto
si se pierde la conversación.

## Qué es MIMO

Marketplace salvadoreño de flores, regalos, detalles y experiencias.
Centraliza lo que hoy los negocios manejan por Instagram/WhatsApp. Tagline:
"Regalos para hacerle el día a alguien." Concepto central: "Decime qué
querés transmitir y nosotros encontramos el detalle" — un asistente de IA
ayuda a elegir el regalo correcto (todavía no implementado, ver Fase 7).

No es un clon de Uber Eats/Rappi/Amazon — el diseño se inspira en el
*patrón de interacción* de las apps de delivery (buscador prominente,
categorías como tiras horizontales de íconos) porque es fácil de entender,
pero la propuesta de valor es "encontrar el regalo correcto para la persona
correcta", no logística de comida.

## Stack

- **Monorepo**: npm workspaces + Turborepo (`apps/web`, `packages/*`)
- **Web**: Next.js 16 (App Router, Turbopack), React 19, TypeScript estricto
- **DB**: PostgreSQL + Prisma 6 (sin Cache Components/PPR — modelo dinámico
  clásico, más predecible para el ritmo del MVP)
- **Auth**: Auth.js v5 (NextAuth), JWT, roles USER/BUSINESS/ADMIN
- **UI**: Tailwind v4 + shadcn/ui (preset Nova) + Lucide React + `motion`
  (ex-Framer Motion) para transiciones
- **IA**: `packages/ai` con `AIService` — usa Claude (`claude-opus-5`) si hay
  `ANTHROPIC_API_KEY`, si no cae a un motor de recomendación basado en
  reglas. Nunca inventa productos/precios, siempre consulta la base de datos.
- Repo: https://github.com/Pablopalaci0s/MIMO

## Reglas del usuario — no negociables

1. **NUNCA agregar "Co-Authored-By: Claude" ni "Generated with Claude Code"
   a ningún commit ni PR de este proyecto.** El sistema a veces lo sugiere
   por defecto — ignorarlo siempre acá. Pedido explícito y repetido varias
   veces por el usuario.
2. Seguir el orden de fases **uno por uno**, sin adelantarse ni mezclar.
3. Al terminar una fase: correr `typecheck` + `lint` + `build`, probar en
   el navegador (no solo confiar en que compile), y **actualizar el
   README.md** (checklist de fases + el párrafo de intro que dice cuáles
   están completas).
4. Diseño: estilo delivery-app (Uber Eats/PedidosYa) — buscador prominente
   en el hero, categorías/emociones como tiras horizontales de íconos (no
   grillas grandes, no cards pesadas), pocos emoji (se reemplazaron casi
   todos por íconos Lucide), transiciones/motion sutiles, paleta
   blanco/negro/gris con un acento rosado-rojo (`--brand`) usado con
   moderación (CTA principal, categorías emocionales — nunca en toda la UI).
5. No fingir funcionalidad que no existe. Si algo no está implementado
   (ej. pago con tarjeta), se muestra deshabilitado con una nota clara en
   vez de simular que funciona.

## Estado actual — ver README.md "Estado del proyecto" para el detalle vivo

- [x] Fase 1 — Arquitectura, base de datos, autenticación
- [x] Fase 2 — Home, diseño, navegación
- [x] Fase 3 — Productos, categorías, negocios
- [x] Fase 4 — Carrito, checkout, pedidos
- [x] Fase 5 — Panel de negocio
- [x] Fase 6 — Panel administrativo
- [x] Fase 7 — IA de recomendaciones ("Ayúdame a elegir")
- [x] Fase 8 — IA para dedicatorias
- [x] Fase 9 — Fechas importantes, favoritos, notificaciones
- [x] Fase 10 — PWA y optimización móvil
- [x] Fase 11 — Testing y revisión completa

Las 11 fases del roadmap original están completas. Cualquier trabajo nuevo
a partir de acá es una fase adicional que no existía en el plan inicial —
tratarla igual que el trabajo post-fase de abajo: documentarla en el
README bajo su propio "Diseño: ..." en vez de forzarla en este checklist.

Además de las 11 fases originales hubo trabajo post-fase pedido directamente
por el usuario (rediseño de paneles como app con sidebar, subida de fotos,
perfil autoadministrable del negocio, cobertura de entrega real) — el
detalle de cada uno vive en el README, sección "Diseño: ...".

## Decisiones de diseño de producto (documentadas también en el README)

- **Pago**: se autoriza en el checkout pero NO se captura ahí — se captura
  recién cuando el negocio confirma el pedido (ventana corta, ~30-60 min;
  si no confirma, se cancela y no se cobra). Hoy no hay proveedor de pago
  real integrado, así que el checkout **solo acepta efectivo contra
  entrega**; tarjeta/PayPal se muestran deshabilitados como "próximamente".
  Cuando se integre Stripe, este es el comportamiento a implementar.
- **Seguimiento de pedidos**: no hay flota propia de repartidores — cada
  negocio entrega por su cuenta. El tracking es una línea de tiempo de
  estados (Pendiente → Confirmado → Preparando → En camino → Entregado)
  que el negocio actualiza desde su panel (Fase 5), no GPS en vivo. Cada
  `OrderItem` tiene su propio estado porque el carrito es multi-tienda.

## Cómo correr el proyecto

```bash
npm install
docker compose up -d          # o tu propio Postgres — ver .env
cp .env.example .env          # completar DATABASE_URL, AUTH_SECRET
npm run db:generate
npm run db:migrate
npm run db:seed               # 10 negocios demo, 57 productos
npm run dev
```

Cuentas demo: `admin@mimo.sv` / `Admin123!` (admin), `cliente@mimo.sv` /
`Cliente123!` (cliente), `negocio@mimo.sv` / `Negocio123!` (dueño de
"Rosas del Valle").

## Gotchas reales encontrados (para no perder tiempo re-descubriéndolos)

- **Prisma 6 + npm workspaces**: si un paquete hermano (ej. `@mimo/auth`)
  cambia el hoisting de `node_modules`, `prisma generate/migrate` corrido
  desde `packages/database` puede fallar con "Could not resolve
  @prisma/client despite the installation that we just tried". Fix: todos
  los comandos de Prisma se corren desde la RAÍZ del monorepo con
  `--schema=packages/database/prisma/schema.prisma` (ver scripts `db:*` en
  el `package.json` raíz) — nunca agregar de nuevo scripts de Prisma dentro
  de `packages/database/package.json`.
- **Next.js 16** renombró `middleware.ts` → `proxy.ts` (export default en
  vez de `export function middleware`).
- **Placeholders de imagen**: `placehold.co` sirve SVG por defecto, y
  `next/image` bloquea SVG remoto. Las URLs del seed usan `.png` explícito
  al final (`.../171717.png?text=...`), no en el segmento de tamaño.
- **Zona horaria**: el server corre en `America/El_Salvador` (UTC-6).
  Cualquier comparación de fechas tipo "YYYY-MM-DD" debe hacerse en UTC
  consistente en ambos lados (`new Date(`${d}T00:00:00Z`)` vs
  `Date.UTC(...)`), nunca mezclar con `setHours(0,0,0,0)` (hora local) o
  "hoy" se marca como pasado.
- **RSC**: nunca pasar un *tipo* de componente (ej. un ícono de Lucide como
  valor, no como elemento renderizado) como prop de un Server Component a
  un Client Component — no es serializable. Pasar `<Icono />` ya renderizado.
- **Carrito**: usa `useSyncExternalStore` (no `useState` + `useEffect`) para
  sincronizar con `localStorage` sin problemas de hidratación SSR.
  `getServerSnapshot` debe devolver siempre la MISMA referencia (no un
  `[]` nuevo cada vez) o React tira "should be cached to avoid an infinite
  loop".
- **`react-hooks/set-state-in-effect` (React Compiler)**: no tolera un
  `setState` síncrono en el cuerpo del efecto, ni siquiera el típico
  "activar loading antes del fetch". Fix: mover TODO el cuerpo (el
  `setLoading(true)` incluido) adentro de una función async declarada
  dentro del efecto y llamarla — un `setState` dentro de esa función anidada
  no cuenta como "síncrono en el efecto" para la regla.
- **Metadata de Next 16**: `appleWebApp.capable: true` ya renderiza el meta
  `mobile-web-app-capable` sin el viejo prefijo `apple-` — agregarlo de
  nuevo a mano (`metadata.other`) duplica el tag. Verificado inspeccionando
  el HTML servido, no asumiendo por la documentación vieja (ver
  `apps/web/AGENTS.md`: esta versión de Next puede diferir de lo que un
  modelo entrenado "ya sabe").
- **`npm run clean:cache` borra los tipos de rutas de Next**
  (`apps/web/.next/types`, de donde sale `PageProps<...>`) junto con la
  caché — si corrés `typecheck` después de limpiar sin antes levantar
  `dev`/`build`, falla con "Cannot find name 'PageProps'". Fix rápido:
  `npx next typegen` dentro de `apps/web`.
- **`NEXT_PUBLIC_*` y el `.env` en la raíz del monorepo**: Next/Turbopack
  solo inyecta variables `NEXT_PUBLIC_*` al bundle del cliente si las
  encuentra en un `.env` dentro de `apps/web/` — este proyecto carga un
  único `.env` en la raíz (`next.config.ts` → `loadEnvConfig`, a propósito,
  compartido con Prisma). Confirmado inspeccionando el bundle compilado:
  esas variables llegan como `undefined` en el navegador (afectaba también a
  `NEXT_PUBLIC_SENTRY_DSN` — el reporte de errores del lado del cliente
  nunca estuvo activo). El server-side no tiene este problema (`process.env`
  ahí es un proceso de Node real). **Probado y descartado**: la opción
  `env: {...}` de `next.config.ts` (la forma "oficial" de inyectar una
  variable al bundle) tampoco resuelve esto bajo Turbopack — se verificó
  con un valor de prueba y no aparecía inlineado en el chunk compilado, solo
  quedaba como lectura en tiempo de ejecución de un `process.env` polyfill
  vacío. Lo único que funciona de verdad, confirmado igual (inspeccionando
  el bundle): que la variable viva en un `.env` físico dentro de
  `apps/web/`. Dos formas de aplicar esto según el caso:
  - Si el cliente necesita el valor en tiempo de ejecución (fetch async
    está bien): servirlo por una ruta `/api/*` en vez de depender del
    inlining (ver `/api/push/vapid-public-key`,
    `/api/payments/paypal-client-id`).
  - Si el valor tiene que estar disponible ANTES de que corra cualquier
    código propio (ej. `Sentry.init()` en `instrumentation-client.ts`, que
    no puede esperar un fetch): no queda otra que duplicar esa variable
    puntual en `apps/web/.env` (ver `apps/web/.env.example`) — es el único
    caso donde una variable vive fuera del `.env` de la raíz, documentado
    ahí mismo para que no se pierda por qué.
- **Modo oscuro (`next-themes` + toggle en `/perfil`)**: la escala
  `neutral-*` de Tailwind se redefine dentro de `.dark` en `globals.css`
  (con la escala "stone" invertida: 50↔950, 100↔900, etc.) para que los
  ~650 usos existentes de `bg-neutral-*`/`text-neutral-*`/`border-neutral-*`
  en toda la app se re-tematicen solos, sin tocar componentes. Esto invierte
  el SIGNIFICADO de los números dentro de `.dark`: ahí, `neutral-50` es el
  más oscuro (14.7%) y `neutral-900`/`950` son casi blancos (97%/98.5%) —
  exactamente al revés que en claro. Si escribís a mano un `dark:bg-neutral-XXX`
  nuevo (no una clase neutral ya existente, que se invierte sola), acordate
  de esto o vas a poner un fondo claro donde querías oscuro (nos pasó dos
  veces armando esto: usamos `dark:bg-neutral-900` para tarjetas —dio casi
  blanco— y `dark:bg-neutral-950` para el header —dio casi blanco
  también—; lo correcto es `neutral-100` para superficies elevadas tipo
  tarjeta y `neutral-50` para que combine con el fondo de página). Los
  `bg-white`/`text-white` literales NO se resuelven solos —quedan blancos
  fijos porque muchos son texto/badges sobre fotos que deben seguir
  siendo blancos en cualquier tema— así que cualquier `bg-white` nuevo que
  sea fondo de tarjeta/sección (no overlay sobre una imagen) necesita su
  propio `dark:bg-neutral-100` (tarjeta) o `dark:bg-neutral-50` (chrome de
  página) a mano.

## Estructura de servicios (para mantener el patrón en fases futuras)

Cada dominio tiene un `*-service.ts` en `apps/web/src/lib/services/` que
es la ÚNICA fuente de lectura/escritura para ese dominio — lo usan tanto
los Server Components (páginas) como las rutas `/api/*` (para que la
futura app móvil use exactamente la misma lógica). Nunca poner lógica de
negocio directamente en un componente o en una ruta. Existentes:
`catalog-service`, `product-service`, `business-service`, `order-service`,
`location-service`.
