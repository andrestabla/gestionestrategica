# 4Shine Empresas · Plataforma de gestión estratégica

Plataforma de gestión estratégica construida sobre la base de PGTD (Algoritmo T)
con el lenguaje y las definiciones del sistema 4Shine Empresas: el diagnóstico
como sistema de gestión, no como documento.

## Módulos

| Código | Módulo | Qué hace |
|---|---|---|
| M1 | Diagnóstico 4Shine-OD | Resumen (radar de capacidades, mapa de calor de 17 dimensiones, tres fuentes, señales), capacidades, dimensiones con sus 68 prácticas y evidencias, test de capacidad empresarial, brechas priorizadas con nivel de acompañamiento y captura del corte A3 |
| M2 | Benchmark | Posición de la empresa frente a las sociedades de su CIIU que reportan a Supersociedades: crecimiento, márgenes, ROA y endeudamiento en percentiles, cuadrante margen × crecimiento con pares comparables y mapa del sector por departamento |
| M3 | Estrategia | Cuadro de mando de cuatro perspectivas: objetivo → resultados clave (KPI) → dimensión que instala → iniciativa |
| M4 | Indicadores | KPI con ficha, serie, semáforo, proyección y reporte de valores |
| M5 | Ruta | Gantt por horizontes, matriz 4Shine capacidad (L) × impacto (D) y orden del portafolio con D·E·M·L, las mismas variables que se evalúan en M6 |
| M6 | Iniciativas | Avance, presupuesto, factores críticos, bitácora; cada iniciativa instala una dimensión con un framework. Matriz 4Shine de priorización: evaluación por roles (D·E·M·L, estratégico/táctico), consolidado del comité, decisión de tiempo con reglas y portafolio ordenado por horizonte |
| GP | Proyectos | Tareas con responsables, dependencias, evidencia, kanban, cronograma y carga |
| M7 | Inteligencia | El sector en cifras con datos reales de Supersociedades (tamaño, concentración, departamentos, actividades CIIU, diez mayores) y la puerta a los observatorios de Algoritmo T |
| — | Informe | Pieza imprimible para la junta |
| — | Metodología | El sistema 4Shine Empresas leído de las mismas fuentes que usa el motor |
| — | Administración | Usuarios, permisos, integraciones y branding |

## Multiempresa (tenants)

La plataforma atiende varias empresas con un mismo despliegue y cada una es
un contexto independiente: usuarios y roles, diagnóstico (captura, test,
Fuente 2, cortes publicados), portafolio (objetivos, KPI, iniciativas,
personas, tareas), priorización, archivos, branding e integraciones.

- **Admin de plataforma** (`admin@algoritmot.com`): no pertenece a ninguna
  empresa. Crea, edita, desactiva y elimina empresas (Administración →
  Empresas), crea cuentas en cada una y las reasigna. Opera la empresa
  activa que elige en el menú lateral.
- **Roles de empresa** (advisor, líder, responsable de capacidad, junta):
  valen solo dentro de su empresa; el login resuelve la empresa del usuario y
  la sesión la lleva. No se crean administradores dentro de una empresa.
- **Catálogo por empresa** (`src/data/catalogo.ts`): Andina Suministros es la
  plantilla demo. Una empresa nueva nace vacía (solo el mapa 4Shine) o
  copiando la plantilla (objetivos, KPI, iniciativas, personas y tareas de
  ejemplo); su catálogo vive en la base (`src/server/catalog-db.ts`).
- **Contexto de petición** (`src/server/tenant.ts`): cada ruta de la API corre
  dentro de `withTenant()` y el store resuelve el estado de la empresa activa;
  los enlaces públicos (`/p/<slug>-token`, `/e/<slug>-token`) resuelven la
  empresa por el slug firmado. En la interfaz, la vista de la empresa llega
  por `useCatalog()` (`src/components/catalog-context.tsx`, tipo `TenantView`
  en `src/lib/vista.ts`) y toda la lógica (`lib/logic`, `lib/proyectos`) la
  recibe como primer argumento. Una prueba (`tests/aislamiento.test.ts`)
  impide que la interfaz importe constantes de la empresa demo.
- **Base de datos**: todas las tablas de datos de empresa llevan `companyId`
  con borrado en cascada; eliminar una empresa borra todo lo suyo.
- **Editor del catálogo** (Administración → Catálogo; permiso
  `manage_catalog`: advisor, líder y admin): responsables (cargos), personas,
  objetivos del cuadro de mando, KPI con su serie, iniciativas (acciones,
  factores, dimensión que instala y framework deducido), estados financieros
  y presencia territorial. Los códigos se asignan en secuencia (R01, P01,
  OE-01, i1); el KPI lleva código propio. No se elimina lo que otra entidad
  referencia (un responsable con KPI a cargo, un objetivo con iniciativas, una
  iniciativa con tareas…). API: `POST /api/td/catalogo` con
  `{ entity, op, data }`. Una empresa vacía nace con las 68 evidencias del
  mapa por verificar y se construye en este orden: cargos → personas →
  objetivos → KPI → iniciativas → tareas (Proyectos). Para cargar un
  catálogo completo desde un JSON con esa misma forma:
  `npx tsx scripts/importar-catalogo.ts <ruta.json> [--slug <slug>] [--crear]`
  (idempotente; con `DATABASE_URL` vacía valida en memoria sin escribir).

## Fuente única de las definiciones

`src/data/4shine.json` se exporta desde los generadores de la línea
(`4Shine Empresas/_generadores/export_plataforma.py`): capacidades, dimensiones,
prácticas, evidencias, escala, metodologías, frameworks, etapas, test y guías.
`src/data/mapa.ts` lo expone tipado; no se edita a mano.

`src/lib/od.ts` es el motor del diagnóstico (documento técnico v2.0):
test, triangulación 40/30/30 con techo de evidencia, señales, prioridad por
arrastre y nivel de acompañamiento. `src/data/od-demo.ts` genera las
respuestas ilustrativas de Andina Suministros con el mismo procedimiento que
la demo del diagnóstico en línea.

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 64 pruebas del motor, el store, el diagnóstico, la priorización, el sector y el despliegue
```

Modo demo por defecto, sin base de datos. Cuentas:

| Cuenta | Rol |
|---|---|
| admin@algoritmot.com | Admin de la plataforma |
| advisor@4shine.co | Advisor 4Shine (configura, verifica y publica) |
| gerencia@andina.example | Líder de la empresa (Andina) |
| operaciones@andina.example | Responsable de la capacidad Ejecución |
| junta@andina.example | Junta o directivo (solo lectura) |

Contraseña común: `4shine-demo-2026`.

## Benchmark sectorial (datos reales)

`scripts/sector-fetch.ts` consulta los datos abiertos de la Superintendencia de
Sociedades en datos.gov.co (carátula `6hqw-m3dm`, resultado integral
`prwj-nzxa`, situación financiera `pfdp-zks5`) y agrega, para un conjunto de
códigos CIIU, el número de sociedades, ingresos, cuartiles de crecimiento,
márgenes, ROA y endeudamiento, concentración, franjas de tamaño, departamentos,
las sesenta mayores y una muestra de cuarenta pares comparables (10.000 a
100.000 M de ingresos). El resultado queda en `src/data/sector/<clave>.json`:

```bash
npm run sector:fetch -- suministros-industriales G4659 G4663 G4669
npm run sector:fetch -- --corte 2024-12-31 <clave> <CIIU…>
```

Para el Ecuador, `scripts/sector_fetch_ec.py <clave> <CIIU…>` construye el
mismo JSON desde el Ranking Empresarial de la Superintendencia de Compañías
(`ranking_<año>.xlsx`, un libro por año; cifras en USD millones; sin ganancia
bruta, el margen operacional se aproxima con la utilidad antes de impuestos).
Registrado: `farmacias-ecuador` (CIIU G4772, ranking 2025 y 2024). Cada
empresa declara `country` (CO | EC: mapa por departamentos o provincias) y
`currency` (COP | USD).

`src/data/sector.ts` tipa el JSON, elige el sector de la empresa
(`INSTITUTION.sectorKey`) y calcula percentiles a partir de los estados
financieros de la empresa (`FINANCIALS` en `demo.ts`). Los conceptos del
portal llevan las tildes como U+FFFD y los valores vienen en miles de pesos;
el script lo resuelve. La API `/api/td/sector` entrega el resumen y la
comparación.

## Matriz 4Shine de priorización (M6)

Cada iniciativa se evalúa con cuatro criterios en escala 1–4 con descriptores:
D impacto en el resultado (40 %), E evidencia de la siguiente etapa (30 %),
M sostenibilidad y réplica (20 %) y L capacidad de ejecución (10 %).
Puntaje = (40·D + 30·E + 20·M + 10·L) ÷ 4. Cuatro criterios comunes marcan si
es estratégica o táctica. Reglas: para competir como prioridad crítica D debe
ser 3 o 4; con L en 1 o 2 se resuelve primero la capacidad; el puntaje ordena
dentro de cada horizonte. La decisión de tiempo (ahora: implementar · ahora:
preparar o validar · luego: backlog · renunciar) solo se admite cuando el
consolidado la permite, y renunciar exige motivo.

| Acción | Consultor | Líder | Responsable | Directivo | Admin |
|---|:--:|:--:|:--:|:--:|:--:|
| Evaluar con la matriz | ✅ | ✅ | solo su ámbito | ✅ | — |
| Decidir el tiempo | ✅ | ✅ | — | — | — |

Motor en `src/lib/priorizacion.ts`; store `evaluateInitiative` /
`decideInitiative` / `setInitiativeHorizon` (una evaluación por evaluador e
iniciativa, persistidas en `InitiativeEvaluation` e `InitiativeDecision`);
API `/api/td/priorizacion`; vista `/panel/iniciativas/priorizacion` y panel
en cada ficha.

El puntaje consolidado también **sugiere el horizonte** (`suggestHorizon`):
elegible (D ≥ 3), con capacidad (L ≥ 3) y 65 o más puntos → primer horizonte
de la empresa; elegible con capacidad pendiente o entre 50 y 64 → siguiente;
el resto → último. La ficha muestra el sugerido y quien decide el tiempo
(gerencia, advisor) puede mover la iniciativa con un clic. Los horizontes los
define cada empresa (`Company.horizons`; por defecto corto y mediano).

En el editor de catálogo la iniciativa se califica con las mismas variables
(D·E·M·L de 1 a 4 y tipo estratégico/táctico) y esa calificación se registra
como la evaluación del usuario en la matriz. Todos los formularios de
administración se abren en modales (`Modal` en `src/components/ui.tsx`).

## Despliegue con PostgreSQL (Vercel)

El esquema de producción es `prisma/postgres/schema.prisma` (idéntico al
local salvo el proveedor; una prueba lo verifica) con su migración en
`prisma/postgres/migrations`. El cliente elige el driver por la URL:
`postgres://…` usa `@prisma/adapter-pg`, `file:` usa SQLite.

1. Crear la base (Neon, Vercel Postgres o propia) y, en Vercel, las
   variables de `.env.example`: `DATABASE_URL`, `AUTH_SECRET`
   (`openssl rand -base64 32`), `DEMO_LOGIN=off` y las cuatro `R2_*`
   (el disco de Vercel es efímero: evidencias y logos van a R2).
2. `vercel.json` fija el build en `npm run build:vercel`, que genera el
   cliente con la configuración PostgreSQL, aplica `prisma migrate deploy` y
   construye Next; región `gru1` (São Paulo).
3. Sembrar una vez: `DATABASE_URL=postgres://… npm run db:pg:seed`.
4. Con `DEMO_LOGIN=off` la contraseña demo deja de valer: fijar contraseñas
   reales con `POST /api/td/users/password` `{ email, password }` (rol con
   `manage_users`); el login valida con bcrypt contra `User.passwordHash`.

Dos detalles que el despliegue exige y que ya están resueltos:

- El store carga Prisma con una importación opaca (para no entrar al bundle
  del navegador), y eso la oculta al rastreador de archivos de Next. Por eso
  `src/instrumentation.ts` importa `src/server/db.ts` (Prisma, adaptadores y
  bcrypt de forma estática) y `next.config.ts` los declara en
  `outputFileTracingIncludes` y `serverExternalPackages`. Si falta, en
  producción aparece «Cannot find package '@prisma/client'» en los logs y la
  plataforma corre solo en memoria.
- Las escrituras a la base se registran con `after()` de Next dentro de
  `persist()`, para que Vercel no congele la función antes de completarlas.

Archivos: con `R2_*` definidas, evidencias y recursos de marca van al bucket
de Cloudflare R2 (`src/server/storage.ts`); el bucket se crea con
`wrangler r2 bucket create <nombre>` y las claves S3 se emiten en el panel de
Cloudflare (R2 → Manage API tokens, Object Read & Write).

Para cambiar el esquema: editar `prisma/schema.prisma`, correr
`npm run db:migrate` (SQLite), copiar el cambio a `prisma/postgres/schema.prisma`
y generar la migración PostgreSQL sin base con
`npx prisma migrate diff --from-migrations prisma/postgres/migrations --to-schema prisma/postgres/schema.prisma --script > prisma/postgres/migrations/<n>_<nombre>/migration.sql`.

## Base de datos (SQLite local)

```bash
npm run db:migrate   # crea var/4shine.db con el esquema (prisma/migrations)
npm run db:seed      # siembra Andina Suministros con los datos del modo demo
```

Con `DATABASE_URL` configurada (`.env` y `.env.local`: `file:./var/4shine.db`),
las mutaciones del diagnóstico escriben en la base y se recuperan al reiniciar:
captura del corte A3 (`PracticeCapture`), publicación (`Assessment` y
`DimensionScore`), test de capacidad empresarial (`TestResponse`), notas del
informe (`TestNote`), encuesta anónima de equipos (`TeamResponse`) y
verificación de evidencia (`Evidence`). Las tareas del gestor ya persistían.
La memoria sigue siendo la fuente de lectura; la base es write-through. El
mapa 4Shine no se persiste: es la definición del sistema (`src/data/4shine.json`).

También persisten los reportes de KPI (`KpiReport`), los cambios de iniciativas
(`InitiativeOverride`), los comentarios y archivos del gestor (`TaskComment`,
`FileAsset`), las tareas creadas, archivadas y reprogramadas (`ProjectTask`, con su
línea base), los usuarios (`User`), las integraciones (`Integration`, claves en texto
plano: solo para la base local), el branding (`Branding`) y las notificaciones
leídas (`NotifRead`). Todas las rutas de la API hidratan la memoria desde la base
antes de responder.

## Origen

Derivada de PGTD (`/Users/andrestabla/Documents/pgtd`). El historial de git
conserva esa procedencia; el stack (Next.js 16, React 19, Prisma 7, SQLite
local) y la arquitectura de escritura (memoria con write-through) no cambian.

