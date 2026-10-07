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
npm test           # 61 pruebas del motor, el store, el diagnóstico, la priorización y el sector
```

Modo demo por defecto, sin base de datos. Cuentas:

| Cuenta | Rol |
|---|---|
| admin@algoritmot.com | Admin de la plataforma |
| advisor@4shine.co | Advisor 4Shine (configura, verifica y publica) |
| gerencia@andina.example | Líder de la empresa |
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
| Evaluar con la matriz | ✅ | ✅ | solo su capacidad | ✅ | — |
| Decidir el tiempo | ✅ | ✅ | — | — | — |

Motor en `src/lib/priorizacion.ts`; store `evaluateInitiative` /
`decideInitiative` (una evaluación por evaluador e iniciativa, persistidas en
`InitiativeEvaluation` e `InitiativeDecision`); API `/api/td/priorizacion`;
vista `/panel/iniciativas/priorizacion` y panel en cada ficha.

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

