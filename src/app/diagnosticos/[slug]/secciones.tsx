import type { CSSProperties, ReactNode } from "react";
import {
  Activity, ArrowDown, ArrowRight, BarChart3, Bot, Check, Circle, Compass, Equal, Eye, FileText, Layers, Plus, ScanSearch,
  Target, Users, X, type LucideIcon,
} from "lucide-react";

// Secciones explicativas de las páginas públicas de los dos diagnósticos: la vista de la portada, qué mide,
// cómo se calcula y qué resultados arroja. Son gráficas antes que texto. Componente de servidor, sin JavaScript.
// Las reglas son las de la plataforma (src/lib/madurez.ts y src/lib/od.ts) y los textos del instrumento
// (afirmación, evidencia, rúbrica, escalas, preguntas, etapas, rangos, hipótesis) se copian literales: si
// cambian allá, se actualizan aquí. Las figuras de resultados usan una empresa ficticia y lo dicen; sus cifras
// cumplen esas reglas.

const f1 = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const x5 = (n: number) => `${((n - 1) / 4) * 100}%`;
const nColor = (n: number) => `var(--n${Math.min(5, Math.max(1, Math.floor(n + 1e-9)))})`;
const v = (o: Record<string, string | number>) => o as CSSProperties;
const MORADO = "#7c5cd6";

/* ════════════════════════════ piezas comunes ════════════════════════════ */

function Sec({ id, kicker, titulo, lead, blanca, children }: { id: string; kicker: string; titulo: string; lead: ReactNode; blanca?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={`sp-sec ${blanca ? "sp-blanca" : ""}`} aria-labelledby={`${id}-t`}>
      <div className="sp-wrap">
        <span className="sp-kicker">{kicker}</span>
        <h2 className="sp-h2 sp-dx-h2" id={`${id}-t`}>{titulo}</h2>
        <p className="sp-lead sp-dx-lead">{lead}</p>
        {children}
      </div>
    </section>
  );
}

function Fig({ titulo, nota, ejemplo = true, className = "", children }: { titulo: string; nota?: ReactNode; ejemplo?: boolean; className?: string; children: ReactNode }) {
  return (
    <figure className={`sp-dx-fig ${className}`}>
      <figcaption><span>{titulo}</span>{ejemplo && <em>Datos de ejemplo</em>}</figcaption>
      <div className="sp-dx-fig-c">{children}</div>
      {nota && <p className="sp-dx-nota">{nota}</p>}
    </figure>
  );
}

const Leyenda = ({ items }: { items: { color: string; label: string; forma?: "raya" | "aro" }[] }) => (
  <div className="sp-dx-leyenda">
    {items.map((x) => <span key={x.label}><i data-forma={x.forma ?? "punto"} style={v({ "--c": x.color })} />{x.label}</span>)}
  </div>
);

const Caso = ({ children }: { children: ReactNode }) => <div className="sp-dx-caso"><b>El ejemplo</b><p>{children}</p></div>;

/** Una regla de cálculo: a la izquierda qué se hace; a la derecha, cómo se ve con el ejemplo. */
function Regla({ n, t, d, children }: { n: number; t: string; d: ReactNode; children: ReactNode }) {
  return (
    <li className="sp-dx-regla">
      <div className="sp-dx-regla-tx"><span aria-hidden="true">{n}</span><h3>{t}</h3><p>{d}</p></div>
      <div className="sp-dx-regla-v">{children}</div>
    </li>
  );
}

/** Escalera de cinco peldaños: niveles, escalas y etapas se leen como un ascenso. */
function Escalera({ nombres, marcas = {}, tono = "nivel", rotulo }: { nombres: string[]; marcas?: Record<number, { t: string; tipo: "hoy" | "meta" }>; tono?: "nivel" | "navy"; rotulo: string }) {
  return (
    <div className="sp-dx-escalera" data-tono={tono} role="img" aria-label={rotulo}>
      {nombres.map((n, i) => { const m = marcas[i + 1]; return (
        <div key={n} data-marca={m?.tipo} style={v({ "--k": i + 1, "--c": `var(--n${i + 1})` })}>
          {m && <em>{m.t}</em>}
          <i><b>{i + 1}</b></i>
          <span lang="es">{n}</span>
        </div>
      ); })}
    </div>
  );
}

/** Escala de 1 a 5 con una respuesta marcada. */
function Likert({ valor, extremos }: { valor: number; extremos: [string, string] }) {
  return (
    <div className="sp-dx-likert" role="img" aria-label={`Escala de 1 a 5, de «${extremos[0]}» a «${extremos[1]}»; en el ejemplo, ${valor}`}>
      <div>{[1, 2, 3, 4, 5].map((n) => <span key={n} data-on={n === valor ? "" : undefined}>{n}</span>)}</div>
      <p><span>{extremos[0]}</span><span>{extremos[1]}</span></p>
    </div>
  );
}

const Medidor = ({ valor, de = 4, rotulo }: { valor: number; de?: number; rotulo: string }) => (
  <div className="sp-dx-medidor" role="img" aria-label={`${rotulo}: ${valor} de ${de}`}>{Array.from({ length: de }, (_, i) => <i key={i} data-on={i < valor ? "" : undefined} />)}</div>
);

/* ════════════════════════════ Madurez digital ════════════════════════════ */

const DIMS = [
  { name: "Organizacional", d: "Estrategia, responsables, personas y competencias." },
  { name: "Negocio y procesos", d: "Cómo se hace el trabajo y cómo se atiende al cliente." },
  { name: "Tecnológica", d: "Sistemas, plataformas y herramientas." },
  { name: "Datos e información", d: "Qué datos hay, su calidad y cómo se usan para decidir." },
];
const FRENTES = [
  { corto: "Clientes", name: "Clientes, canales y experiencia", color: "#0e93b4", peso: 30, d: "Cómo atrae, vende y atiende por canales digitales, y qué tanto conoce a sus clientes.",
    ej: ["Estrategia de clientes y canales digitales", "Venta y autogestión en canales digitales", "Plataforma de gestión de clientes", "Vista única del cliente"] },
  { corto: "Operación", name: "Operación y procesos", color: MORADO, peso: 25, d: "Qué tan digitalizados, integrados y medidos están los procesos con los que opera.",
    ej: ["Gestión por procesos y dueños de proceso", "Digitalización de procesos de extremo a extremo", "Sistemas centrales de gestión", "Indicadores operativos y tableros de gestión"] },
  { corto: "Innovación", name: "Productos, servicios e innovación", color: "#e0913f", peso: 20, d: "Cómo renueva su oferta: el método para innovar, el componente digital de lo que vende y el uso de inteligencia artificial.",
    ej: ["Estrategia y portafolio de innovación", "Proceso de desarrollo de productos y servicios", "Componente digital de la oferta", "Datos de uso y desempeño de la oferta"] },
  { corto: "Arquitectura", name: "Arquitectura empresarial y gobierno digital", color: "#3f9d8c", peso: 25, d: "La base que sostiene lo demás: gobierno de la tecnología, arquitectura, seguridad, continuidad y datos.",
    ej: ["Gobierno de tecnología y transformación digital", "Arquitectura empresarial documentada", "Seguridad de la información y ciberseguridad", "Gobierno de datos"] },
];
const NIVELES = [
  { name: "Inicial", d: "Prácticas informales, dependientes de personas; sin registro sistemático." },
  { name: "En desarrollo", d: "Documentadas en algunas unidades; herramientas aisladas, sin integración." },
  { name: "Definido", d: "Procesos formalizados; responsables asignados; datos consistentes." },
  { name: "Gestionado", d: "Procesos medidos con indicadores; decisiones con datos; interoperabilidad." },
  { name: "Optimizado", d: "Mejora continua sobre evidencia; analítica avanzada; capacidad de referente." },
];
const ESTADOS = ["Ausente", "Disponible", "Adoptada", "Integrada", "Con impacto"];
const MARCOS = ["TOGAF 10", "DAMA-DMBOK", "ISO/IEC 27001", "COBIT 2019", "ITIL 4", "ISO 9001", "ISO 56002", "NIST AI RMF"];
const COMPONENTES_IA = ["Gobierno, ética y riesgos", "Datos, infraestructura y seguridad", "Talento", "Clientes", "Operación", "Productos"];
// Práctica de ejemplo, con los textos del instrumento (AR-DAT-1 · Gobierno de datos).
const PRACTICA = {
  name: "Gobierno de datos", marco: "DAMA-DMBOK, el referente internacional de gestión de datos",
  afirmacion: "Los datos clave de la empresa tienen responsables, definiciones comunes y reglas de calidad y de acceso.",
  respuesta: 4,
  evidencia: [
    { k: "Documentación", icono: FileText, peso: 25, q: "¿Está escrito, aprobado y vigente?", ej: "Política de gobierno de datos, catálogo o glosario de datos y designación de los responsables por dominio.", val: 2, lectura: "Aprobado, con difusión limitada" },
    { k: "Implementación", icono: Activity, peso: 35, q: "¿Se practica realmente?", ej: "Actas de la instancia de gobierno de datos y evidencia de aplicación de las reglas en los sistemas.", val: 1, lectura: "Piloto aislado o esfuerzo individual" },
    { k: "Indicadores", icono: BarChart3, peso: 40, q: "¿Se mide y se usa para decidir?", ej: "Dominios con responsable, reglas de calidad aplicadas e incidentes de datos resueltos.", val: 1, lectura: "Datos ocasionales o anecdóticos" },
  ],
  rubrica: [
    "Los datos no tienen dueño; cada área define y calcula las cifras a su manera.",
    "Se reconoce el problema; hay definiciones acordadas para algunos datos, sin roles formales.",
    "Política aprobada, responsables designados y catálogo de los datos maestros.",
    "Reglas de calidad y de acceso aplicadas y medidas; la instancia de gobierno resuelve los conflictos sobre los datos.",
    "Los datos se gestionan como un activo de la empresa; el gobierno cubre todos los dominios y se revisa por ciclos.",
  ],
  nivel: 2, meta: 3, P: 75, E: 31, S: 49,
};
const RANGOS = [
  { name: "Inicial", min: 0, max: 19 }, { name: "Emergente", min: 20, max: 39 }, { name: "Gestionado", min: 40, max: 59 },
  { name: "Integrado", min: 60, max: 79 }, { name: "Transformador", min: 80, max: 100 },
];

// Empresa ficticia de las figuras de resultados. Índice general = 0,30·52 + 0,25·58 + 0,20·36 + 0,25·44 = 48.
// Cada frente: puntaje = 0,40·P + 0,60·E; las casillas son promedios de tres niveles enteros.
const M_EJ = {
  general: 48, ia: 41, condiciones: [true, true, true, false, false],
  frentes: [
    { nivel: 2.8, meta: 4.0, P: 68, E: 41, S: 52, celdas: [3.0, 3.3, 2.7, 2.0], estados: [1, 4, 5, 2, 0] },
    { nivel: 3.1, meta: 4.0, P: 62, E: 55, S: 58, celdas: [3.0, 3.7, 3.3, 2.3], estados: [0, 3, 5, 3, 1] },
    { nivel: 2.2, meta: 3.0, P: 51, E: 26, S: 36, celdas: [2.3, 2.7, 2.0, 1.7], estados: [3, 5, 3, 1, 0] },
    { nivel: 2.4, meta: 3.5, P: 30, E: 53, S: 44, celdas: [2.7, 2.3, 3.0, 1.7], estados: [2, 5, 4, 1, 0] },
  ],
  industria: [
    { hecho: "Empresas del sector que venden por canales digitales", pct: 64, propio: "Venta y autogestión digital: nivel 2" },
    { hecho: "Empresas del sector con un único sistema de clientes", pct: 51, propio: "Plataforma de gestión de clientes: nivel 3" },
    { hecho: "Empresas del sector que usan analítica para decidir", pct: 38, propio: "Analítica para la dirección: nivel 2" },
    { hecho: "Empresas del sector con inteligencia artificial en algún proceso", pct: 27, propio: "Automatización e IA en procesos: nivel 1" },
  ],
  prioridades: [
    { n: 1, t: "Nombrar responsables de los datos de clientes y de productos", esf: 0, imp: 2, plazo: "0 a 90 días" },
    { n: 2, t: "Llevar el registro de clientes a un solo sistema", esf: 1, imp: 2, plazo: "3 a 6 meses" },
    { n: 3, t: "Medir la experiencia en los canales digitales", esf: 0, imp: 1, plazo: "0 a 90 días" },
    { n: 4, t: "Inventario de usos de inteligencia artificial, con responsable", esf: 0, imp: 1, plazo: "0 a 90 días" },
    { n: 5, t: "Integrar ventas, inventario y facturación", esf: 2, imp: 2, plazo: "6 a 12 meses" },
  ],
  ruta: [
    { t: "Responsables de los datos nombrados", a: 1, b: 2, tramo: 0 },
    { t: "Inventario de usos de inteligencia artificial", a: 1, b: 3, tramo: 0 },
    { t: "Medición de la experiencia digital", a: 2, b: 3, tramo: 0 },
    { t: "Registro único de clientes", a: 4, b: 6, tramo: 1 },
    { t: "Glosario de datos acordado", a: 4, b: 5, tramo: 1 },
    { t: "Ventas, inventario y facturación integrados", a: 7, b: 11, tramo: 2 },
    { t: "Segunda medición", a: 12, b: 12, tramo: 2 },
  ],
};
const TRAMOS = [{ t: "0 a 90 días", cols: 3, color: "var(--navy)" }, { t: "3 a 6 meses", cols: 3, color: MORADO }, { t: "6 a 12 meses", cols: 6, color: "var(--n4)" }];
const GRADO = ["Bajo", "Medio", "Alto"];
const lecturaBrecha = (d: number) => (d > 20 ? "Sobreestimación" : d < -20 ? "Práctica invisible" : "Convergencia");
// 48 puntos de la dispersión: doce por frente, con desvíos de suma cero para que el promedio sea el del frente.
const DESV_P = [-22, -15, -10, -6, -3, 0, 2, 5, 8, 11, 14, 16], DESV_E = [9, -14, 4, -20, 13, -7, 17, 0, -11, 6, -2, 5];
const PUNTOS = M_EJ.frentes.flatMap((f, i) => DESV_P.map((dp, j) => ({ p: f.P + dp, e: f.E + DESV_E[(j + i * 5) % 12], color: FRENTES[i].color, k: `${i}-${j}` })));

function Escala100({ valor, rotulo }: { valor: number; rotulo: string }) {
  const r = RANGOS.find((x) => valor >= x.min && valor <= x.max)!;
  return (
    <div className="sp-dx-indice">
      <div className="sp-dx-indice-n"><b>{valor}</b><span>de 100 · {r.name}</span></div>
      <div className="sp-dx-indice-eje" role="img" aria-label={`${rotulo}: ${valor} de 100, rango ${r.name}`}>
        {RANGOS.map((x, i) => <i key={x.name} style={v({ "--w": x.max - x.min + 1, "--c": `var(--n${i + 1})` })} data-on={x === r ? "" : undefined} />)}
        <u style={v({ "--x": `${valor}%` })} />
      </div>
      <div className="sp-dx-indice-r">{RANGOS.map((x) => <span key={x.name} style={v({ "--w": x.max - x.min + 1 })} data-on={x === r ? "" : undefined}>{x.name}</span>)}</div>
    </div>
  );
}

const Pesos = ({ valores }: { valores?: number[] }) => (
  <div className="sp-dx-pesos" role="img" aria-label={`Peso de cada frente en el índice general: ${FRENTES.map((f) => `${f.corto} ${f.peso} %`).join(", ")}`}>
    {FRENTES.map((f, i) => <div key={f.name} style={v({ "--w": f.peso, "--c": f.color })}><b>{valores ? valores[i] : `${f.peso} %`}</b><span>{f.corto}{valores ? ` · ${f.peso} %` : ""}</span></div>)}
  </div>
);

const BarrasFrentes = () => (
  <div className="sp-dx-barras">
    {FRENTES.map((f, i) => { const d = M_EJ.frentes[i]; return (
      <div key={f.name}>
        <div className="sp-dx-barras-r"><span>{f.name}</span><span><b>{f1(d.nivel)}</b> → meta {f1(d.meta)}</span></div>
        <div className="sp-dx-barra" role="img" aria-label={`${f.name}: nivel ${f1(d.nivel)}, meta ${f1(d.meta)}`}><i style={v({ "--w": x5(d.nivel), "--c": f.color })} /><u style={v({ "--x": x5(d.meta) })} /></div>
      </div>
    ); })}
    <div className="sp-dx-ticks">{[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}</div>
  </div>
);

const Calor = () => (
  <div className="sp-dx-scroll">
    <table className="sp-dx-calor">
      <thead><tr><th />{DIMS.map((d) => <th key={d.name} scope="col">{d.name}</th>)}</tr></thead>
      <tbody>{FRENTES.map((f, i) => (
        <tr key={f.name}><th scope="row"><i style={v({ "--c": f.color })} />{f.corto}</th>{M_EJ.frentes[i].celdas.map((c, j) => <td key={j} style={v({ "--c": nColor(c) })}>{f1(c)}</td>)}</tr>
      ))}</tbody>
    </table>
  </div>
);

function Dispersion() {
  const W = 420, H = 310, m = { l: 40, r: 12, t: 12, b: 38 }, w = W - m.l - m.r, h = H - m.t - m.b;
  const sx = (e: number) => m.l + (e / 100) * w, sy = (p: number) => m.t + h - (p / 100) * h;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sp-dx-svg" role="img" aria-label="Dispersión de 48 prácticas: percepción frente a evidencia">
      <polygon points={`${sx(0)},${sy(20)} ${sx(0)},${sy(0)} ${sx(20)},${sy(0)} ${sx(100)},${sy(80)} ${sx(100)},${sy(100)} ${sx(80)},${sy(100)}`} fill="var(--surface-2)" />
      {[0, 25, 50, 75, 100].map((t) => <g key={t}><line x1={sx(t)} x2={sx(t)} y1={m.t} y2={m.t + h} stroke="var(--line)" /><line x1={m.l} x2={m.l + w} y1={sy(t)} y2={sy(t)} stroke="var(--line)" />
        <text x={sx(t)} y={m.t + h + 15} textAnchor="middle" fontSize="11" fill="var(--faint)">{t}</text><text x={m.l - 7} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="var(--faint)">{t}</text></g>)}
      <line x1={sx(0)} y1={sy(0)} x2={sx(100)} y2={sy(100)} stroke="var(--line-strong)" strokeDasharray="4 4" />
      <text x={sx(4)} y={m.t + 14} fontSize="12" fontWeight="700" fill="var(--bad-text)">Sobreestimación</text>
      <text x={sx(96)} y={m.t + h - 9} textAnchor="end" fontSize="12" fontWeight="700" fill="var(--ink-soft)">Práctica invisible</text>
      <text x={m.l + w / 2} y={H - 5} textAnchor="middle" fontSize="11.5" fill="var(--muted)">Evidencia →</text>
      <text x={12} y={m.t + h / 2} textAnchor="middle" fontSize="11.5" fill="var(--muted)" transform={`rotate(-90 12 ${m.t + h / 2})`}>Percepción →</text>
      {PUNTOS.map((p) => <circle key={p.k} cx={sx(p.e)} cy={sy(p.p)} r="5.5" fill={p.color} stroke="var(--surface)" strokeWidth="2" />)}
    </svg>
  );
}

/** Vista de la portada: el informe de madurez en pequeño. */
function MadPortada() {
  return (
    <div className="sp-panel sp-dx-vista" aria-hidden="true">
      <div className="sp-panel-top"><div><strong>Informe de resultados</strong><small>Comercial Andina · empresa ficticia</small></div><span className="sp-chip sp-chip-oro">Datos de ejemplo</span></div>
      <div className="sp-dx-vista-c">
        <div><small>Índice general de madurez digital</small><Escala100 valor={M_EJ.general} rotulo="Índice general" /></div>
        <div className="sp-dx-vista-dos">
          <div><small>Nivel por frente y dimensión</small>
            <div className="sp-dx-mini-calor">{FRENTES.map((f, i) => <div key={f.name}><i style={v({ "--c": f.color })} />{M_EJ.frentes[i].celdas.map((c, j) => <b key={j} style={v({ "--c": nColor(c) })}>{f1(c)}</b>)}</div>)}</div>
          </div>
          <div><small>Nivel y meta por frente</small>
            <div className="sp-dx-mini-barras">{FRENTES.map((f, i) => { const d = M_EJ.frentes[i]; return <div key={f.name}><span>{f.corto}<b>{f1(d.nivel)}</b></span><div className="sp-dx-barra"><i style={v({ "--w": x5(d.nivel), "--c": f.color })} /><u style={v({ "--x": x5(d.meta) })} /></div></div>; })}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MadMide() {
  const p = PRACTICA;
  return (
    <Sec id="mide" kicker="Qué mide" titulo="Cuarenta y ocho prácticas concretas"
      lead="Cada práctica es algo que la organización hace o no hace: trabajar sobre un único sistema de clientes, medir la experiencia, nombrar responsables de los datos. Se agrupan en cuatro frentes de la transformación y, dentro de cada frente, en cuatro dimensiones.">
      <Fig ejemplo={false} titulo="Cuatro frentes, cuatro dimensiones, 48 prácticas" className="sp-dx-arriba"
        nota="Hay tres prácticas en cada cruce; aquí aparece una como muestra. El porcentaje es el peso de cada frente en el índice general.">
        <Pesos />
        <div className="sp-dx-malla">
          <div className="sp-dx-malla-cab" aria-hidden="true"><span />{DIMS.map((d) => <span key={d.name}><b>{d.name}</b>{d.d}</span>)}</div>
          {FRENTES.map((f) => (
            <div key={f.name} className="sp-dx-malla-fila">
              <div className="sp-dx-malla-frente" style={v({ "--c": f.color })}><b>{f.name}</b><span>{f.peso} % del índice · 12 prácticas</span><p>{f.d}</p></div>
              {f.ej.map((e, i) => <div key={e} className="sp-dx-malla-celda"><small>{DIMS[i].name}</small>{e}</div>)}
            </div>
          ))}
        </div>
      </Fig>

      <h3 className="sp-dx-h3">Una práctica por dentro</h3>
      <p className="sp-dx-p">Así se evalúa «{p.name}», una de las 48. Las demás siguen el mismo esquema.</p>
      <div className="sp-dx-tres">
        <article className="sp-dx-bloque">
          <span className="sp-dx-paso">1 · Lo que respondes</span>
          <h4>Percepción</h4>
          <blockquote>«{p.afirmacion}»</blockquote>
          <Likert valor={p.respuesta} extremos={["Totalmente en desacuerdo", "Totalmente de acuerdo"]} />
          <p className="sp-dx-min">En el ejemplo, el promedio de las respuestas es {p.respuesta}. «No lo sé» queda fuera del promedio y se anota como punto por aclarar.</p>
        </article>
        <article className="sp-dx-bloque">
          <span className="sp-dx-paso">2 · Lo que se verifica</span>
          <h4>Evidencia</h4>
          <ul className="sp-dx-dik">
            {p.evidencia.map((e) => <li key={e.k}><span className="sp-dx-ico"><e.icono size={18} /></span><div><b>{e.k}</b><i>{e.q}</i><span>{e.ej}</span><Medidor valor={e.val} rotulo={e.k} /></div></li>)}
          </ul>
          <p className="sp-dx-min">El asesor califica cada componente de 0 a 4 con lo que encuentra.</p>
        </article>
        <article className="sp-dx-bloque">
          <span className="sp-dx-paso">3 · Cómo se asigna el nivel</span>
          <h4>Rúbrica de 1 a 5</h4>
          <Escalera nombres={NIVELES.map((n) => n.name)} marcas={{ [p.nivel]: { t: "Hoy", tipo: "hoy" }, [p.meta]: { t: "Meta", tipo: "meta" } }} rotulo={`Cinco niveles de madurez; en el ejemplo, nivel ${p.nivel} hoy y meta ${p.meta}`} />
          <dl className="sp-dx-hoymeta">
            <div style={v({ "--c": `var(--n${p.nivel})` })}><dt>Hoy · nivel {p.nivel}</dt><dd>{p.rubrica[p.nivel - 1]}</dd></div>
            <div style={v({ "--c": `var(--n${p.meta})` })}><dt>Meta · nivel {p.meta}</dt><dd>{p.rubrica[p.meta - 1]}</dd></div>
          </dl>
          <p className="sp-dx-min">Cada nivel tiene una descripción propia para esta práctica, apoyada en {p.marco}.</p>
        </article>
      </div>

      <div className="sp-dx-grid3">
        <article className="sp-dx-nota-tarjeta">
          <span className="sp-dx-ico"><Bot size={18} /></span>
          <h4>Preparación para inteligencia artificial</h4>
          <p>Un índice de 0 a 100 con seis componentes y cinco condiciones mínimas.</p>
          <div className="sp-dx-chips">{COMPONENTES_IA.map((c) => <span key={c}>{c}</span>)}</div>
        </article>
        <article className="sp-dx-nota-tarjeta">
          <span className="sp-dx-ico"><Layers size={18} /></span>
          <h4>Estado de cada práctica</h4>
          <p>Lo que la evidencia demuestra sobre su uso.</p>
          <div className="sp-dx-cadena">{ESTADOS.map((e, i) => <span key={e} style={v({ "--c": `var(--n${i + 1})` })}>{e}</span>)}</div>
        </article>
        <article className="sp-dx-nota-tarjeta">
          <span className="sp-dx-ico"><ScanSearch size={18} /></span>
          <h4>Referentes de la rúbrica</h4>
          <p>Los niveles se describen con marcos reconocidos, de modo que el resultado se puede sostener ante un tercero.</p>
          <div className="sp-dx-chips">{MARCOS.map((c) => <span key={c}>{c}</span>)}</div>
        </article>
      </div>
    </Sec>
  );
}

function MadCalculo() {
  const p = PRACTICA, brecha = p.P - p.E;
  return (
    <Sec id="calculo" kicker="Cómo se calcula" titulo="La evidencia pesa más que la opinión"
      lead="Cada práctica recibe dos lecturas, la percepción y la evidencia, y un nivel. El ejemplo sigue con «Gobierno de datos» en una empresa ficticia.">
      <ol className="sp-dx-reglas">
        <Regla n={1} t="Percepción" d="El promedio de las respuestas de 1 a 5 se lleva a una escala de 0 a 100. Si responden varias personas, se promedian.">
          <div className="sp-dx-flujo">
            <Likert valor={p.respuesta} extremos={["En desacuerdo", "De acuerdo"]} />
            <ArrowRight className="sp-dx-flecha" size={22} aria-hidden="true" />
            <div className="sp-dx-dato" style={v({ "--c": MORADO })}><small>Percepción</small><b>{p.P}</b><em>de 100</em></div>
          </div>
        </Regla>
        <Regla n={2} t="Evidencia" d="Documentación, implementación e indicadores se califican de 0 a 4 y pesan 25 %, 35 % y 40 %. Medir y usar vale más que tener el documento.">
          <div className="sp-dx-flujo">
            <div className="sp-dx-dikv">
              {p.evidencia.map((e) => <div key={e.k}><span className="sp-dx-ico"><e.icono size={16} /></span><div><b>{e.k} <small>{e.peso} %</small></b><em>{e.lectura}</em></div><Medidor valor={e.val} rotulo={e.k} /><strong>{e.val} de 4</strong></div>)}
            </div>
            <ArrowRight className="sp-dx-flecha" size={22} aria-hidden="true" />
            <div className="sp-dx-dato" style={v({ "--c": "var(--navy)" })}><small>Evidencia</small><b>{p.E}</b><em>de 100</em></div>
          </div>
        </Regla>
        <Regla n={3} t="Puntaje de la práctica" d="Combina las dos lecturas: 40 % la percepción y 60 % la evidencia.">
          <div className="sp-dx-ecu" role="img" aria-label={`0,40 por ${p.P} más 0,60 por ${p.E} es igual a ${p.S}`}>
            <div className="sp-dx-dato" style={v({ "--c": MORADO })}><small>Percepción</small><b>{p.P}</b><em>× 40 %</em></div>
            <Plus size={20} aria-hidden="true" />
            <div className="sp-dx-dato" style={v({ "--c": "var(--navy)" })}><small>Evidencia</small><b>{p.E}</b><em>× 60 %</em></div>
            <Equal size={20} aria-hidden="true" />
            <div className="sp-dx-dato" data-fuerte="" style={v({ "--c": "var(--gold-fill)" })}><small>Puntaje</small><b>{p.S}</b><em>de 100</em></div>
          </div>
        </Regla>
        <Regla n={4} t="Brecha" d="Es la percepción menos la evidencia. Más de 20 puntos indican sobreestimación, porque se cree más de lo que se demuestra. Menos de −20 indican una práctica invisible, que existe y la gente no ve. Entre los dos valores, percepción y evidencia coinciden.">
          <div className="sp-dx-recta" role="img" aria-label={`Escala de 0 a 100: evidencia ${p.E}, puntaje ${p.S}, percepción ${p.P}; brecha de ${brecha} puntos`}>
            <div className="sp-dx-recta-eje"><i style={v({ "--a": `${p.E}%`, "--b": `${p.P}%` })} />
              <u style={v({ "--x": `${p.E}%`, "--c": "var(--navy)" })}><b>Evidencia {p.E}</b></u>
              <u data-abajo="" style={v({ "--x": `${p.S}%`, "--c": "var(--gold-fill)" })}><b>Puntaje {p.S}</b></u>
              <u style={v({ "--x": `${p.P}%`, "--c": MORADO })}><b>Percepción {p.P}</b></u>
            </div>
            <div className="sp-dx-ticks">{[0, 25, 50, 75, 100].map((t) => <span key={t}>{t}</span>)}</div>
          </div>
          <div className="sp-dx-zonas" role="img" aria-label={`Lectura de la brecha: ${brecha} puntos, ${lecturaBrecha(brecha).toLowerCase()}`}>
            <div><span style={v({ "--w": 80 })}>Práctica invisible</span><span style={v({ "--w": 40 })} data-ok="">Convergencia</span><span style={v({ "--w": 80 })} data-ojo="">Sobreestimación</span><u style={v({ "--x": `${(brecha + 100) / 2}%` })}><b>+{brecha}</b></u></div>
            <p><span>−100</span><span>−20</span><span>+20</span><span>+100</span></p>
          </div>
        </Regla>
        <Regla n={5} t="Nivel y meta" d="El asesor asigna el nivel de 1 a 5 con la rúbrica y se fija la meta a la que la organización quiere llegar.">
          <Escalera nombres={NIVELES.map((n) => n.name)} marcas={{ [p.nivel]: { t: "Hoy", tipo: "hoy" }, [p.meta]: { t: "Meta", tipo: "meta" } }} rotulo={`Cinco niveles de madurez; en el ejemplo, nivel ${p.nivel} hoy y meta ${p.meta}`} />
          <ol className="sp-dx-niveles">{NIVELES.map((n, i) => <li key={n.name} style={v({ "--c": `var(--n${i + 1})` })}><b>{i + 1}</b><div><strong>{n.name}</strong>{n.d}</div></li>)}</ol>
        </Regla>
        <Regla n={6} t="Índices" d="Los puntajes se promedian por frente y el índice general pondera los cuatro frentes. El resultado se lee en cinco rangos, de Inicial a Transformador.">
          <Pesos valores={M_EJ.frentes.map((f) => f.S)} />
          <ArrowDown className="sp-dx-flecha sp-dx-flecha-abajo" size={22} aria-hidden="true" />
          <Escala100 valor={M_EJ.general} rotulo="Índice general" />
        </Regla>
      </ol>
    </Sec>
  );
}

function MadResultados() {
  const E = M_EJ, cumple = E.condiciones.filter(Boolean).length;
  return (
    <Sec id="resultados" blanca kicker="Qué resultados arroja" titulo="Un informe que se lee en gráficas y termina en decisiones"
      lead="El informe de resultados reúne los niveles, las brechas, la comparación con la industria y las prioridades. Estas son sus vistas principales.">
      <Caso>Comercial Andina es una empresa ficticia de distribución, con 180 personas. Doce personas respondieron la percepción y el asesor verificó la evidencia de las 48 prácticas. Todas las cifras de esta sección son inventadas para mostrar cómo se lee el informe.</Caso>
      <div className="sp-dx-galeria">
        <Fig titulo="Índice general de madurez digital" nota="Pondera los cuatro frentes. Es la cifra con la que se compara la siguiente medición.">
          <Escala100 valor={E.general} rotulo="Índice general" />
        </Fig>
        <Fig titulo="Preparación para inteligencia artificial" nota="Cuando falta una condición, el índice tiene un tope de 59, y de 39 si hay un tratamiento irregular de datos personales.">
          <Escala100 valor={E.ia} rotulo="Preparación para inteligencia artificial" />
          <div className="sp-dx-condiciones" role="img" aria-label={`Cumple ${cumple} de las 5 condiciones mínimas`}>
            {E.condiciones.map((c, i) => <i key={i} data-on={c ? "" : undefined}>{c ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}</i>)}
            <span>Cumple {cumple} de las 5 condiciones mínimas</span>
          </div>
        </Fig>

        <Fig titulo="Dónde está cada frente y a dónde debe llegar" nota="Escala de 1 a 5. La barra es el nivel de hoy; la raya, la meta.">
          <BarrasFrentes />
          <Leyenda items={[{ color: "var(--ink)", label: "Meta", forma: "raya" }]} />
        </Fig>
        <Fig titulo="Nivel por frente y dimensión" nota="Cada casilla promedia el nivel de sus tres prácticas. En el ejemplo, la columna de datos es la más baja en los cuatro frentes.">
          <Calor />
          <div className="sp-dx-leyenda">{NIVELES.map((n, i) => <span key={n.name}><i data-forma="punto" style={v({ "--c": `var(--n${i + 1})` })} />{i + 1} · {n.name}</span>)}</div>
        </Fig>

        <Fig titulo="Percepción frente a evidencia, práctica por práctica" nota="Cada punto es una práctica. Sobre la franja, la gente cree más de lo que la evidencia sostiene; bajo la franja, la práctica existe y no se ve.">
          <Dispersion />
          <Leyenda items={FRENTES.map((f) => ({ color: f.color, label: f.corto }))} />
        </Fig>
        <Fig titulo="Percepción frente a evidencia, por frente" nota="Promedio de 0 a 100. El informe explica la causa probable de cada brecha.">
          <div className="sp-dx-mancuernas">
            {FRENTES.map((f, i) => { const d = E.frentes[i], b = d.P - d.E, lec = lecturaBrecha(b); return (
              <div key={f.name}>
                <div className="sp-dx-barras-r"><span>{f.corto}</span><span data-lectura={lec === "Convergencia" ? "ok" : "ojo"}>{lec} ({b > 0 ? "+" : "−"}{Math.abs(b)})</span></div>
                <div className="sp-dx-mancuerna" role="img" aria-label={`${f.name}: percepción ${d.P}, evidencia ${d.E}`}>
                  <i style={v({ "--a": `${Math.min(d.P, d.E)}%`, "--b": `${Math.max(d.P, d.E)}%` })} />
                  <u style={v({ "--x": `${d.E}%`, "--c": "var(--navy)" })}><b>{d.E}</b></u>
                  <u data-aro="" style={v({ "--x": `${d.P}%`, "--c": MORADO })}><b>{d.P}</b></u>
                </div>
              </div>
            ); })}
            <div className="sp-dx-ticks">{[0, 25, 50, 75, 100].map((n) => <span key={n}>{n}</span>)}</div>
          </div>
          <Leyenda items={[{ color: "var(--navy)", label: "Evidencia" }, { color: MORADO, label: "Percepción", forma: "aro" }]} />
        </Fig>

        <Fig titulo="Estado de las prácticas de cada frente" nota="Cuántas de las doce prácticas de cada frente están en cada estado, según la evidencia.">
          <div className="sp-dx-apiladas">
            {FRENTES.map((f, i) => (
              <div key={f.name}>
                <span>{f.corto}</span>
                <div role="img" aria-label={`${f.name}: ${E.frentes[i].estados.map((n, j) => `${n} ${ESTADOS[j].toLowerCase()}`).join(", ")}`}>{E.frentes[i].estados.map((n, j) => n > 0 && <i key={j} style={v({ "--w": n, "--c": `var(--n${j + 1})` })}>{n}</i>)}</div>
              </div>
            ))}
          </div>
          <div className="sp-dx-leyenda">{ESTADOS.map((e, i) => <span key={e}><i data-forma="punto" style={v({ "--c": `var(--n${i + 1})` })} />{e}</span>)}</div>
        </Fig>
        <Fig titulo="Cómo está la industria en lo mismo" nota="En el informe real, cada dato del sector lleva su fuente y su fecha, y se cruza con la práctica que le corresponde en la organización.">
          <div className="sp-dx-industria">
            {E.industria.map((x, i) => (
              <div key={x.hecho}>
                <div className="sp-dx-barras-r"><span>{x.hecho} <sup>[{i + 1}]</sup></span><span><b>{x.pct} %</b></span></div>
                <div className="sp-dx-barra sp-dx-barra-fina"><i style={v({ "--w": `${x.pct}%`, "--c": "var(--navy)" })} /></div>
                <small>Comercial Andina · {x.propio}</small>
              </div>
            ))}
          </div>
        </Fig>

        <Fig className="sp-dx-ancha" titulo="Prioridades: por dónde empezar" nota="Cada prioridad llega con la razón por la que va antes que las demás, su primer paso, el resultado esperado y su plazo. Arriba a la izquierda queda lo que más rinde con menos esfuerzo.">
          <div className="sp-dx-prior">
            <div className="sp-dx-matriz" role="img" aria-label="Matriz de impacto y esfuerzo con cinco prioridades">
              <span className="sp-dx-matriz-y">Impacto →</span>
              <div className="sp-dx-matriz-g">
                {[2, 1, 0].flatMap((imp) => [0, 1, 2].map((esf) => (
                  <div key={`${imp}-${esf}`} data-mejor={imp === 2 && esf === 0 ? "" : undefined}>{E.prioridades.filter((p) => p.imp === imp && p.esf === esf).map((p) => <b key={p.n}>{p.n}</b>)}</div>
                )))}
              </div>
              <div className="sp-dx-matriz-x">{GRADO.map((g) => <span key={g}>{g}</span>)}</div>
              <span className="sp-dx-matriz-xt">Esfuerzo →</span>
            </div>
            <ol className="sp-dx-prior-l">
              {E.prioridades.map((p) => <li key={p.n}><b>{p.n}</b><div><strong>{p.t}</strong><span>{p.plazo} · esfuerzo {GRADO[p.esf].toLowerCase()} · impacto {GRADO[p.imp].toLowerCase()}</span></div></li>)}
            </ol>
          </div>
        </Fig>

        <Fig className="sp-dx-ancha" titulo="Ruta a doce meses" nota="Tres tramos con sus hitos y seis indicadores con línea de base y meta. El informe completo se descarga en PDF.">
          <div className="sp-dx-ruta">
            <div className="sp-dx-ruta-cab" aria-hidden="true"><span />{TRAMOS.map((t) => <b key={t.t} style={v({ "--cols": t.cols, "--c": t.color })}>{t.t}</b>)}</div>
            {E.ruta.map((h) => (
              <div key={h.t} className="sp-dx-ruta-fila"><span>{h.t}</span><div role="img" aria-label={`${h.t}: ${h.a === h.b ? `mes ${h.a}` : `meses ${h.a} a ${h.b}`}`}><i style={v({ "--a": h.a, "--b": h.b + 1, "--c": TRAMOS[h.tramo].color })} /></div></div>
            ))}
            <div className="sp-dx-ruta-meses" aria-hidden="true"><span />{Array.from({ length: 12 }, (_, i) => <em key={i}>{i + 1}</em>)}</div>
          </div>
        </Fig>
      </div>

      <div className="sp-dx-citas">
        <figure><span className="sp-dx-ico"><Eye size={18} /></span><figcaption>Tu lectura personal, apenas terminas la percepción</figcaption><blockquote>«Ves más avance en la operación que en los datos. Marcaste “No lo sé” en seis afirmaciones de arquitectura: conviene llevar esas preguntas al equipo de tecnología».</blockquote></figure>
        <figure><span className="sp-dx-ico"><ScanSearch size={18} /></span><figcaption>Un hallazgo con su causa</figcaption><blockquote>«Hay sistema de clientes, pero cada área mantiene su propia hoja de cálculo porque nadie responde por la calidad del dato».</blockquote></figure>
      </div>
    </Sec>
  );
}

/* ════════════════════════════ Test de capacidades ════════════════════════════ */

const CAPS: { name: string; icono: LucideIcon; q: string; ej: string; demo: string }[] = [
  { name: "Dirección", icono: Compass, q: "¿La empresa sabe hacia dónde crecer, cómo ganar y qué priorizar?",
    ej: "¿La empresa concentra recursos en un máximo de tres prioridades estratégicas por trimestre y hace renuncias explícitas para protegerlas?", demo: "Prioridades vigentes e iniciativas aplazadas o descartadas." },
  { name: "Liderazgo", icono: Users, q: "¿Los líderes movilizan personas y construyen autonomía?",
    ej: "¿El fundador o gerente general permite que sus líderes resuelvan decisiones delegadas sin recuperarlas continuamente?", demo: "Casos recientes de decisiones resueltas sin intervención posterior del gerente." },
  { name: "Ejecución", icono: Target, q: "¿La empresa convierte sus prioridades en resultados consistentes?",
    ej: "¿Cada prioridad se traduce en un resultado medible, una fecha y un responsable único?", demo: "Plan trimestral con entregables, metas, fechas y responsables." },
  { name: "Multiplicación", icono: Layers, q: "¿La empresa puede reproducir sus resultados con menor dependencia y complejidad?",
    ej: "¿La operación y las relaciones comerciales críticas mantienen su continuidad durante la ausencia del fundador o de una persona clave?", demo: "Ausencias reales, respaldos operativos y relaciones atendidas por otros responsables." },
];
const ETAPAS = [
  { name: "Validar", q: "¿Tenemos una empresa viable o solamente una idea que logra vender?", op: "Todavía necesitamos demostrar que podemos conseguir clientes de manera sostenida con una oferta económicamente viable." },
  { name: "Sistematizar", q: "¿Podemos entregar el resultado de forma consistente, rentable y sin reinventar la operación cada vez?", op: "Ya vendemos, pero necesitamos que la operación entregue resultados consistentes, rentables y con mayor control de caja." },
  { name: "Descentralizar", q: "¿Puede la empresa tomar buenas decisiones sin que el fundador intervenga en cada una?", op: "El negocio funciona, pero demasiadas decisiones y responsabilidades siguen dependiendo del fundador o de unas pocas personas." },
  { name: "Multiplicar", q: "¿Podemos replicar lo que funciona sin aumentar proporcionalmente la complejidad, el costo y la dependencia?", op: "Tenemos una operación funcional y necesitamos reproducirla en más volumen, equipos, canales o mercados sin perder control ni rentabilidad." },
  { name: "Reinventar", q: "¿Estamos construyendo el futuro o defendiendo el modelo que nos hizo exitosos?", op: "Tenemos un negocio establecido, pero debemos renovar nuestra propuesta o nuestros motores de crecimiento para mantener relevancia." },
];
const ESCALA_T = [
  { name: "Incipiente", d: "No ocurre o depende de urgencias y esfuerzos individuales." },
  { name: "Emergente", d: "Hay intentos, pero ocurre de manera intermitente." },
  { name: "Instalada", d: "Ocurre regularmente, con un responsable y una forma de trabajo definida." },
  { name: "Gestionada", d: "Además de ocurrir, medimos su efectividad y hacemos mejoras." },
  { name: "Multiplicadora", d: "Funciona sin sus impulsores originales y se ha transferido con éxito a otros equipos o contextos." },
];
const RANGOS_T = [
  { r: "1,0 a 1,9", w: 25, t: "Capacidad incipiente", d: "Alta dependencia de personas y urgencias." },
  { r: "2,0 a 2,9", w: 25, t: "Capacidad emergente", d: "Existen avances, pero todavía hay una brecha de instalación." },
  { r: "3,0 a 3,9", w: 25, t: "Capacidad instalada", d: "Funciona regularmente, con aspectos por gestionar mejor." },
  { r: "4,0 a 4,4", w: 12.5, t: "Capacidad gestionada", d: "Se mide y mejora de forma consistente." },
  { r: "4,5 a 5,0", w: 12.5, t: "Perfil cercano a multiplicador", d: "Requiere comprobar transferencia e independencia." },
];
// Empresa ficticia. Respuestas: Dirección 4,4,4,3,3,4 · Liderazgo 2,2,3,3,3,2 · Ejecución 3,3,4,3,3,3 ·
// Multiplicación 2,3,2,3,2 y una «Sin información». Con las reglas de readTest(): Validar 4,0 y Sistematizar 3,1
// superan el umbral; Descentralizar (preguntas 7, 8, 12, 19 y 23) promedia 2,0 → etapa Descentralizar. Se
// activan dos patrones: preguntas 7 y 8 bajas, y pregunta 23 baja.
const T_EJ = {
  caps: [{ avg: 3.7, cov: 6, r: 2 }, { avg: 2.5, cov: 6, r: 1 }, { avg: 3.2, cov: 6, r: 2 }, { avg: 2.4, cov: 5, r: 1 }],
  liderazgo: [2, 2, 3, 3, 3, 2],
  recorrido: [{ avg: 4.0, pasa: true }, { avg: 3.1, pasa: true }, { avg: 2.0, pasa: false }],
  etapa: 2, senalada: 3,
  cond: "Existe una base operativa funcional, pero la concentración de decisiones limita el avance.",
  principal: { accion: "Trabajar delegación, criterio y responsabilidad.", hip: "Los líderes no están ejerciendo autonomía real.", base: "preguntas 7 y 8" },
  soporte: { accion: "Instalar respaldos y distribuir relaciones críticas.", hip: "La continuidad depende de una persona o relación concentrada.", base: "pregunta 23" },
  asesor: {
    restriccion: "Las decisiones comerciales y de operación pasan por la gerente general.",
    evidencias: "De catorce cotizaciones del último mes, doce las aprobó la gerencia. Durante sus vacaciones se aplazaron dos entregas.",
    accion: "Definir qué decide cada líder sin consulta y hasta qué monto, y revisar cada mes cuántas decisiones volvieron a la gerencia.",
    noNecesita: "Abrir la segunda sede antes de completar un trimestre de operación con decisiones delegadas.",
  },
  pendientes: "Pregunta 24",
};
const colorNota = (n: number) => (n < 3 ? "var(--n2)" : "var(--n4)");

function Radar() {
  const W = 480, H = 360, cx = 240, cy = 180, R = 122, dir = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const pt = (i: number, n: number) => [cx + dir[i][0] * ((n - 1) / 4) * R, cy + dir[i][1] * ((n - 1) / 4) * R];   // 1 en el centro, 5 en el borde
  const poli = (ns: number[]) => ns.map((n, i) => pt(i, n).join(",")).join(" ");
  const vals = T_EJ.caps.map((c) => c.avg);
  const rot = [{ x: cx, y: cy - R - 24, a: "middle" }, { x: cx + R + 12, y: cy - 4, a: "start" }, { x: cx, y: cy + R + 20, a: "middle" }, { x: cx - R - 12, y: cy - 4, a: "end" }] as const;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sp-dx-svg" role="img" aria-label={`Perfil de capacidades: ${CAPS.map((c, i) => `${c.name} ${f1(vals[i])}`).join(", ")}; umbral 3,0`}>
      {[5, 4, 3, 2].map((k) => <polygon key={k} points={poli([k, k, k, k])} fill={k === 5 ? "var(--surface-2)" : "none"} stroke="var(--line-strong)" strokeWidth="1" />)}
      {dir.map((_, i) => <line key={i} x1={cx} y1={cy} x2={pt(i, 5)[0]} y2={pt(i, 5)[1]} stroke="var(--line-strong)" />)}
      <polygon points={poli([3, 3, 3, 3])} fill="none" stroke="var(--gold-fill)" strokeWidth="2.5" strokeDasharray="6 5" />
      <polygon points={poli(vals)} fill="color-mix(in srgb, var(--navy) 18%, transparent)" stroke="var(--navy)" strokeWidth="2.5" strokeLinejoin="round" />
      {vals.map((n, i) => <circle key={i} cx={pt(i, n)[0]} cy={pt(i, n)[1]} r="6.5" fill={colorNota(n)} stroke="var(--surface)" strokeWidth="2.5" />)}
      {CAPS.map((c, i) => <g key={c.name}><text x={rot[i].x} y={rot[i].y} textAnchor={rot[i].a} fontSize="14" fontWeight="800" fill="var(--ink)">{c.name}</text><text x={rot[i].x} y={rot[i].y + 17} textAnchor={rot[i].a} fontSize="14" fontWeight="700" fill={n3(vals[i])}>{f1(vals[i])}</text></g>)}
    </svg>
  );
}
const n3 = (n: number) => (n < 3 ? "var(--warn-text)" : "var(--ok-text)");

const Franja = () => (
  <div className="sp-dx-franja-w"><ol className="sp-dx-franja">
    {ETAPAS.map((e, i) => (
      <li key={e.name} data-rol={i === T_EJ.etapa ? "etapa" : i === T_EJ.senalada ? "senalada" : undefined}>
        <b>{e.name}</b>
        {i === T_EJ.etapa && <em>Lo que muestran las respuestas</em>}
        {i === T_EJ.senalada && <em>El desafío que señaló</em>}
      </li>
    ))}
  </ol></div>
);

/** Vista de la portada: el informe del test en pequeño. */
function TestPortada() {
  return (
    <div className="sp-panel sp-dx-vista" aria-hidden="true">
      <div className="sp-panel-top"><div><strong>Informe de una página</strong><small>Ingeniería del Valle · empresa ficticia</small></div><span className="sp-chip sp-chip-oro">Datos de ejemplo</span></div>
      <div className="sp-dx-vista-c">
        <div><small>Perfil de capacidades · umbral 3,0</small><Radar /></div>
        <div><small>Etapa y desafío señalado</small><Franja /></div>
      </div>
    </div>
  );
}

function TestMide() {
  return (
    <Sec id="mide" kicker="Qué mide" titulo="Cuatro capacidades y el desafío que hoy domina"
      lead="Veinticuatro preguntas, seis por cada capacidad, describen cómo funciona hoy la empresa. La pregunta veinticinco te pide señalar el desafío que consideras más urgente.">
      <div className="sp-dx-caps">
        {CAPS.map((c, i) => (
          <article key={c.name} className="sp-dx-cap">
            <div className="sp-dx-cap-cab"><span className="sp-dx-ico sp-dx-ico-g"><c.icono size={22} /></span><div className="sp-dx-seis" role="img" aria-label="Seis preguntas">{[1, 2, 3, 4, 5, 6].map((n) => <i key={n}>{i * 6 + n}</i>)}</div></div>
            <h3>{c.name}</h3>
            <p className="sp-dx-cap-q">{c.q}</p>
            <div className="sp-dx-cap-ej"><small>Una de sus seis preguntas</small><p>{c.ej}</p></div>
            <div className="sp-dx-cap-demo"><small>Lo que la demostraría</small><p>{c.demo}</p></div>
          </article>
        ))}
      </div>
      <p className="sp-dx-p sp-dx-p-suelta">Cada pregunta trae la evidencia que la demostraría. Para responder, elige la nota que puedas sostener con ejemplos concretos de los últimos seis meses; si no tienes cómo saberlo, marca «Sin información».</p>

      <h3 className="sp-dx-h3">La pregunta veinticinco: el desafío dominante</h3>
      <p className="sp-dx-p">Eliges una entre cinco descripciones. Cada una corresponde a una etapa por la que pasa una empresa al crecer, y cada etapa tiene su pregunta de fondo.</p>
      <Fig ejemplo={false} titulo="Las cinco etapas y la pregunta que resuelve cada una" className="sp-dx-arriba">
        <Escalera tono="navy" nombres={ETAPAS.map((e) => e.name)} rotulo={`Cinco etapas en ascenso: ${ETAPAS.map((e) => e.name).join(", ")}`} />
        <ol className="sp-dx-etapas">
          {ETAPAS.map((e, i) => <li key={e.name}><span>{i + 1}</span><h4>{e.name}</h4><p className="sp-dx-etapa-q">{e.q}</p><p className="sp-dx-etapa-op">«{e.op}»</p></li>)}
        </ol>
      </Fig>
    </Sec>
  );
}

function TestCalculo() {
  const E = T_EJ, lid = E.caps[1];
  return (
    <Sec id="calculo" kicker="Cómo se calcula" titulo="Un promedio por capacidad y un umbral: 3,0"
      lead="El resultado sale de reglas fijas, las mismas para todas las empresas. El ejemplo sigue las respuestas de una empresa ficticia.">
      <ol className="sp-dx-reglas">
        <Regla n={1} t="Cada pregunta, de 1 a 5" d="Eliges el nivel que puedas sostener con ejemplos. «Sin información» no cuenta como nota baja: la pregunta queda pendiente de verificar.">
          <Escalera nombres={ESCALA_T.map((n) => n.name)} rotulo={`Escala de respuesta de 1 a 5: ${ESCALA_T.map((n) => n.name).join(", ")}`} />
          <ol className="sp-dx-niveles">{ESCALA_T.map((n, i) => <li key={n.name} style={v({ "--c": `var(--n${i + 1})` })}><b>{i + 1}</b><div><strong>{n.name}</strong>{n.d}</div></li>)}</ol>
        </Regla>
        <Regla n={2} t="Promedio por capacidad" d="Se promedian las preguntas respondidas de cada capacidad. La cobertura indica cuántas de las seis se respondieron; con menos de cinco, la capacidad no se informa.">
          <div className="sp-dx-flujo">
            <div className="sp-dx-respuestas" role="img" aria-label={`Respuestas de liderazgo: ${E.liderazgo.join(", ")}`}>
              <small>Liderazgo · preguntas 7 a 12</small>
              <div>{E.liderazgo.map((n, i) => <i key={i} style={v({ "--c": colorNota(n) })}>{n}</i>)}</div>
              <em>Cobertura {lid.cov} de 6</em>
            </div>
            <ArrowRight className="sp-dx-flecha" size={22} aria-hidden="true" />
            <div className="sp-dx-dato" style={v({ "--c": colorNota(lid.avg) })}><small>Promedio</small><b>{f1(lid.avg)}</b><em>de 5</em></div>
          </div>
        </Regla>
        <Regla n={3} t="El umbral" d="Por debajo de 3,0 la capacidad todavía no está instalada. El promedio se lee en cinco rangos.">
          <div className="sp-dx-eje15" role="img" aria-label={`Escala de 1 a 5 con umbral en 3,0; liderazgo está en ${f1(lid.avg)}`}>
            <div>{RANGOS_T.map((r, i) => <i key={r.r} style={v({ "--w": r.w, "--c": `var(--n${i + 1})` })} />)}<s style={v({ "--x": x5(3) })}><b>Umbral 3,0</b></s><u style={v({ "--x": x5(lid.avg) })}><b>Liderazgo {f1(lid.avg)}</b></u></div>
            <div className="sp-dx-ticks">{[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}</div>
          </div>
          <ol className="sp-dx-rangos">{RANGOS_T.map((r, i) => <li key={r.r} style={v({ "--c": `var(--n${i + 1})` })}><b>{r.r}</b><div><strong>{r.t}</strong>{r.d}</div></li>)}</ol>
        </Regla>
        <Regla n={4} t="La etapa" d="Los desafíos se recorren en orden: validar, sistematizar, descentralizar y multiplicar. La etapa de la empresa es el primero cuyas preguntas orientadoras promedian menos de 3,0.">
          <ol className="sp-dx-recorrido">
            {ETAPAS.slice(0, 4).map((e, i) => { const r = E.recorrido[i], estado = !r ? "despues" : r.pasa ? "pasa" : "aqui"; return (
              <li key={e.name} data-estado={estado}>
                <i aria-hidden="true">{estado === "pasa" ? <Check size={16} strokeWidth={3} /> : estado === "aqui" ? <X size={16} strokeWidth={3} /> : <Circle size={12} />}</i>
                <span>{e.name}</span>
                {r ? <><b>{f1(r.avg)}</b><em>{r.pasa ? "Supera 3,0" : "Bajo 3,0: esta es la etapa"}</em></> : <em>No se evalúa todavía</em>}
              </li>
            ); })}
          </ol>
        </Regla>
        <Regla n={5} t="El contraste" d="La etapa que muestran las respuestas se compara con el desafío que señalaste en la pregunta veinticinco. Cuando no coinciden, esa diferencia es el primer tema de conversación.">
          <Franja />
        </Regla>
        <Regla n={6} t="Las prioridades" d="Ciertas combinaciones de respuestas bajas activan una hipótesis con su acción. El informe muestra como máximo dos, y primero las que pertenecen a la etapa.">
          <div className="sp-dx-patron">
            <div><small>Respuestas</small><p>Preguntas 7 y 8, ambas en 2</p></div>
            <ArrowRight className="sp-dx-flecha" size={20} aria-hidden="true" />
            <div><small>Hipótesis</small><p>{E.principal.hip}</p></div>
            <ArrowRight className="sp-dx-flecha" size={20} aria-hidden="true" />
            <div data-fuerte=""><small>Acción</small><p>{E.principal.accion}</p></div>
          </div>
        </Regla>
      </ol>
    </Sec>
  );
}

function TestResultados() {
  const E = T_EJ, et = ETAPAS[E.etapa], se = ETAPAS[E.senalada];
  return (
    <Sec id="resultados" blanca kicker="Qué resultados arroja" titulo="Una página que dice dónde está la empresa y qué verificar primero"
      lead="El informe cabe en una hoja para que se pueda leer en una reunión. Estas son sus partes.">
      <Caso>Ingeniería del Valle es una empresa ficticia de servicios, con 60 personas. La gerente general respondió el test con el objetivo de abrir una segunda sede y crecer 30 % en ventas en doce meses, y señaló «Multiplicar» como su desafío. Todas las cifras de esta sección son inventadas para mostrar cómo se lee el informe.</Caso>
      <div className="sp-dx-galeria">
        <Fig className="sp-dx-ancha" titulo="Perfil de capacidades" nota="Promedio de 1 a 5 y cobertura de cada capacidad. El umbral es 3,0; liderazgo y multiplicación quedan por debajo.">
          <div className="sp-dx-perfil">
            <Radar />
            <div className="sp-dx-barras">
              {CAPS.map((c, i) => { const d = E.caps[i]; return (
                <div key={c.name}>
                  <div className="sp-dx-barras-r"><span>{c.name}</span><span><b>{f1(d.avg)}</b> · {d.cov} de 6</span></div>
                  <div className="sp-dx-barra" role="img" aria-label={`${c.name}: promedio ${f1(d.avg)}, cobertura ${d.cov} de 6`}><i style={v({ "--w": x5(d.avg), "--c": colorNota(d.avg) })} /><u style={v({ "--x": x5(3) })} /></div>
                  <small>{RANGOS_T[d.r].t}. {RANGOS_T[d.r].d}</small>
                </div>
              ); })}
              <div className="sp-dx-ticks">{[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}</div>
              <Leyenda items={[{ color: "var(--ink)", label: "Umbral 3,0", forma: "raya" }, { color: "var(--n4)", label: "Sobre el umbral" }, { color: "var(--n2)", label: "Bajo el umbral" }]} />
            </div>
          </div>
        </Fig>

        <Fig className="sp-dx-ancha" titulo="La etapa y el desafío señalado" nota="La gerencia quiere multiplicar. Sus respuestas muestran que antes hay que descentralizar: abrir la segunda sede con las decisiones concentradas multiplicaría la dependencia.">
          <Escalera tono="navy" nombres={ETAPAS.map((e) => e.name)} marcas={{ [E.etapa + 1]: { t: "Las respuestas", tipo: "hoy" }, [E.senalada + 1]: { t: "Lo que señaló", tipo: "meta" } }} rotulo={`Cinco etapas; las respuestas muestran ${et.name} y la gerencia señaló ${se.name}`} />
          <p className="sp-dx-cita">{et.name}: {et.q}</p>
        </Fig>

        <Fig className="sp-dx-ancha" titulo="El informe de una página" nota="El informe también trae el perfil de capacidades y la franja de etapas. Se imprime o se guarda en PDF.">
          <div className="sp-dx-hoja">
            <header><div><small>Test de capacidades · informe de una página</small><strong>Ingeniería del Valle</strong><span>Gerente general</span></div><div><small>Objetivo de crecimiento a doce meses</small><span>Abrir una segunda sede y crecer 30 % en ventas</span></div></header>
            <div className="sp-dx-hoja-c">
              <div><small>Etapa predominante</small><p><b>{et.name}.</b> {E.cond} En la pregunta 25 señaló un desafío propio de {se.name}: ambas quedan como hipótesis.</p></div>
              <div><small>Prioridad principal</small><p><b>{E.principal.accion}</b> {E.principal.hip} <i>({E.principal.base})</i></p></div>
              <div data-asesor=""><small>Principal restricción</small><p>{E.asesor.restriccion}</p></div>
              <div><small>Prioridad de soporte</small><p><b>{E.soporte.accion}</b> {E.soporte.hip} <i>({E.soporte.base})</i></p></div>
              <div data-asesor=""><small>Evidencias que la sostienen</small><p>{E.asesor.evidencias}</p></div>
              <div data-asesor=""><small>Acción a 90 días</small><p>{E.asesor.accion}</p></div>
              <div data-asesor=""><small>Qué no necesita ahora</small><p>{E.asesor.noNecesita}</p></div>
              <div><small>Pendientes de verificación</small><p>{E.pendientes}. Una práctica declarada y no demostrada queda como máximo en nivel 2.</p></div>
            </div>
            <footer><span><i />Lo calcula la plataforma con tus respuestas</span><span data-asesor=""><i />Lo completa el asesor contigo, al verificar la evidencia</span></footer>
          </div>
        </Fig>
      </div>
    </Sec>
  );
}

type Bloques = { portada: () => ReactNode; mide: () => ReactNode; calculo: () => ReactNode; resultados: () => ReactNode };
export const SECCIONES: Record<string, Bloques> = {
  "madurez-digital": { portada: MadPortada, mide: MadMide, calculo: MadCalculo, resultados: MadResultados },
  "test-de-capacidades": { portada: TestPortada, mide: TestMide, calculo: TestCalculo, resultados: TestResultados },
};
