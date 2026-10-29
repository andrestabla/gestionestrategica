# Design System Master File · Gestión estratégica

> **LÓGICA:** al construir una página concreta, mira primero `design-system/gestion-estrategica/pages/<pagina>.md`.
> Si existe, sus reglas **prevalecen** sobre este archivo. Si no, se aplica este MASTER tal cual.

---

**Proyecto:** Gestión estratégica · plataforma de Algoritmo T (gestionestrategica.io)
**Generado:** 2026-10-29 con UI/UX Pro Max (`--design-system --density 7 --motion 3`) y ajustado a la marca
**Categoría:** B2B Service · plataforma de gestión estratégica para comités directivos y advisors
**Diales:** Movimiento 3/10 (sutil) · Densidad 7/10 (estándar, con tablas densas en escritorio)
**Stack:** Next.js 16 · React 19 · Tailwind 4 · lucide-react · Inter y JetBrains Mono vía `next/font`

**Qué se tomó de la skill:** el estilo «Accesible y ético» (contraste 4,5:1, texto base 16 px en formularios, foco visible, objetivos táctiles de 44 px, movimiento reducido), la escala de espaciado, las sombras, la lista previa a la entrega y los antipatrones.
**Qué se conserva de la marca:** marino 0D1B2A, dorado F1BA5B (acento) y 8A6410 (dorado como texto), Inter como única familia de texto y JetBrains Mono para cifras y códigos. La paleta azul y las fuentes EB Garamond y Lato que proponía el generador no se adoptan.

---

## Reglas globales

### Paleta de color

Los tokens viven en `src/app/globals.css` (`:root`) y se exponen a Tailwind en `@theme` como `--color-*`. No se escriben hex en componentes.

| Rol | Hex | Token CSS | Uso |
|-----|-----|-----------|-----|
| Primario (marca) | `#0D1B2A` | `--navy` | Menú lateral, botón primario, encabezados de tabla |
| Sobre primario | `#FFFFFF` | — | Texto sobre marino (17,4:1) |
| Acento (marca) | `#F1BA5B` | `--gold-fill` · `--ring` | Isotipo, kickers sobre marino (9,9:1), anillo de foco |
| Acento como texto | `#8A6410` | `--gold-text` | Dorado legible sobre blanco (≥ 4,5:1); `--gold #a87a14` queda para fondos y gráficos |
| Secundario | `#6B5417` | `--cyan-deep` | Enlaces, pestañas activas, énfasis (7,2:1) |
| Fondo | `#F2F3F5` | `--bg` | Lienzo de la aplicación |
| Superficie | `#FFFFFF` | `--surface` | Tarjetas y paneles |
| Superficie 2 | `#F4F5F7` | `--surface-2` | Bloques internos, filas alternas |
| Texto | `#0F1520` | `--ink` | Cuerpo y títulos |
| Texto suave | `#38404D` | `--ink-soft` | Párrafos de apoyo (10,4:1) |
| Texto secundario | `#5A6473` | `--muted` | Metadatos y ayudas: ≥ 4,5:1 también sobre superficie 2 |
| Texto tenue | `#66707E` | `--faint` | Pies y notas: ≥ 4,5:1 sobre blanco y superficie 2 (antes #9AA3B0, 2,55:1) |
| Línea | `#E6E8EC` | `--line` | Bordes y separadores |
| Correcto | `#2E9E6B` · texto `#1F7A50` | `--ok` · `--ok-text` | Fondos, chips, barras · texto |
| Advertencia | `#E0913F` · texto `#9A5A12` | `--warn` · `--warn-text` | Fondos, chips, barras · texto |
| Error | `#CF5860` · texto `#B8323D` | `--bad` · `--bad-text` | Fondos, chips, barras · texto |

**Regla:** un color de estado se usa como texto solo a través de su variante `*-text`; las clases `text-ok`, `text-warn`, `text-bad` y `text-gold` ya apuntan a esas variantes.

### Tipografía

- **Familia:** Inter (títulos y cuerpo) · JetBrains Mono (cifras, códigos y periodos: clase `num`).
- **Escala** (mínimo 11 px, y solo para insignias numéricas y kickers en mayúsculas; cualquier texto legible ≥ 12 px):

| Nivel | Tamaño | Uso |
|-------|--------|-----|
| badge | 11 px | Insignias numéricas, kickers y rótulos en mayúsculas (`.label`, espaciado 0,11 em) |
| xs | 12 px | Metadatos, pies, celdas secundarias, chips |
| sm | 13 px | Ayudas, celdas de tabla, botones compactos |
| base | 14–15 px | Cuerpo y formularios en escritorio |
| form-mobile | 16 px | Campos de formulario en pantallas táctiles (evita el zoom automático) |
| h3 | 16 px | Títulos de tarjeta |
| h2 | 22 px | Títulos de sección |
| h1 | 26–30 px | Título de página |

- **Interlineado:** 1,5 en cuerpo; 1,25 en títulos. **Peso:** 400 cuerpo, 600 énfasis, 700–800 títulos.
- **Prohibido:** clases arbitrarias por debajo de `text-[11px]`; gris sobre gris por debajo de 4,5:1.

### Espaciado

*Densidad 7/10 · estándar*

| Token | Valor | Uso |
|-------|-------|-----|
| `--space-xs` | 4 px | Separación mínima entre icono y texto |
| `--space-sm` | 8 px | Separación entre controles de una barra (mínimo táctil) |
| `--space-md` | 16 px | Relleno estándar de tarjetas en móvil |
| `--space-lg` | 24 px | Relleno de tarjetas en escritorio, separación entre bloques |
| `--space-xl` | 32 px | Separación entre secciones |
| `--space-2xl` | 48 px | Márgenes de sección de página |

### Sombras y radios

| Nivel | Valor | Uso |
|-------|-------|-----|
| `--e1` | sombra suave | Tarjetas en reposo |
| `--e2` | sombra media | Tarjeta elevada, menús |
| `--e3` | sombra profunda | Modales |
| Radios | 8 px controles · 12 px tarjetas · 16 px modales · 999 px chips |

---

## Especificación de componentes

### Botones

| Variante | Alto | Texto | Uso |
|----------|------|-------|-----|
| `btn-primary` | 40 px (md) · 48 px (lg) | 13–14 px, 600 | Acción principal de la pantalla; una por vista |
| `btn-ghost` | 40 px (md) · 32 px (sm) | 13 px, 600 | Acciones secundarias y barras de herramientas |
| Icono solo | 40 × 40 px (32 en barras de escritorio) | — | **Siempre con `aria-label`**; `title` como refuerzo |
| Táctil | ≥ 44 × 44 px, separación ≥ 8 px | — | En pantallas `pointer: coarse` |

Estados: hover con transición de 150–200 ms; `:focus-visible` con anillo dorado de 2 px y desplazamiento de 2 px (regla global en `globals.css`); `disabled` con opacidad 0,4 y sin hover; `aria-busy` mientras guarda.

### Campos de formulario (`Field`)

- Etiqueta visible siempre (nunca solo placeholder), asociada con `htmlFor`/`id`.
- Ayuda de una línea bajo la etiqueta; error bajo el campo con icono y `aria-describedby`.
- Validación al salir del campo para códigos, periodos, correos y cifras; al enviar, resumen de errores con enlaces a cada campo.
- Opciones largas (modo, regla, plantilla): tarjetas de opción con título y descripción en lugar de `<select>`.

### Tarjetas y tablas

- `Card` con `CardHeader` (título 16 px, subtítulo 12 px).
- Tablas de escritorio con encabezado en mayúsculas de 11 px; en móvil, tarjetas por fila; bajo 1024 px, columnas prioritarias y fila expandible.
- Celdas numéricas con `num` y alineación derecha.

### Chips e insignias

- Chip informativo: 12 px, alto 24 px, sin cursor de mano.
- Chip accionable (filtro): 12 px, alto 28 px, con `aria-pressed`.
- Insignia numérica: 11 px, `num`.

### Diálogos y avisos

- Confirmaciones destructivas con `ConfirmDialog` propio (nombre del elemento, consecuencia, botón primario de acción); **no** `window.confirm`.
- Guardados con aviso `Toast` discreto (3 s, `aria-live="polite"`), con «Deshacer» cuando aplique.
- Cargas con `Skeleton` que reserva la altura de tarjetas y tablas (sin desplazamiento acumulado).

### Estados vacíos y primer uso

- Sin medición publicada ni fuente capturada (corte A0): gauge, radar y mapa de calor en estado «sin dato» (gris, `—`); nunca «1,0 Incipiente».
- Sin corte publicado: las alertas del motor no se generan (panel, campana y API).
- Empresa nueva: lista de arranque con los pasos del método y avance.

---

## Movimiento

- Entrada de página: `rise` 0,5 s con escalonado de 0,05–0,23 s, solo en la primera carga, no al cambiar de pestaña.
- Transiciones de estado: 150–300 ms, `ease-out`; salida más rápida que entrada.
- `prefers-reduced-motion: reduce` desactiva animaciones de entrada y pulsos (ya implementado).
- Sin GSAP ni scroll-reveal: la plataforma es una herramienta de trabajo, no una landing.

---

## Antipatrones (no usar)

- ❌ Texto por debajo de 11 px, o de 12 px en contenido legible
- ❌ Gris tenue (#9AA3B0) como texto; colores de estado vivos como texto
- ❌ `outline-none` sin anillo alternativo; botones de icono sin `aria-label`
- ❌ Etiquetas solo en el placeholder
- ❌ `window.confirm` / `window.alert`
- ❌ Códigos internos (M1, CV, GP) visibles en el menú del cliente
- ❌ Calificar sin datos («1,0 Incipiente» en empresa vacía)
- ❌ Emojis como iconos; degradados morados o rosas; estilo lúdico
- ❌ Hex escritos en componentes en lugar de tokens

---

## Lista previa a la entrega

- [ ] Ningún texto bajo 11 px; contenido legible ≥ 12 px
- [ ] Contraste de texto ≥ 4,5:1 (verificar con el cálculo de luminancia de la auditoría)
- [ ] Foco visible en todo control; botones de icono con `aria-label`
- [ ] Etiquetas asociadas a campos; errores junto al campo
- [ ] Objetivos táctiles ≥ 44 px en móvil; sin desplazamiento horizontal a 375 px
- [ ] Estados vacíos y «sin dato» en lugar de ceros o unos engañosos
- [ ] Iconos solo de lucide-react; `cursor-pointer` en lo clicable
- [ ] `prefers-reduced-motion` respetado; transiciones de 150–300 ms
- [ ] Revisión en 375, 768, 1024 y 1366 px antes de desplegar
