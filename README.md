# MIMO

**Decime qué querés transmitir y nosotros encontramos el detalle.**

MIMO es un marketplace salvadoreño de flores, regalos, detalles y experiencias.
Centraliza lo que hoy los negocios manejan por Instagram/WhatsApp: catálogo,
disponibilidad, precios, entrega y pago, todo en un solo lugar — con un
asistente de IA que ayuda a elegir el regalo correcto.

El proyecto se construye por fases (ver **Estado del proyecto** más abajo).
Completas hasta ahora: arquitectura del monorepo, base de datos y
autenticación (Fase 1), home y navegación (Fase 2), catálogo de productos y
negocios (Fase 3), carrito/checkout/pedidos (Fase 4), panel de negocio
(Fase 5), panel administrativo (Fase 6), el asistente de IA "Ayúdame a
elegir" (Fase 7), y el asistente de dedicatorias (Fase 8). Las fases
siguientes (fechas importantes/favoritos, PWA, etc.) se construyen en el
orden descrito más abajo.

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
npm run clean:cache        # borra .turbo/cache y apps/web/.next (ver nota abajo)
```

**Sobre `clean:cache`:** Turborepo (`.turbo/cache`) y Turbopack (`apps/web/.next`)
guardan caché de cada `dev`/`build`/`lint` para acelerar la siguiente corrida,
pero nunca la borran solas — en una sesión de desarrollo larga esto puede
crecer a varios GB sin que se note (nos pasó: ~16 GB acumulados). Correr
`npm run clean:cache` de vez en cuando es seguro — no borra código ni datos,
solo hace que la próxima `dev`/`build` tarde un poco más en arrancar mientras
reconstruye la caché.

## Estado del proyecto — orden de desarrollo

- [x] **Fase 1** — Arquitectura, base de datos, autenticación
- [x] **Fase 2** — Home, diseño, navegación
- [x] **Fase 3** — Productos, categorías, negocios
- [x] **Fase 4** — Carrito, checkout, pedidos
- [x] **Fase 5** — Panel de negocio
- [x] **Fase 6** — Panel administrativo
- [x] **Fase 7** — IA de recomendaciones
- [x] **Fase 8** — IA para dedicatorias
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

## Diseño: IA para dedicatorias (Fase 8)

Botón "Escribime la dedicatoria" junto al campo de dedicatoria en
`/productos/[slug]` (`components/catalog/dedication-assistant.tsx`). Usa
`AIService.generateDedication`, que también ya estaba construido desde la
Fase 1 — mismo patrón que la Fase 7: solo faltaba conectarlo a la UI.

- 5 tonos (sincero, romántico, divertido, formal, corto) + instrucciones
  libres opcionales (ej. "quiero algo romántico pero no demasiado cursi").
- Cada opción generada permite **usar** (rellena el textarea principal),
  **copiar**, o regenerar con un tono distinto — los tres accesos rápidos
  "Más romántico / Más corto / Más divertido" del spec.
- Mismo fallback sin IA que la Fase 7: sin `ANTHROPIC_API_KEY`, usa
  plantillas fijas por tono (`FALLBACK_DEDICATIONS` en `ai-service.ts`) en
  vez de fallar — el usuario ve el mismo flujo, solo cambia el texto
  generado.

## Diseño: fotos, perfil del negocio y cobertura real de entrega (post-Fase 8)

Cuatro cambios pedidos juntos porque todos tocan "qué tan real/creíble se
siente el marketplace": fotos de verdad (no URLs pegadas a mano), el negocio
controlando su propia imagen pública, y que la cobertura de entrega deje de
ser un número fijo y pase a depender de zonas reales por negocio.

**Subida de fotos — almacenamiento local, no un servicio de nube.** No hay
credenciales de ningún proveedor de storage (S3, Cloudinary, etc.)
disponibles para el MVP, así que `POST /api/uploads` guarda el archivo
directo en `apps/web/public/uploads/<uuid>.<ext>` (`node:fs/promises`,
`mkdir` + `writeFile`) y devuelve `{ url: "/uploads/<uuid>.<ext>" }`. Next
sirve rutas locales bajo `/uploads/*` sin configuración extra — a diferencia
de imágenes remotas, no hace falta `remotePatterns`. Válido para 3 tipos
(`jpeg/png/webp`) y hasta 5 MB; requiere sesión iniciada. La carpeta está en
`.gitignore` (solo se versiona `.gitkeep`) porque son archivos subidos por
usuarios, no parte del código. **Limitación conocida:** al ser disco local,
esto no sobrevive a un deploy multi-instancia o efímero (ej. Vercel) — el
día que haya un proveedor de storage real, solo cambia la implementación de
`POST /api/uploads`, no los componentes que lo consumen (`ImageUploadField`
ya habla en términos de "subí un archivo, recibís una URL").
`ImageUploadField` (`components/ui/image-upload-field.tsx`) es el componente
compartido que reemplazó los inputs de texto con URL tanto en el formulario
de producto (`negocio/productos/nuevo` y `editar`) como en el perfil del
negocio.

**El negocio ahora controla su propia página pública.** Antes el
banner/logo/teléfono de un negocio solo se podían fijar por seed o admin —
no había forma de que el dueño los cambiara. `/negocio/perfil` (nuevo ítem
en el sidebar) deja editar banner, logo, descripción, teléfono, WhatsApp,
dirección y redes sociales (`GET/PATCH /api/negocio/perfil`,
`business-settings-service.ts`). Se agregó `Business.phone` (distinto de
`whatsapp`, que ya existía) porque un cliente puede querer llamar sin pasar
por WhatsApp — se muestra como botón `tel:+503...` en `/negocios/[slug]`
junto al de WhatsApp.

**Distritos de San Salvador — la cobertura por municipio era demasiado
gruesa.** El municipio "San Salvador" original mezclaba zonas muy distintas
de la capital; un negocio en la zona norte no necesariamente llega a la sur.
El seed ahora agrega `San Salvador Centro/Norte/Sur/Este/Oeste` como
municipios propios (mismo departamento, además del "San Salvador" genérico
que se mantiene) — aparecen como opciones separadas en cualquier selector de
municipio (checkout, zonas de entrega del negocio, registro). Es un cambio
de datos (seed), no de esquema: `Municipality` ya soportaba esto.

**Cobertura de entrega real — sin zona configurada, no hay fee por
defecto.** Antes, si un negocio no tenía una `DeliveryZone` para el
municipio del comprador, igual se cobraba un delivery fee fijo (`$3.50`) —
es decir, se fingía que todos los negocios entregaban a todas partes.
Ahora `createOrder` (`order-service.ts`) rechaza el pedido con
`409 NO_DELIVERY_COVERAGE` si algún negocio del carrito no tiene una zona
activa para ese municipio — la cobertura es responsabilidad de cada negocio
("eso queda a disponibilidad de la tienda"), no un valor por defecto del
sistema. En el checkout, un `useEffect` consulta
`POST /api/delivery/coverage` cada vez que cambia el municipio o los
negocios del carrito y muestra, por negocio, si cubre la zona (con fee y
tiempo estimado) o no — el botón de confirmar pedido queda deshabilitado
mientras haya algún negocio sin cobertura, y el chequeo del servidor en
`createOrder` es la validación real (el del frontend es solo UX, no se
puede saltear).

**"Solicitud al admin" cuando no hay cobertura.** Si un negocio no cubre la
zona del comprador, en vez de solo bloquear se ofrece "Solicitar
cobertura" — crea un `CoverageRequest` (`POST /api/delivery/coverage-requests`)
con el negocio, municipio y datos de contacto del comprador. El admin los
ve en `/admin/cobertura` (nuevo ítem del sidebar, con contador en el
resumen) y puede marcarlos `RESOLVED` o `DISMISSED`. Es una señal de
demanda para que el negocio decida si le conviene abrir una zona ahí — no
crea cobertura automáticamente, ni promete nada al comprador.

## Diseño: paneles como app separada (post-Fase 6, rediseño)

`/negocio` y `/admin` dejaron de ser páginas más del sitio con pestañas
arriba — ahora son su propia "app" con sidebar fijo, sin el header/footer
de marketing (pedido explícito: que se sientan "pro", como Stripe/Vercel).

- **Dos layouts raíz**, vía route groups de Next.js: `app/(site)/layout.tsx`
  (Header + Footer + BottomNav, todo el sitio público) y
  `app/(dashboard)/layout.tsx` (fondo neutro, sin chrome de marketing). Cada
  uno declara su propio `<html>/<body>` — Next.js permite esto siempre que
  cada ruta caiga bajo un único grupo. Las fuentes (`next/font/google`) se
  extrajeron a `lib/fonts.ts` para no duplicar la carga entre ambos. Los
  paths de todas las páginas (`/negocio`, `/regalos`, etc.) no cambiaron —
  los route groups son invisibles en la URL.
- **`DashboardShell`** (`components/dashboard/`) es el sidebar compartido
  entre negocio y admin: en escritorio fijo a la izquierda, en móvil colapsa
  a un `Sheet`. Reutiliza el mismo `UserMenu` del sitio.
- **Gotcha real que volvió a pasar**: armar `NAV_ITEMS` en el layout
  (Server Component) con `icon: LayoutDashboard` (el componente, sin
  renderizar) y pasarlo a `DashboardShell` (Client Component) rompe en
  producción — "Functions cannot be passed directly to Client Components".
  Es el mismo gotcha de RSC ya documentado más abajo; la solución fue
  pasar `icon: <LayoutDashboard className="size-4" />` ya renderizado.
- **Listas → tablas**: Negocios y Usuarios (admin) y Productos (negocio)
  pasaron de tarjetas apiladas a `<table>` reales vía `DataTable`
  (`components/dashboard/data-table.tsx`) — es el formato esperado para
  "escanear" muchas filas. Pedidos, Reportes y Reseñas se mantienen como
  tarjetas a propósito: tienen demasiado contenido por ítem (dirección,
  personalización, motivo, comentario) para que una fila de tabla se lea
  bien.

## Diseño: IA de recomendaciones (Fase 7)

`packages/ai` (`AIService`) ya estaba completamente construido desde la
Fase 1 — solo faltaba una página real que lo usara. `/ayudame-a-elegir`
conecta ese paquete a la web:

- **La IA nunca inventa productos.** `AIService.analyzeUserRequest` solo
  extrae intención (destinatario, ocasión, presupuesto, gustos,
  personalidad) del texto libre — ni con Claude ni con el fallback
  heurístico devuelve productos. `scoreProductsForIntent` (en
  `packages/ai/src/scoring.ts`) es el único lugar que consulta Postgres y
  arma las 3 recomendaciones, con la explicación de cada una generada a
  partir de por qué matcheó (presupuesto, gustos, ocasión, disponibilidad,
  rating) — nunca texto libre de la IA.
- **Sin `ANTHROPIC_API_KEY` funciona igual** (sección 33): `AIService` cae
  a `parseIntentHeuristically` (reglas + keywords) sin que el usuario note
  la diferencia — la respuesta tiene la misma forma en ambos casos. Así es
  como está configurado hoy (`.env` trae la key vacía); agregarla más
  adelante no requiere tocar la página ni la API route.
- **Personalización responsable** (sección 25): si hay sesión, se llama
  `personalizeRecommendations` para sesgar el *scoring* con categorías de
  compras/favoritos previos — pero la explicación mostrada al usuario y el
  `parsedIntent` que se guarda siguen reflejando solo lo que la persona
  escribió, nunca lo inferido de su historial (evita explicaciones
  confusas tipo "combina algo que nunca mencionaste").
- Cada búsqueda se guarda en `AIRecommendation` +
  `AIRecommendationProduct` (`requestText`, `parsedIntent`, y qué
  productos se mostraron con qué explicación) — la razón original de este
  modelo en el schema de la Fase 1.
- El buscador del hero (`/` → `/ayudame-a-elegir?q=...`) auto-envía la
  búsqueda al cargar la página.

## Diseño: cuenta de usuario y alta de negocios (post-Fase 6)

- **`/perfil`**: el usuario edita nombre y teléfono, y puede cambiar su
  contraseña (pide la actual, la verifica con `bcrypt.compare` antes de
  aceptar la nueva). El correo se muestra de solo lectura — cambiarlo
  afecta el login, así que por ahora se pide que escriban a Ayuda.
- **`/registro-negocio`**: primer flujo real de alta de negocio (antes solo
  existía el schema de validación, sin página ni ruta). Crea el `User`
  (rol `BUSINESS`), el `Business` en `PENDING` y el `BusinessUser` (OWNER)
  en una sola transacción, y loguea al dueño de inmediato — entra a
  `/negocio` y ve el aviso "pendiente de aprobación" que ya existía desde
  la Fase 5, hasta que un admin lo aprueba desde `/admin/negocios`
  (Fase 6). Cierra el gap que había quedado pendiente ahí.
- **Menú de usuario rediseñado**: el trigger pasa de ser solo un avatar a
  mostrar avatar + nombre + chevron, y el dropdown ahora lista Inicio, Mis
  pedidos, Mi perfil, el panel según el rol (o "Sumá tu negocio" para
  `USER`), y Ayuda — antes solo tenía pedidos, panel y cerrar sesión.
  "Ayuda" también se agregó a la navegación del header, visible sin
  necesidad de iniciar sesión.

## Diseño: reseñas, reportes y ayuda (post-Fase 6)

Cierra el loop que había quedado documentado como pendiente en la Fase 6:
ahora sí hay un flujo real para generar reseñas y reportes, no solo para
moderarlos.

- **Reseñas**: solo se puede reseñar un producto/negocio de un pedido
  propio con al menos un `OrderItem` en estado `DELIVERED` (sección 26 del
  spec) — `review-service.ts` lo valida server-side, no solo en la UI. El
  prompt aparece en `/pedidos/[orderNumber]` para cada ítem entregado sin
  reseña todavía. Toda reseña nace `PENDING`; recién se ve públicamente (y
  cuenta para el rating) cuando un admin la aprueba (Fase 6).
- **`ratingAvg`/`ratingCount` ahora son reales, no simulados.** El seed les
  ponía un número aleatorio a modo de placeholder visual. En cuanto se
  aprueba la primera reseña real de un producto o negocio, ese número se
  reemplaza por el promedio calculado de reseñas `APPROVED` de verdad — es
  intencional que el conteo "baje" al principio: es más honesto mostrar 1
  reseña real que 41 simuladas.
- **Reportes**: botón "Reportar" en producto, negocio y cada reseña
  publicada, para los 4 `targetType` que ya soporta el modelo (`PRODUCT`,
  `BUSINESS`, `REVIEW`, `USER`). Cualquier usuario logueado puede reportar;
  el objetivo se valida server-side antes de crear el reporte.
- **`/ayuda`**: FAQ estática agrupada por tema (pedidos, pagos, reseñas,
  negocios) — las respuestas reflejan el estado real del producto (ej. dice
  explícitamente que solo se acepta efectivo, y que el alta de negocios
  todavía es manual) en vez de prometer funciones que no existen.

## Diseño: panel administrativo (Fase 6)

`/admin` es el dashboard para el rol `ADMIN`: resumen de la plataforma
(usuarios, negocios por estado, pedidos, ventas totales, reportes/reseñas
pendientes), moderación de negocios (aprobar/rechazar/suspender/verificar),
gestión de usuarios (cambiar rol, suspender — usa el mismo campo
`deletedAt` que ya revisa el login, así que suspender bloquea el acceso de
verdad), CRUD de categorías, y moderación de reportes y reseñas.

**Reportes y reseñas parten vacíos a propósito.** Todavía no existe en la
app ningún flujo para que un usuario reporte contenido o deje una reseña
(no está asignado a una fase específica en el plan original) — el panel de
moderación ya está construido y funcional sobre las tablas `Report` y
`Review` reales, listo para cuando ese flujo se agregue, en vez de
construirlo después como un cambio grande. Aprobar/rechazar una reseña
recalcula el `ratingAvg`/`ratingCount` del producto y del negocio desde las
reseñas `APPROVED`, nunca con un promedio incremental.

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
