# MIMO

**Decime qué querés transmitir y nosotros encontramos el detalle.**

MIMO es un marketplace salvadoreño de flores, regalos, detalles y experiencias.
Centraliza lo que hoy los negocios manejan por Instagram/WhatsApp: catálogo,
disponibilidad, precios, entrega y pago, todo en un solo lugar — con un
asistente de IA que ayuda a elegir el regalo correcto.

El proyecto se construye por fases (ver **Estado del proyecto** más abajo).
Completas hasta ahora: arquitectura del monorepo, base de datos y
autenticación (Fase 1), home y navegación (Fase 2), catálogo de productos y
negocios (Fase 3), carrito/checkout/pedidos (Fase 4), y el panel de negocio
(Fase 5). Las fases siguientes (panel admin, IA de recomendaciones, PWA,
etc.) se construyen en el orden descrito más abajo.

## Arquitectura

```text
mimo/
├── apps/
│   └── web/            Next.js 16 (App Router) — web + PWA
│       └── mobile/     (futuro) React Native + Expo, consume la misma API
│
├── packages/
│   ├── database/       Prisma schema, cliente y seed
│   ├── types/           Tipos/DTOs compartidos entre web y la futura app móvil
│   ├── validation/      Esquemas Zod compartidos
│   ├── auth/             Auth.js (NextAuth v5), roles y helpers de autorización
│   └── ai/               AIService: proveedor de IA + motor de recomendación sin IA
│
├── docker-compose.yml   Postgres local opcional
└── turbo.json
```

Principio central: **Web → API (`/api/*`) → Services → Database.** La lógica
de negocio vive en `packages/*`, nunca directamente en componentes de React.
Cuando exista `apps/mobile`, consumirá los mismos endpoints `/api/*` sin tocar
Postgres directamente.

## Requisitos

- Node.js 20+
- PostgreSQL 14+ (local, Docker, o un proveedor administrado)

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar PostgreSQL

Opción A — Docker (incluido en este repo):

```bash
docker compose up -d
```

Opción B — Postgres instalado localmente, o un proveedor administrado
(Neon, Supabase, RDS, etc.). Solo necesitás la cadena de conexión.

## 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editá `.env` en la raíz (es el único archivo de entorno del monorepo — tanto
`apps/web` como `packages/database` lo leen desde ahí):

- `DATABASE_URL`: cadena de conexión a Postgres.
- `AUTH_SECRET`: generar con `openssl rand -base64 32`.
- `ANTHROPIC_API_KEY`: opcional. Sin ella, el asistente de regalos sigue
  funcionando con un motor de recomendación basado en reglas (categoría,
  ocasión, presupuesto, popularidad, disponibilidad).

## 4. Ejecutar Prisma

```bash
npm run db:generate   # genera el cliente de Prisma
npm run db:migrate    # crea las tablas (pide un nombre de migración)
```

## 5. Cargar datos demo

```bash
npm run db:seed
```

Esto crea los 14 departamentos de El Salvador con sus municipios, categorías,
ocasiones/emociones, y tres cuentas de prueba:

| Rol      | Correo            | Contraseña   |
| -------- | ------------------ | ------------ |
| Admin    | admin@mimo.sv      | Admin123!    |
| Cliente  | cliente@mimo.sv    | Cliente123!  |
| Negocio  | negocio@mimo.sv    | Negocio123!  |

También crea 10 negocios ficticios (marcados `isDemo`) con 57 productos en
total, repartidos en las 12 categorías, con zonas de entrega y ratings
aleatorios — ver `packages/database/prisma/seed-data/demo-catalog.ts`.

## 6. Iniciar desarrollo

```bash
npm run dev
```

Abrí http://localhost:3000. Podés registrarte, iniciar sesión, o usar una de
las cuentas demo de arriba.

## 7. Build de producción

```bash
npm run build
npm run lint
npm run typecheck
```

## Comandos útiles

```bash
npm run db:studio          # explorador visual de la base de datos
npm run db:migrate:deploy  # aplicar migraciones en producción (sin prompts)
```

## Estado del proyecto — orden de desarrollo

- [x] **Fase 1** — Arquitectura, base de datos, autenticación
- [x] **Fase 2** — Home, diseño, navegación
- [x] **Fase 3** — Productos, categorías, negocios
- [x] **Fase 4** — Carrito, checkout, pedidos
- [x] **Fase 5** — Panel de negocio
- [ ] Fase 6 — Panel administrativo
- [ ] Fase 7 — IA de recomendaciones
- [ ] Fase 8 — IA para dedicatorias
- [ ] Fase 9 — Fechas importantes, favoritos, notificaciones
- [ ] Fase 10 — PWA y optimización móvil
- [ ] Fase 11 — Testing y revisión completa

## Diseño: pagos y seguimiento de pedidos (Fase 4)

Dos decisiones de producto que definen cómo se construyó el checkout:

**Seguimiento de pedidos.** MIMO no tiene flota propia de repartidores — cada
negocio maneja su propia entrega (sección 20 del spec). Por eso el
"tracking" no es GPS en vivo, sino una línea de tiempo de estados que el
negocio actualiza desde su panel (Fase 5):
`Pendiente → Confirmado → Preparando → En camino → Entregado` (o
`Cancelado`). Como el carrito es multi-tienda, cada `OrderItem` tiene su
propio estado independiente del estado general del `Order`: un negocio
puede confirmar/entregar su parte sin depender de los demás. GPS en vivo y
repartidores propios (sección 41) quedan para cuando haya volumen que lo
justifique.

**Pago: autorizar primero, capturar al confirmar — no cobrar en el checkout.**
El problema real: si se cobra en el momento del checkout, un negocio puede
recibir una plata que ya no puede reembolsar fácilmente si no puede cumplir
el pedido. La solución adoptada es autorizar la tarjeta (hold) en el
checkout pero *no* capturar el cobro; el negocio tiene una ventana corta
(ej. 30–60 min) para confirmar que puede cumplirlo, y recién ahí se captura.
Si no confirma a tiempo, el pedido se cancela automáticamente y no se cobra
nada. Esto requiere un proveedor que soporte auth/capture por separado
(Stripe lo hace nativamente) y un job programado que cancele pedidos sin
confirmar. **Estado actual de la implementación:** todavía no hay un
proveedor de pagos real integrado, así que el checkout de esta fase solo
ofrece **pago contra entrega (efectivo)**, que no necesita auth/capture.
Tarjeta y PayPal se muestran en la UI como "Próximamente" — el modelo
`Payment` (`status`: `PENDING/PAID/FAILED/REFUNDED`) y el flujo de
confirmación del negocio (Fase 5) ya están pensados para que integrar
Stripe después sea un cambio localizado, no un rediseño.

## Diseño: home (post-Fase 5, polish)

Ajustes al home inspirados en el patrón de apps de delivery (Uber Eats/
PedidosYa), pero sin adoptar su identidad visual — solo el patrón de
interacción, con datos reales en todos los casos:

- **Barra de navegación inferior (móvil)**: reemplaza el menú hamburgués.
  Inicio / Buscar / Carrito / Perfil, siempre visible en `sm:hidden`. El
  ícono de Perfil reutiliza el mismo `UserMenu` con rol (negocio/admin) que
  ya existía en el header — no es un componente nuevo con lógica duplicada.
- **Negocios destacados**: los negocios mejor calificados del catálogo
  (`listFeaturedBusinesses`), con la imagen de su producto más vendido, no
  una foto de portada inventada.
- **Filtros rápidos** (Entrega hoy / Ofertas / Mejor valorados): enlazan a
  filtros reales de `/regalos`. "Ofertas" es un filtro nuevo
  (`onSale`/`compareAtPrice IS NOT NULL`) — el `ProductCard` ahora muestra
  el precio tachado y el % de descuento cuando aplica.
- **Volver a pedir**: solo se muestra si el usuario logueado ya tiene
  pedidos reales (`listRecentlyOrderedProducts`); no aparece para cuentas
  nuevas.

## Diseño: panel de negocio (Fase 5)

`/negocio` es el dashboard para el rol `BUSINESS`: resumen (pedidos
pendientes, ventas de hoy/mes, productos activos, rating), gestión de
pedidos (`OrderItem`), CRUD de productos, horarios/tiempo de preparación y
zonas de entrega. El `businessId` nunca viaja desde el cliente — cada
request lo resuelve desde la sesión vía `BusinessUser` (`requireBusinessId`
en `business-service.ts`), así que un negocio no puede leer ni modificar
datos de otro aunque adivine un id.

**Progreso del `Order` = el ítem menos avanzado.** Como el carrito es
multi-tienda, cada negocio solo controla sus propios `OrderItem`. El
`Order.status` general se recalcula automáticamente después de cada cambio
como el estado menos avanzado entre los ítems que siguen activos (no
cancelados) — un negocio no puede "adelantar" el pedido completo mientras
otro todavía no confirma el suyo. Si todos los ítems terminan cancelados,
el pedido completo queda `CANCELLED`. Las transiciones válidas son
`PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`, con
`CANCELLED` disponible hasta antes de `OUT_FOR_DELIVERY` — la API rechaza
cualquier salto (ver `business-order-service.ts`).

**Sin backend de subida de archivos.** Las imágenes de producto se cargan
por URL (igual que el seed, que usa `placehold.co`) — no hay integración de
storage todavía, así que pedir una URL en vez de simular un upload es la
opción honesta para el MVP.

## Notas técnicas

- **Next.js 16**: usa el modelo de renderizado dinámico "clásico" (sin Cache
  Components/PPR) a propósito — el catálogo y las recomendaciones son
  inherentemente dinámicos, y este modelo es más predecible para el ritmo de
  desarrollo del MVP. Se puede activar `cacheComponents` más adelante como
  optimización.
- El archivo de rutas protegidas es `apps/web/src/proxy.ts` (Next 16 renombró
  `middleware.ts` a `proxy.ts`).
- `npm audit` reporta una vulnerabilidad "high" transitiva en `deepmerge-ts`
  (vía la CLI de Prisma). Es una dependencia de *tooling* de desarrollo, no
  llega al código que corre en producción; no hay una versión de Prisma que
  la resuelva todavía.
- **UI**: shadcn/ui (preset Nova, Base UI/Radix + Lucide) sobre Tailwind v4.
  Paleta blanco/negro/gris con un acento de marca (`--brand`) reservado para
  el CTA principal y las categorías emocionales — nunca para el resto de la
  interfaz.
