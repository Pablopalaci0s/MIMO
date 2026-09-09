# MIMO

**Decime qué querés transmitir y nosotros encontramos el detalle.**

MIMO es un marketplace salvadoreño de flores, regalos, detalles y experiencias.
Centraliza lo que hoy los negocios manejan por Instagram/WhatsApp: catálogo,
disponibilidad, precios, entrega y pago, todo en un solo lugar — con un
asistente de IA que ayuda a elegir el regalo correcto.

Este repositorio contiene la **Fase 1** del proyecto: arquitectura del
monorepo, base de datos y autenticación. Las fases siguientes (home, catálogo,
carrito/checkout, paneles de negocio/admin, IA de recomendaciones, PWA, etc.)
se construyen en el orden descrito más abajo.

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

También crea un negocio de demostración (`Flores Demo MIMO`, marcado `isDemo`).

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
- [ ] Fase 3 — Productos, categorías, negocios
- [ ] Fase 4 — Carrito, checkout, pedidos
- [ ] Fase 5 — Panel de negocio
- [ ] Fase 6 — Panel administrativo
- [ ] Fase 7 — IA de recomendaciones
- [ ] Fase 8 — IA para dedicatorias
- [ ] Fase 9 — Fechas importantes, favoritos, notificaciones
- [ ] Fase 10 — PWA y optimización móvil
- [ ] Fase 11 — Testing y revisión completa

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
