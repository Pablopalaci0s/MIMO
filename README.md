# MIMO

**Decime qué querés transmitir y nosotros encontramos el detalle.**

MIMO es un marketplace salvadoreño de flores, regalos, detalles y experiencias.
Centraliza lo que hoy los negocios manejan por Instagram/WhatsApp: catálogo,
disponibilidad, precios, entrega y pago, todo en un solo lugar — con un
asistente de IA que ayuda a elegir el regalo correcto.

El proyecto se construyó por fases (ver **Estado del proyecto** más abajo) y
las 11 planeadas ya están completas: arquitectura del monorepo, base de
datos y autenticación (Fase 1), home y navegación (Fase 2), catálogo de
productos y negocios (Fase 3), carrito/checkout/pedidos (Fase 4), panel de
negocio (Fase 5), panel administrativo (Fase 6), el asistente de IA
"Ayúdame a elegir" (Fase 7), el asistente de dedicatorias (Fase 8),
favoritos/fechas importantes/notificaciones (Fase 9), PWA/optimización
móvil (Fase 10), y testing/revisión completa (Fase 11).

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
npm run test               # tests unitarios (validación + lógica de negocio pura)
```

**Sobre `clean:cache`:** Turborepo (`.turbo/cache`) y Turbopack (`apps/web/.next`)
guardan caché de cada `dev`/`build`/`lint` para acelerar la siguiente corrida,
pero nunca la borran solas — en una sesión de desarrollo larga esto puede
crecer a varios GB sin que se note (nos pasó: ~16 GB acumulados). Correr
`npm run clean:cache` de vez en cuando es seguro — no borra código ni datos,
solo hace que la próxima `dev`/`build` tarde un poco más en arrancar mientras
reconstruye la caché. Un efecto secundario: borra también los tipos de rutas
que Next genera en `apps/web/.next/types` (el `PageProps<...>` que usan las
páginas dinámicas) — si corrés `npm run typecheck` justo después de limpiar,
sin haber levantado `dev`/`build` primero, va a fallar con "Cannot find name
'PageProps'". Arreglo: `npx next typegen` dentro de `apps/web` (no hace falta
un build completo), o simplemente correr `dev`/`build` una vez antes.

## Estado del proyecto — orden de desarrollo

- [x] **Fase 1** — Arquitectura, base de datos, autenticación
- [x] **Fase 2** — Home, diseño, navegación
- [x] **Fase 3** — Productos, categorías, negocios
- [x] **Fase 4** — Carrito, checkout, pedidos
- [x] **Fase 5** — Panel de negocio
- [x] **Fase 6** — Panel administrativo
- [x] **Fase 7** — IA de recomendaciones
- [x] **Fase 8** — IA para dedicatorias
- [x] **Fase 9** — Fechas importantes, favoritos, notificaciones
- [x] **Fase 10** — PWA y optimización móvil
- [x] **Fase 11** — Testing y revisión completa

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

**Pago: en esta fase, solo efectivo contra entrega.** El checkout de esta
fase ofrece **pago contra entrega (efectivo)**. Tarjeta se muestra en la UI
como "Próximamente". El modelo `Payment` (`status`:
`PENDING/PAID/FAILED/REFUNDED/PARTIALLY_REFUNDED`) y el flujo de
confirmación del negocio (Fase 5) quedaron pensados desde acá para que
integrar un proveedor real después fuera un cambio localizado — ver
"Diseño: pagos con PayPal" (post-Fase 11) para cómo se resolvió finalmente
el "no cobrar si el negocio no confirma".

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

## Diseño: favoritos, fechas importantes y notificaciones (Fase 9)

Los modelos (`Favorite`, `ImportantDate`, `Notification`, `PushToken`) ya
estaban en el schema desde la Fase 1 — mismo patrón que la IA de las Fases
7/8: faltaba conectarlos a servicios/API/UI, no diseñarlos de cero.

**Favoritos.** `FavoritesProvider` (`lib/favorites/favorites-context.tsx`)
cachea en memoria del cliente los ids favoritos de la sesión actual — a
diferencia del carrito (que vive enteramente en `localStorage` porque no
requiere login), los favoritos son del usuario en el servidor, así que el
provider solo evita que cada corazón de cada card tenga que pedir su propio
estado (N+1 en listas de catálogo). El toggle (`POST /api/favoritos`) es
optimista: cambia el ícono al toque y revierte si el request falla. Un
visitante sin sesión que toca el corazón va a `/iniciar-sesion` en vez de
fallar en silencio.

**Fechas importantes.** CRUD simple en `/perfil/fechas-importantes`
(cumpleaños, aniversarios, etc. con `remindDaysBefore`). Lo interesante es
cómo se avisa: **no hay un cron real** detrás (sección 5 de las reglas del
usuario prohíbe fingir funcionalidad que no existe, y este proyecto no tiene
infraestructura de jobs programados todavía). En vez de simular un push a
medianoche, `checkImportantDateReminders` revisa las fechas del usuario de
forma perezosa cada vez que visita el home o abre notificaciones, y crea el
aviso (`Notification` con `metadata.importantDateId`) la primera vez que la
fecha entra en su ventana — con esa marca se evita reenviarlo. El home
también muestra un banner compacto ("Cumpleaños de mamá es en 3 días") que
linkea a "Ayúdame a elegir". Limitación conocida: es un recordatorio único
para la fecha guardada, no una recurrencia anual automática — habría que
reprogramar la fecha a mano el año que viene, o resolverlo en una fase
futura con un job real.

**Notificaciones.** Centro de notificaciones in-app (campana en el header de
escritorio + ítem en el menú de usuario para mobile, ambos abren un
`Sheet` con la lista y "marcar todas como leídas"; `/notificaciones` es la
versión de página completa). Todo pasa por `createNotification` en
`notification-service.ts` para que el modelo de datos sea consistente, y se
dispara desde eventos reales que ya existían:
- Cambio de estado de un `OrderItem` (`business-order-service.ts`) → avisa
  al comprador (`ORDER_CONFIRMED` → `ORDER_DELIVERED`/`CANCELLED`).
- Un negocio pasa a `APPROVED`/`SUSPENDED` (`admin-business-service.ts`) →
  avisa al dueño.
- Se recibe una reseña nueva (`review-service.ts`) → avisa al dueño del
  negocio reseñado.
- Fecha importante próxima (ver arriba).

No hay push real del navegador (Service Worker + `PushToken`) todavía —
eso es explícitamente Fase 10 (PWA); por ahora las notificaciones solo viven
dentro de la app mientras el usuario la tiene abierta.

## Diseño: PWA y optimización móvil (Fase 10)

**Instalable de verdad, no un ícono que promete algo que no hace.**
`app/manifest.ts` (la convención de Next.js — se sirve solo en
`/manifest.webmanifest`, no hace falta linkearlo a mano) define nombre,
`theme_color` (`#cf3452`, el mismo `--brand`), `display: "standalone"` e
íconos generados a mano en `public/icons/` (192/512 normales + un 512
`maskable` con más padding, porque Android recorta esa versión a un
círculo/squircle — si no le dejás margen, el contenido queda cortado). El
botón "Instalar MIMO" (`components/pwa/install-prompt.tsx`) solo aparece
cuando el navegador realmente dispara `beforeinstallprompt` — en iOS/Safari
ese evento no existe, así que ahí simplemente no se muestra nada en vez de
un botón que fallaría (sección 5: no fingir funcionalidad que no existe).

**Service worker con alcance chico a propósito.** `public/sw.js` cachea el
shell estático (JS/CSS con hash de Next, ícono, manifest) y usa
network-first para navegación con un fallback a `/offline` cuando no hay
red. **No** intenta que el catálogo/checkout funcionen offline — sería
fingir que un marketplace con inventario y pagos reales funciona sin
conexión al servidor, que es exactamente lo que la sección 5 de las reglas
del usuario prohíbe. `/offline` vive en su propio route group `(offline)`
con su propio root layout, sin `Header`/`Footer` ni `Providers` — esa
página se sirve desde el cache del service worker cuando no hay red, así
que no puede depender de nada que necesite llegar al servidor (`auth()`,
sesión, etc.) o el fallback offline se rompería justo cuando más se
necesita. El service worker solo se registra en producción
(`NODE_ENV === "production"`) — en `next dev` cachear agresivamente pelea
con el hot reload y termina sirviendo JS viejo. Para probarlo en local:
`npm run build && npm --prefix apps/web start` (el `dev` normal no lo
activa).

**Gotcha real de Next.js 16 encontrado acá:** `appleWebApp.capable: true`
ya renderiza el meta `mobile-web-app-capable` (sin el viejo prefijo
`apple-`) — antes hacía falta agregar ambos a mano. Agregarlo de nuevo
duplicaba el tag; se verificó inspeccionando el HTML servido, no asumiendo
por la documentación (ver el aviso de `apps/web/AGENTS.md` sobre que esta
versión de Next puede diferir de lo que un modelo entrenado "ya sabe").

**Optimización móvil**: `viewport-fit: cover` + `env(safe-area-inset-bottom)`
en la tab bar (para los celulares con isla/notch), `formatDetection`
desactivado (si no, iOS convierte números de pedido tipo `MIMO-2026...` en
links de teléfono por accidente), y `apple-mobile-web-app-status-bar-style:
black-translucent` para que la barra de estado no rompa el blanco del
header al abrir como app instalada.

## Diseño: testing y revisión completa (Fase 11)

**Qué cubren los tests automáticos (`npm run test`, Vitest) y qué no —
para no reclamar más de lo que hay.** El foco es la lógica de negocio pura:
- `packages/validation`: los ~90 tests cubren cada schema de Zod usado por
  las rutas `/api/*` (formatos de teléfono/email/UUID, coerciones de
  string a número desde formularios, campos opcionales vs. requeridos,
  refinamientos cruzados como "una reseña necesita al menos una
  calificación"). Es la superficie más barata de romper sin darse cuenta
  (cambiar un `.optional()` por accidente) y la más barata de testear.
- `apps/web`: la lógica de negocio que antes vivía mezclada adentro de los
  `*-service.ts` (junto a las llamadas a Prisma) se separó a módulos puros
  testeables sin base de datos — `order-status-logic.ts` (qué transiciones
  de estado de pedido son válidas, cómo se calcula el estado agregado de un
  pedido multi-negocio), `delivery-coverage-logic.ts` (qué zona de entrega
  le corresponde a cada negocio) y `date-utils.ts` (comparación de fechas
  en UTC, el gotcha de zona horaria documentado en CLAUDE.md). Los
  `*-service.ts` ahora son más delgados: arman los datos desde Prisma y
  delegan la decisión a estas funciones puras.
- **Lo que NO está cubierto por tests automáticos**: nada que dependa de
  Postgres (las funciones `async` de cada `*-service.ts` siguen
  verificándose a mano en el navegador, como en cada fase anterior — armar
  una base de datos de test con setup/teardown es una inversión que no se
  justificaba para el alcance de este proyecto) ni componentes de React.
  Ver la sección 5 de las reglas del usuario: mejor ser honesto sobre el
  alcance que reclamar "cobertura completa".

**Un bug real que encontró este ejercicio.** Al escribir los tests de
`delivery-coverage-logic.ts` quedó en evidencia que la zona "cualquier
municipio" (`DeliveryZone.municipalityId: null`, pensada para que un
negocio diga "entrego a todos lados") **nunca había funcionado**: tanto
`checkDeliveryCoverage` como `order-service.createOrder` filtraban las
zonas con `municipalityId: <uuid del cliente>`, un filtro que en SQL nunca
matchea filas con `municipality_id IS NULL`. Cualquier negocio que
configurara esa opción seguía viendo "sin cobertura" para todo el mundo.
Se arregló unificando ambos lugares en una sola función
(`resolveDeliveryCoverage`) que trae también las zonas genéricas
(`OR: [{ municipalityId }, { municipalityId: null }]`) y prioriza la zona
específica del municipio sobre la genérica cuando hay las dos — verificado
en vivo creando una zona "cualquier municipio" y confirmando que ahora sí
cubre un municipio sin zona propia, con la fee correcta.

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

## Diseño: preparación para producción (post-Fase 11)

Las 11 fases del roadmap cubren el producto; esto cubre lo que hace falta
para exponerlo de verdad en internet — pedido explícito del usuario después
de preguntar "¿ya puede salir a producción?" y recibir un no honesto con
la lista de lo que faltaba. **Sigue sin ser suficiente por sí solo** — ver
"Qué falta para lanzar de verdad" más abajo (pago con tarjeta, storage de
fotos, secrets de producción, limpiar datos de demo).

**Recuperar contraseña y verificar correo.** Antes no existía ninguna de
las dos — un usuario que se olvidaba la contraseña no tenía salida. Ahora
hay un modelo `AuthToken` propio (no se reusó `VerificationToken`, la tabla
del adapter de Auth.js, porque hoy no hay un provider de Email configurado
y mezclar responsabilidades iba a doler después) que guarda el **hash**
del token, nunca el valor — igual que las contraseñas. El envío de correos
va por Resend (`lib/services/email-service.ts`) con el mismo patrón que
`AIService` en `packages/ai`: sin `RESEND_API_KEY`, en vez de fallar o
fingir que se mandó un correo, se loguea el link a consola — así todo el
flujo (pedir reset, confirmar correo) se puede probar en desarrollo sin
cuenta en Resend. La verificación de correo es informativa (un banner en
"Mi perfil" con botón de reenviar), **no bloquea el login** — agregar un
gate duro hubiera sido un cambio de alcance mayor y más riesgoso que lo
que pedía el problema real (recuperar acceso a la cuenta).

**Rate limiting en memoria.** `lib/rate-limit.ts` (lógica pura, testeada)
+ `lib/rate-limit-response.ts` (el wrapper que arma la respuesta 429) —
separados en dos archivos a propósito: el wrapper necesita `apiError`, que
arrastra `@mimo/auth` → `next-auth`, y eso rompía los tests si vivía en el
mismo archivo que la lógica pura. Protege registro, registro de negocio,
login, reportes, solicitudes de cobertura, y pedir/usar reset de
contraseña. **Limitación real, no un secreto**: es un `Map` en memoria del
proceso — funciona bien en una sola instancia (que de todos modos es un
requisito hoy por las fotos en disco local) pero cada instancia adicional
tendría su propio contador. Si en algún momento hay más de un servidor
corriendo, esto necesita moverse a Redis o similar.

**Sentry + logging estructurado.** `instrumentation.ts` /
`instrumentation-client.ts` (los hooks nativos de Next.js — no hace falta
el wizard interactivo de Sentry, que no se puede correr en este entorno)
inicializan Sentry solo si `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` están
configuradas; sin cuenta en sentry.io, `Sentry.init()` nunca se llama y el
resto del código (`Sentry.captureException`, etc.) no hace nada — no
truena, simplemente no manda nada. `lib/logger.ts` loguea JSON estructurado
(`level`, `timestamp`, contexto) en vez de `console.log` suelto, para que
un servicio de logs real pueda filtrar por campo. `apiErrorFromException`
(el manejador central de errores de cada ruta `/api/*`) es el único punto
que manda a Sentry y loguea estructurado — los errores de dominio
esperables (`AppError`, Zod, auth) no cuentan como bug y no se mandan.

**Páginas legales.** `/terminos` y `/privacidad`, linkeadas desde el
footer y desde los formularios de registro (usuario y negocio). **Importante:
son un punto de partida razonable, no asesoría legal** — cubren los temas
esperables de un marketplace (qué es MIMO, pago contra entrega, cobertura
de entrega, moderación, límite de responsabilidad, qué datos se recolectan
y para qué) pero deberían pasar por alguien con matrícula antes de
depender de ellas para algo serio.

**CI en GitHub Actions.** `.github/workflows/ci.yml` corre typecheck, lint,
tests y build en cada push/PR a `main` — sin Postgres real: como casi todas
las rutas son dinámicas (no estáticas), ninguno de estos pasos necesita una
base de datos corriendo, solo que `DATABASE_URL` exista como variable para
que `PrismaClient` no explote al construirse (se usa un valor dummy en el
workflow). Es CI (verificación), no CD — no hay un paso de deploy porque
todavía no hay un hosting elegido, y las fotos en disco local (ver
"Almacenamiento de imágenes") condicionan esa elección: hay que resolverla
antes de automatizar un deploy, no al revés.

### Qué falta para lanzar de verdad

Esto resuelve monitoreo, spam, recuperación de cuenta y CI — pero **no** los
bloqueantes de infraestructura que ya estaban identificados y siguen
pendientes:
- **Pago con tarjeta** no existe — solo efectivo contra entrega.
- **Fotos en disco local** — no sobreviven un deploy en hosting efímero
  (Vercel, etc.); necesitan un storage real (S3, Cloudinary) antes de
  desplegar ahí.
- **Secrets y base de datos de producción** — hoy todo corre con valores
  de desarrollo.
- **Datos de demo** (`admin@mimo.sv` con contraseña conocida, negocios
  `isDemo`) no pueden quedar en un ambiente real.

## Diseño: login con Google y Facebook (post-Fase 11)

Pedido explícito del usuario. `packages/auth/src/oauth.ts` es la única
fuente de verdad de qué proveedores están realmente configurados
(`Boolean(CLIENT_ID && CLIENT_SECRET)`) — tanto `config.ts` (para registrar
o no el provider en Auth.js) como las páginas de login/registro (para
mostrar o no el botón) la importan, así nunca se muestra un botón que no
vaya a funcionar (regla 5). Sin las claves en `.env`, la UI se ve exacto
igual que antes — verificado en el navegador.

**Vinculación de cuentas por correo.** `allowDangerousEmailAccountLinking:
true` en ambos providers: si alguien se registró con contraseña y después
entra con Google/Facebook usando el mismo correo, se linkea a la cuenta
existente en vez de tirar "OAuthAccountNotLinked". Es "peligroso" en el
sentido de que confía en que el proveedor verificó el correo — aceptable
acá porque tanto Google como Facebook lo verifican.

**Cuentas suspendidas.** El login por contraseña ya rechazaba cuentas
suspendidas (`deletedAt`) en `authorize()`, pero ese callback no corre en
el flujo OAuth — se agregó el callback `signIn()` en `config.ts` para
cubrir ese hueco: una cuenta suspendida no puede volver a entrar ni con
Google ni con Facebook. Combina con el fix de sesión activa (revalidación
en `jwt()`, ver commit anterior) para que "suspender" bloquee los tres
caminos: login nuevo por contraseña, login nuevo por OAuth, y sesión ya
abierta.

**Proveedores sin correo verificado.** Facebook en particular puede no
devolver `email` en el perfil aunque el usuario haya aceptado el permiso —
pasa cuando el correo de la cuenta no está confirmado como principal (caso
real, encontrado probando con una cuenta de Facebook real). Como `email`
es obligatorio en el modelo `User`, dejar pasar ese login rompía más abajo
en el adapter con un error críptico de Prisma. El callback `signIn()` en
`config.ts` corta ese caso antes, con un mensaje claro en vez de un
"Access Denied" genérico.

**Lo que solo el usuario puede hacer** (no es algo que se pueda automatizar
sin acceso a sus cuentas): crear un proyecto en Google Cloud Console y una
app en Facebook for Developers, configurar el redirect URI de cada uno
(`{NEXTAUTH_URL}/api/auth/callback/google` y `.../facebook`), y poner
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`FACEBOOK_CLIENT_ID`/
`FACEBOOK_CLIENT_SECRET` en `.env` — instrucciones cortas dejadas ahí mismo
en `.env.example`.

## Diseño: home más vivo (post-Fase 11)

Pedido del usuario mostrando una app de delivery (PedidosYa) como referencia
de "se ve más viva". Se aclaró de entrada que no se copia ese estilo tal
cual — sigue valiendo la regla 4 (blanco/negro/gris + el rosado-rojo con
moderación, nada de fondos de colores sólidos) — sino que se buscó más vida
dentro de esa paleta.

**El hallazgo real: las fotos, no el layout.** El catálogo de demo usaba
`placehold.co` — cajas grises con el nombre del producto escrito encima —
en vez de fotos. Ningún ajuste de CSS iba a hacer sentir "vivo" un catálogo
de cajas grises. Se reemplazó por fotos de stock reales (licencia Unsplash,
uso libre) elegidas por categoría — 2 por categoría, 24 en total, cada
`photo-<id>` verificado a mano (200 OK) antes de sumarlo — y elegidas de
forma determinística según el nombre del producto en
`packages/database/prisma/seed.ts` (`CATEGORY_STOCK_PHOTOS`). Esto es
**solo para datos de demo**: un negocio real sigue subiendo sus propias
fotos con `image-upload-field.tsx`, como siempre.

**Ajustes de UI**, todos dentro de la paleta existente:
- Hero: título más grande y audaz, blob de fondo más presente, y el
  placeholder del buscador ahora rota entre ejemplos (`hero.tsx`) — antes
  era estático.
- Cards de negocios destacados: el rating se movió a superpuesto sobre la
  foto (con degradado para legibilidad), igual que ya hacían las cards de
  producto — más consistente y con más presencia visual.
- Íconos de categoría: círculo más grande, sombra sutil, hover con resorte
  (`motion`) en vez de una transición CSS plana.

## Diseño: banners promocionales (post-Fase 11)

El admin ahora puede subir banners/publicidad desde `/admin/banners` (modelo
`Banner` nuevo en el schema, migración `20260911035142_add_banners`) — sube
la foto con el mismo `image-upload-field.tsx` que ya usaban productos y
perfil de negocio, le pone un título, opcionalmente un link (ruta interna
como `/regalos?categoria=flores` o una URL externa completa), un orden, y
un switch de activo/oculto. Solo los banners `isActive` se muestran en el
home (`PromoBanners`, entre los filtros rápidos y las categorías
emocionales) — se agregan/sacan sin redeploy.

**Por qué no reutilizar `Category` o algo existente**: un banner no es un
concepto de catálogo (no tiene slug, no cuelga de productos) y su ciclo de
vida es distinto — se crea y se borra libremente sin las validaciones de
"no eliminar si tiene productos asignados" que sí aplican a categorías. Se
modeló aparte a propósito, seguido el mismo patrón CRUD de
`admin-category-service.ts`/`category-manager.tsx` para no inventar uno
nuevo.

## Diseño: aviso de cookies e IA (post-Fase 11)

Pedido explícito del usuario: un mensaje visible avisando el uso de cookies
de sesión e inteligencia artificial. `components/layout/cookie-ai-notice.tsx`
es un aviso informativo (no un gestor de consentimiento granular con
"aceptar"/"rechazar" por categoría) porque MIMO solo usa **una** cookie
—la de sesión, necesaria, no de rastreo ni publicidad— así que no hay nada
que el usuario deba poder desactivar por separado; el botón es "Entendido",
no "Aceptar cookies". Se recuerda en `localStorage`, no en una cookie, para
no depender de lo mismo que el aviso anuncia.

La política de privacidad (`/privacidad`) ganó dos secciones nuevas —
"Cookies" e "Inteligencia artificial"— que explican en más detalle qué le
llega a Claude (el texto que escribís en ese momento, no tu cuenta ni tu
historial) y que sin `ANTHROPIC_API_KEY` esas funciones siguen andando con
reglas internas en vez de IA, igual que ya se documentaba en el resto del
proyecto sobre `AIService`.

## Diseño: búsqueda, filtros de admin y distritos (post-Fase 11)

Tres pedidos del usuario juntos porque salieron en el mismo mensaje, no
porque estén relacionados entre sí:

**Buscador en el catálogo.** El backend (`product-service.ts`) ya soportaba
búsqueda de texto (`query`, con `contains` insensible a mayúsculas sobre
nombre y descripción) desde que existe `/regalos` — el filtro `q` ya se
parseaba y se pasaba a `listProducts`. Lo que faltaba era el input: se
agregó a `catalog-filters.tsx`, con debounce de 400ms para no navegar en
cada tecla.

**Filtros en el admin.** `/admin/usuarios` y `/admin/negocios` mostraban
una tabla plana sin forma de buscar nada. Se agregó `listAdminUsers`/
`listAdminBusinesses` con filtros (`q`, rol, suspendido/estado) armados
como `where` de Prisma, y componentes `user-filters.tsx`/
`business-filters.tsx` que leen/escriben query params — mismo patrón que
`catalog-filters.tsx`, nada nuevo bajo el capó.

**Bug real encontrado (y arreglado) en el camino**: crear un banner tiraba
"URL de imagen inválida" aunque se hubiera subido una foto, porque
`adminBannerInputSchema.imageUrl` exigía `z.string().url()` (URL absoluta)
pero `/api/uploads` devuelve una ruta local (`/uploads/xyz.png`).
`packages/validation/src/business.ts` ya tenía el fix correcto para este
mismo problema (`imageUrlSchema`, que acepta ambas formas) resuelto para
productos — solo hacía falta exportarlo y reusarlo en vez de reinventar la
validación de imagen en `admin.ts`.

**Distritos.** El usuario pegó la lista oficial completa de los 14
departamentos post-reforma territorial 2021 (44 municipios nuevos, cada
uno agrupando lo que antes eran varios municipios — ahora "distritos").
Los datos de semilla anteriores solo detallaban unos pocos departamentos y
tenían errores reales (ej. Santa Tecla aparecía bajo el departamento de
San Salvador, cuando en realidad es La Libertad Sur). Se decidió
explícitamente **no** agregar un tercer nivel de jerarquía seleccionable
(Departamento → Municipio → Distrito): un negocio sigue eligiendo
cobertura a nivel de municipio nuevo, que es el nivel real de
administración territorial hoy. Los distritos se guardan como
`Municipality.districts` (`String[]`, migración
`20260911054300_add_municipality_districts`) y se muestran como texto
informativo bajo cada selector de municipio (`MunicipalityHint`, en el
alta de negocio y en zonas de entrega) — "San Salvador Centro — incluye
Ayutuxtepeque, Mejicanos, San Salvador, Cuscatancingo, Ciudad Delgado" —
para que alguien reconozca su pueblo/colonia sin que eso implique una
entidad nueva que seleccionar. `packages/database/prisma/seed.ts` quedó
con los 14 departamentos completos y correctos.

## Diseño: fechas importantes recurrentes y notificaciones push (post-Fase 11)

Dos deudas técnicas señaladas por el usuario, documentadas honestamente en
el README desde la Fase 9 como limitaciones conocidas — ahora resueltas.

**Fechas importantes que en verdad se repiten cada año.** El bug real:
`daysBetweenUtc` comparaba la fecha guardada completa (con año) contra
hoy — así que un cumpleaños cargado en 2019 daba `daysUntil` negativo para
siempre a partir de esa fecha en 2019, nunca volvía a avisar. Se agregó
`nextAnnualOccurrence` (`date-utils.ts`) que ignora el año guardado y
calcula la próxima ocurrencia de mes/día. Además, el chequeo de "ya
avisado" comparaba solo `importantDateId` — bloqueaba el aviso para
siempre después del primer año. Ahora `metadata.occurrenceYear` va junto
al id, así el aviso se repite cada año sin duplicarse dentro del mismo.

**El cron real que faltaba.** Antes el aviso solo se generaba de forma
perezosa cuando el usuario abría el home — si no entraba a MIMO en la
ventana de aviso, nunca se enteraba. Ahora existe
`/api/cron/fechas-importantes` (protegido con `CRON_SECRET`, sin esa
variable rechaza todo) que corre `checkAllImportantDateReminders` para
todos los usuarios, más un workflow de GitHub Actions
(`.github/workflows/cron-fechas-importantes.yml`) que lo llama una vez al
día. **No hace nada todavía**: hasta que el sitio esté desplegado, no hay
`APP_URL` real a la cual pegarle — hace falta configurar los secrets
`APP_URL` y `CRON_SECRET` en GitHub una vez elegido el hosting. El workflow
también se puede correr a mano desde la pestaña Actions
(`workflow_dispatch`) para probarlo.

**Notificaciones push reales.** Se agregó Web Push de verdad (paquete
`web-push`, claves VAPID) — no solo las notificaciones dentro de la app
que ya existían. Un modelo nuevo, `WebPushSubscription` (aparte de
`PushToken`, que ya existía pensado para tokens opacos de una futura app
nativa — una suscripción de navegador necesita `endpoint` + dos claves,
forma distinta). `createNotification` (el único punto de creación de
notificaciones del proyecto) ahora también manda un push — así que pedido
confirmado, reseña recibida, fecha importante, etc. llegan como push sin
tener que cablear cada tipo por separado. El toggle vive en "Mi perfil"
(`PushNotificationsToggle`) y, como todo lo demás sin su clave configurada,
ni se muestra sin `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`.

**Bug real encontrado mientras se armaba esto** (no estaba buscándolo):
Next.js/Turbopack solo inyecta `NEXT_PUBLIC_*` al bundle del cliente si las
encuentra en un `.env` dentro de `apps/web/` — este proyecto carga un único
`.env` en la raíz del monorepo (`next.config.ts` → `loadEnvConfig`,
compartido con Prisma a propósito). Confirmado inspeccionando el bundle
compilado: la variable llegaba como `undefined` en el navegador. Esto
también afecta a `NEXT_PUBLIC_SENTRY_DSN` — **el reporte de errores de
Sentry del lado del cliente nunca estuvo realmente activo**, a pesar de
estar "configurado". El server-side (API routes, `next.config.ts`) no
tiene este problema porque ahí `process.env` es un proceso de Node real.
Para la clave VAPID se esquivó sirviéndola por
`/api/push/vapid-public-key` en vez de depender del inlining (es una clave
pública por diseño, no hay problema en exponerla así). El problema de
Sentry sigue sin resolver — arreglarlo bien implica repensar cómo
`NEXT_PUBLIC_*` llega al cliente en todo el proyecto, alcance mayor al de
esta sesión.

**Aviso en vivo de pedido nuevo, sin recargar (`NewOrderWatcher`).** Pedido
del usuario: cuando entra un pedido, el negocio se tiene que enterar al
toque, con la pestaña abierta, sin F5. El push de arriba cubre "el negocio
no tiene MIMO abierto"; esto cubre "sí lo tiene abierto, en cualquier
página del panel" — son problemas distintos, un push no alcanza para el
segundo porque los navegadores no siempre lo muestran si la pestaña ya
está enfocada. `components/negocio/new-order-watcher.tsx` vive en el
layout de `/negocio` (todas las páginas, no solo Pedidos): sondea pedidos
pendientes cada 15s, y si aparece uno que no estaba en la vuelta anterior,
suena una alerta (dos tonos generados con Web Audio, sin archivo de audio
que empaquetar) y muestra un aviso flotante con link directo — más
`router.refresh()`, que sí actualiza los datos del Server Component actual
sin una recarga completa de la página. Probado en vivo: creé un pedido de
prueba directo en la base mientras tenía `/negocio/pedidos` abierto, y el
contador subió solo (4 → 5 → 6) con el pedido nuevo arriba de la lista.
**No es realtime de verdad** (WebSockets/SSE) — es polling simple a
propósito, no hay infraestructura de tiempo real en este proyecto y
agregarla solo para esto sería sobre-ingeniería; 15s es un compromiso
razonable entre "casi al instante" y no perforar el servidor a pedidos.

**Cómo probar que las notificaciones push realmente llegan.** El service
worker (que es lo que muestra un push cuando el navegador está cerrado o
en background) **solo se registra en producción** — `next dev` lo evita a
propósito (gotcha ya documentado, cachea agresivo y sirve JS viejo). Para
probarlo de verdad:
1. `npm run build && npm run start` (no `npm run dev`).
2. Entrar a "Mi perfil" → "Notificaciones push" → "Activar", y aceptar el
   permiso del navegador cuando lo pida (si ya lo habías bloqueado antes,
   el botón no aparece — hay que sacarlo desde la configuración del sitio
   en el navegador primero).
3. Windows también tiene su propio interruptor: Configuración → Sistema →
   Notificaciones → confirmar que Chrome/Edge puede mandar notificaciones.
4. Disparar una notificación real (pedir/entregar un pedido de prueba,
   dejar una reseña, o esperar a que una fecha importante entre en su
   ventana de aviso) y ver si aparece como notificación del sistema
   operativo, no dentro de la pestaña.

## Diseño: mensajes entre negocio y cliente por pedido (post-Fase 11)

Dos pedidos del usuario en el mismo mensaje:

**"Que le llegue notificación al cliente cuando el negocio cambia el
estado"** — esto ya existía desde la Fase 9
(`ORDER_STATUS_NOTIFICATION` en `business-order-service.ts`, dispara en
cada `updateBusinessOrderItemStatus`) y, desde que se agregó Web Push esta
misma sesión, ya sale como push real también, sin tocar nada — todo pasa
por `createNotification`. Se verificó, no se reconstruyó.

**"Que el negocio pueda pedir un dato o avisar que no encuentra la
casa"** — esto sí era nuevo. `OrderMessage` es una conversación por
pedido+negocio, no por línea de producto (`OrderItem`): un mismo pedido
puede tener varias líneas del mismo negocio (carrito multi-tienda) y es la
misma entrega, la misma conversación — separarla por ítem hubiera
fragmentado sin sentido un solo "no encuentro la casa" en N hilos
idénticos. Un mismo componente (`components/orders/order-messages.tsx`)
se usa en las dos puntas — la página de pedido del cliente
(`/pedidos/[orderNumber]`, agrupado por negocio) y la card de pedido del
negocio (`OrderItemCard`) — con `viewerRole` como única diferencia (alinea
los mensajes propios a la derecha). Cualquiera de los dos lados que
escribe dispara una notificación (con push) para el otro — reusa
`createNotification`, no es un sistema aparte. La ruta
`/api/orders/[orderNumber]/messages` sirve a los dos lados: la
autorización adentro del servicio decide si quien pregunta es el
comprador de ese pedido o parte de ese negocio, no hay separación por rol
a nivel de ruta.

Probado en vivo de punta a punta: negocio manda "no encontramos tu casa"
→ aparece del lado del cliente en `/pedidos/...` alineado a la izquierda,
con notificación creada correctamente → cliente responde con la
referencia → aparece del lado del negocio alineado a la derecha.

**No es un chat en tiempo real** (sin WebSockets/polling en esta
pantalla) — se recarga al abrir el hilo o al mandar un mensaje propio, no
sondea solo. Para el caso de uso (una aclaración puntual sobre una
entrega, no una conversación activa de ida y vuelta rápida) alcanza; si
en algún momento hace falta más inmediatez, el mismo patrón de
`NewOrderWatcher` (polling) se podría reusar acá.

## Diseño: pagos con PayPal (post-Fase 11)

Se investigó primero con Wompi (la pasarela de Bancoagrícola, la más usada
en El Salvador): su respuesta directa por correo confirmó que sus términos
no permiten cobrar y repartir plata entre negocios con giros distintos al
registrado — bloqueante para un marketplace multi-negocio como MIMO.
Bancoagrícola/Nequi son la misma entidad, así que no son una alternativa
independiente. Se evaluaron dLocal, Niu y Stripe: Stripe se descartó
directo (no se puede abrir cuenta de plataforma desde El Salvador, solo
Brasil/México en la región); dLocal y Niu quedaron anotados como
candidatos pendientes de confirmar (mismo tema: si su producto de
marketplace/split aplica para cuentas salvadoreñas). **PayPal fue la única
opción confirmada y disponible de inmediato**, con tarifas reales
verificadas desde la propia cuenta: 5.40% + $0.30 por cobro, y Payouts al
2% (tope $1) para repartir a cada negocio.

**Por qué no se usó el modelo "autorizar y capturar después" pensado en la
Fase 4.** PayPal sí soporta autorizar sin cobrar, pero varias capturas
parciales sobre una misma autorización (necesario para un carrito
multi-negocio) tiene reportes reales de fallas en su comunidad de
desarrolladores. En cambio, los reembolsos parciales sobre un cobro ya
hecho son una operación mucho más común y confiable. Por eso el modelo
final es: **se cobra el total completo al momento del checkout** (a la
cuenta de MIMO, no hay split automático en el cobro porque eso requiere
ser "Partner" de PayPal — un trámite de onboarding aparte que no se hizo);
si un negocio no confirma su parte dentro de la ventana (45 min), se le
reembolsa automáticamente esa parte específica al comprador. Para el
comprador el resultado es el mismo que "no cobrar si no confirma" — solo
cambia el mecanismo interno.

- **`Business.commissionRate`** (%, default 10) y **`Business.paypalEmail`**
  (a dónde se le manda su parte) son nuevos. La comisión se fija sola al
  aprobar un negocio (`updateAdminBusiness`): los primeros 10 negocios
  reales entran en una prueba a **0%**, del 11 en adelante entran a
  **10%** — pedido explícito del dueño del producto. El admin puede editar
  el % de cualquier negocio después (ej. para sacarlo de la prueba antes).
  Reactivar un negocio suspendido no le toca la comisión que ya tenía.
- **`PaymentSplit`** es el registro de cuánto de un `Payment` (que puede
  cubrir varios negocios del carrito) le toca a cada uno: su bruto, la
  comisión (con el % *congelado* al momento del pago, para que un cambio
  de tarifa después no reescriba pedidos viejos), el neto, y qué pasó
  (`PENDING → PAID_OUT` al confirmar y pagarle, o `→ REFUNDED` si no
  confirmó a tiempo; `PAYOUT_FAILED` si confirmó pero no se le pudo pagar
  — ej. no cargó su correo de PayPal).
- **`paypal-service.ts`** es el único lugar que le habla a la REST API de
  PayPal (OAuth de client credentials con el token cacheado en memoria,
  Orders v2 para cobrar, Payments v2 para reembolsar, Payouts v1 para
  pagarle a un negocio). `payment-split-service.ts` decide QUÉ hacer
  (repartir o reembolsar) sin saber nada de HTTP.
- El checkout de PayPal es un flujo de dos pasos, no un solo POST como
  CASH: `/api/payments/paypal/order` recalcula el total desde la base de
  datos y crea la orden en PayPal (todavía sin cobrar) para que el botón
  de PayPal la muestre; recién cuando el comprador aprueba, el `onApprove`
  del botón manda el checkout completo a `/api/orders` con el
  `paypalOrderId` ya aprobado, y ahí `createOrder` captura el cobro real
  ANTES de crear el pedido — si el cobro falla, nunca se crea un `Order`.
- **`/api/cron/expirar-pedidos`** (cada 15 min, mismo esquema de
  `CRON_SECRET` que el cron de fechas importantes) es el job que cumple la
  ventana de 45 min: cancela los `OrderItem` que siguen `PENDING` de un
  pedido pagado con PayPal y dispara el reembolso de esa parte. Como el
  carrito es multi-tienda, agrupa por negocio (no por ítem) para no
  reembolsar la misma parte dos veces si un negocio tiene más de un
  producto en el pedido.
- Sin `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` configuradas, el botón de
  PayPal del checkout muestra "no disponible" en vez de fingir que
  funciona (regla del proyecto) — se probó apagando las claves a propósito.
- **Pendiente, no bloqueante:** todavía no se probó contra credenciales
  sandbox reales de PayPal (no estaban disponibles al escribir esto) — la
  integración se armó contra la documentación oficial de la REST API v2/v1,
  pero falta la prueba end-to-end con una cuenta sandbox antes de
  considerarla verificada en vivo.

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
