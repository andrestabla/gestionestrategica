# 4Shine Empresas · Plataforma de gestión estratégica

Plataforma de gestión estratégica construida sobre la base de PGTD (Algoritmo T)
con el lenguaje y las definiciones del sistema 4Shine Empresas: el diagnóstico
como sistema de gestión, no como documento.

## Módulos

| Código | Módulo | Qué hace |
|---|---|---|
| M1 | Diagnóstico 4Shine-OD | Resumen (radar de capacidades, mapa de calor de 17 dimensiones, tres fuentes, señales), capacidades, dimensiones con sus 68 prácticas y evidencias, test de capacidad empresarial, brechas priorizadas con nivel de acompañamiento y captura del corte A3 |
| M2 | Benchmark | Posición sectorial frente a pares, presencia territorial por departamento e indicadores frente al sector |
| M3 | Estrategia | Cuadro de mando de cuatro perspectivas: objetivo → resultados clave (KPI) → dimensión que instala → iniciativa |
| M4 | Indicadores | KPI con ficha, serie, semáforo, proyección y reporte de valores |
| M5 | Ruta | Gantt por horizontes, matriz impacto × factibilidad y prioridad compuesta |
| M6 | Iniciativas | Avance, presupuesto, factores críticos, bitácora; cada iniciativa instala una dimensión con un framework |
| GP | Proyectos | Tareas con responsables, dependencias, evidencia, kanban, cronograma y carga |
| M7 | Inteligencia | Fuentes del sector y del territorio (observatorios de Algoritmo T) |
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
npm test           # 48 pruebas del motor, el store y el diagnóstico
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

## Origen

Derivada de PGTD (`/Users/andrestabla/Documents/pgtd`). El historial de git
conserva esa procedencia; el stack (Next.js 16, React 19, Prisma 7, SQLite
local) y la arquitectura de escritura (memoria con write-through) no cambian.
Pendiente: alinear `prisma/schema.prisma` y `prisma/seed.ts` con el modelo de
capacidades y dimensiones.
