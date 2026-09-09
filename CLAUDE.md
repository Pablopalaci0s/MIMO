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
- [ ] **Fase 5 — Panel de negocio (siguiente)**: el negocio confirma/prepara/
      marca en camino/entrega sus `OrderItem`, gestiona su catálogo (CRUD
      de productos), horarios, zonas de entrega, y ve sus ventas.
- [ ] Fase 6 — Panel administrativo
- [ ] Fase 7 — IA de recomendaciones ("Ayúdame a elegir" — hoy es un stub)
- [ ] Fase 8 — IA para dedicatorias
- [ ] Fase 9 — Fechas importantes, favoritos, notificaciones
- [ ] Fase 10 — PWA y optimización móvil
- [ ] Fase 11 — Testing y revisión completa

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

## Estructura de servicios (para mantener el patrón en fases futuras)

Cada dominio tiene un `*-service.ts` en `apps/web/src/lib/services/` que
es la ÚNICA fuente de lectura/escritura para ese dominio — lo usan tanto
los Server Components (páginas) como las rutas `/api/*` (para que la
futura app móvil use exactamente la misma lógica). Nunca poner lógica de
negocio directamente en un componente o en una ruta. Existentes:
`catalog-service`, `product-service`, `business-service`, `order-service`,
`location-service`.
