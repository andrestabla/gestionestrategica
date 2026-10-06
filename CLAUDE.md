@AGENTS.md

# Plataforma 4Shine Empresas

- Derivada de PGTD. Las definiciones del sistema (capacidades, dimensiones, prácticas, evidencias, metodologías, frameworks, etapas, test) viven en `src/data/4shine.json`, exportado desde `/Users/andrestabla/Documents/4Shine empresas/4Shine Empresas/_generadores/export_plataforma.py`. No se editan en este repositorio: se regenera el JSON.
- El índice `line` 1..4 de PGTD se conserva en todo el código y significa capacidad: 1 Dirección, 2 Liderazgo, 3 Ejecución, 4 Multiplicación. Las dimensiones se identifican por su código (`DIR-1`…`MUL-5`) y cuelgan de una capacidad; no hay rejilla línea × dimensión.
- Lenguaje de la interfaz: capacidad, dimensión, práctica, evidencia, advisor, empresa, junta. Nunca «línea 4.x», «institución» ni «universidad».
- La empresa demo es Andina Suministros; sus datos están en `src/data/demo.ts`, `cmi.ts`, `proyectos.ts` y `od-demo.ts`.
- `npm test` debe pasar antes de cerrar un cambio.
