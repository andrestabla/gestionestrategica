// Sitio público (/): lo que ve quien llega sin sesión. Componente de servidor,
// sin JavaScript propio. Presenta la plataforma por lo que hace (estrategia,
// priorización en sesión, gestión de proyectos, inteligencia), sin nombrar el
// método ni su mapa. Las vistas son ilustrativas, con datos de ejemplo que
// cumplen las reglas reales de la matriz de priorización.

import Link from "next/link";
import { ArrowDown, ArrowRight, Building2, Check, ExternalLink, FileDown, History, Paperclip, Presentation, Radio, Scale, ShieldCheck, Smartphone, Target, UsersRound } from "lucide-react";
import { DESARROLLADO_POR, MarcaGE } from "@/components/logo";
import { CRITERIA, LEVEL_NAMES, type Level } from "@/lib/priorizacion";
import "./sitio.css";

/** Correo de contacto. Pendiente de confirmar con el dueño del producto. */
const CONTACTO = "hola@algoritmot.com";
const correo = (asunto: string) => `mailto:${CONTACTO}?subject=${encodeURIComponent(asunto)}`;
const DEMO = correo("Demostración de Gestión estratégica");

// Dos puertas de entrada. El acceso no es abierto: se habilita después de un primer contacto.
const ENTRADAS = [
  { t: "Diagnóstico de madurez en transformación digital", d: "Mide el nivel de madurez digital de la organización frente a referentes reconocidos y entrega hallazgos, recomendaciones y la evidencia que los respalda.", a: "Acceso al diagnóstico de madurez en transformación digital" },
  { t: "Test de capacidades", d: "Veinticinco preguntas sobre cómo funciona la empresa. El resultado es un informe de una página con la lectura de sus capacidades y el desafío que domina hoy.", a: "Acceso al test de capacidades" },
];

const es = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
const v = (o: Record<string, string | number>) => o as React.CSSProperties;
/** Puntaje de la matriz: (40·D + 30·E + 20·M + 10·L) ÷ 4. */
const puntaje = (n: Level[]) => CRITERIA.reduce((s, c, i) => s + c.weight * n[i], 0) / 4;

// Ejemplo de portafolio. El orden y las decisiones siguen la regla: compiten las
// que tienen impacto 3 o 4; con capacidad 1 o 2 primero se prepara.
const EJEMPLO: { nombre: string; n: Level[]; decision: string; chip: string }[] = [
  { nombre: "Modelo de servicio posventa", n: [4, 4, 3, 2], decision: "Preparar", chip: "sp-chip-oro" },
  { nombre: "Expansión del canal digital", n: [4, 3, 3, 3], decision: "Implementar", chip: "sp-chip-ok" },
  { nombre: "Tablero de indicadores del comité", n: [3, 3, 2, 4], decision: "Implementar", chip: "sp-chip-ok" },
  { nombre: "Rediseño de la intranet", n: [2, 2, 2, 3], decision: "Backlog", chip: "sp-chip-gris" },
];

const AVANCE = [["Canal digital", 72], ["Tablero del comité", 88], ["Servicio posventa", 45]] as const;

const AREAS = [
  { t: "Estrategia", d: "Prioridades, objetivos y resultados clave ligados entre sí.", h: "#ruta" },
  { t: "Priorización", d: "El comité califica y decide en sesión, con una misma regla.", h: "#sesion" },
  { t: "Proyectos", d: "Cada iniciativa aprobada, con tareas, fechas y evidencia.", h: "#proyectos" },
  { t: "Inteligencia", d: "El sector y el mercado en datos con fuente.", h: "#inteligencia" },
];

const PASOS = [
  { t: "Diagnosticar", d: "Un diagnóstico de capacidades con tres fuentes muestra el punto de partida: autoevaluación del equipo directivo, percepción anónima de los equipos y evidencia verificada.", s: "Brechas y punto de partida" },
  { t: "Elegir", d: "El comité define pocas prioridades estratégicas y los objetivos que responden a cada una. Un objetivo sin prioridad no entra al portafolio.", s: "Prioridades y objetivos" },
  { t: "Medir", d: "Cada objetivo se concreta en resultados clave con línea base, meta y fecha. La validación asistida por IA señala lo que le falta a cada formulación.", s: "Resultados clave" },
  { t: "Priorizar", d: "El comité califica las iniciativas con cuatro criterios. El puntaje ordena y el comité decide: implementar, preparar, aplazar o renunciar.", s: "Matriz y portafolio" },
  { t: "Cumplir", d: "Lo aprobado baja al trimestre y a un plan de trabajo con tareas, responsables y evidencia. El informe ejecutivo muestra el avance en cada corte.", s: "Cascada y proyectos" },
];

// ── gestión de proyectos (vista ilustrativa; «hoy» es el 10 de noviembre) ──
const RASGOS_GP = [
  ["Tablero por estados.", "Por hacer, en curso, en revisión, bloqueada y hecha."],
  ["Cronograma con línea base.", "Cada reprogramación se mide contra la fecha comprometida."],
  ["Dependencias.", "Al reprogramar una tarea se pueden correr las que dependen de ella."],
  ["Cierre con evidencia.", "Una tarea pasa a «Hecha» solo con su soporte adjunto."],
  ["Carga por persona.", "Tareas abiertas, vencidas y próximas a vencer de cada responsable."],
  ["Alertas e historial.", "Vencimientos, bloqueos y el registro de cada cambio."],
];
type Tarea = { t: string; q: string; f: string; ev?: boolean; tarde?: boolean };
const TABLERO: { col: string; tareas: Tarea[] }[] = [
  { col: "Por hacer", tareas: [{ t: "Definir la pauta de lanzamiento", q: "PO", f: "21 nov" }, { t: "Capacitar al equipo de ventas", q: "CR", f: "5 dic" }] },
  { col: "En curso", tareas: [{ t: "Integrar la pasarela de pagos", q: "LM", f: "7 nov", tarde: true }, { t: "Publicar el catálogo en línea", q: "PO", f: "18 nov" }] },
  { col: "En revisión", tareas: [{ t: "Política de devoluciones", q: "CR", f: "14 nov", ev: true }] },
  { col: "Hecha", tareas: [{ t: "Selección del proveedor", q: "LM", f: "31 oct", ev: true }, { t: "Estudio de demanda", q: "PO", f: "24 oct", ev: true }] },
];
const CRONO = [
  { t: "Pasarela de pagos", b: [22, 26], a: [22, 38], d: "+6 d" },
  { t: "Catálogo en línea", b: [34, 30], a: [34, 30], d: "en fecha" },
  { t: "Política de devoluciones", b: [40, 22], a: [40, 22], d: "en fecha" },
  { t: "Capacitación de ventas", b: [62, 24], a: [70, 24], d: "+6 d" },
];
const CARGA = [
  { q: "LM", n: "Laura Méndez", d: "1 abierta · 1 vencida", w: 34, mal: true },
  { q: "PO", n: "Paula Ortiz", d: "2 abiertas", w: 66 },
  { q: "CR", n: "Carlos Rueda", d: "2 abiertas", w: 66 },
];

// ── inteligencia (vista ilustrativa) ──
const RASGOS_BI = [
  ["Posición en el sector.", "Ingresos, crecimiento y margen de la empresa frente a las sociedades que reportan."],
  ["Competencia.", "Pares, rankings y concentración del sector."],
  ["Territorio.", "Dónde está el sector y dónde hay demanda por cubrir."],
  ["Señales del entorno.", "Regulación, mercado, macroeconomía y demanda; cada hecho con su fuente."],
];
// Nube de sociedades del sector: generador fijo para que la figura no cambie entre cargas.
const NUBE = (() => {
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 58 }, () => ({ x: 34 + ((r() + r() + r()) / 3) * 452, y: 24 + ((r() + r()) / 2) * 232, g: 3 + r() * 3.4 }));
})();
const EMPRESA = { x: 356, y: 92 };
const SENALES = [
  ["Regulación", "Cambio normativo con efecto en precios"],
  ["Mercado", "Entrada de un competidor regional"],
  ["Macro", "Variación de la tasa de cambio"],
];

const INCLUYE = [
  ["Diagnóstico de capacidades", "Tres fuentes y una lectura de brechas para saber de dónde se parte."],
  ["Benchmark sectorial", "La empresa frente a su sector, con datos abiertos de estados financieros."],
  ["Prioridades y objetivos", "Pocas prioridades estratégicas y los objetivos directivos que responden a cada una."],
  ["Resultados clave e indicadores", "Línea base, meta, fecha y responsable, con su tablero de seguimiento."],
  ["Iniciativas", "Formuladas con alcance, fechas, presupuesto y el resultado clave que mueven."],
  ["Matriz de priorización", "Una misma regla para todo el comité: impacto, evidencia, sostenibilidad y capacidad."],
  ["Portafolio", "Las decisiones de tiempo por horizonte: implementar, preparar, backlog o renunciar."],
  ["Capacidades para ejecutar", "Lo que hay que resolver antes de implementar lo que se aprobó."],
  ["Cascada trimestral", "Del año al trimestre, con compromisos y responsables."],
  ["Gestión de proyectos", "Tablero, cronograma con línea base, dependencias y carga por persona."],
  ["Inteligencia", "El sector, la competencia y el territorio en datos con fuente."],
  ["Informe ejecutivo", "El estado de la estrategia en un documento, con descargas en PDF, Word y Excel."],
];

const ROLES = [
  { icon: Target, t: "Comité directivo", d: "Decide con la misma regla y ve el avance de lo que aprobó.", l: ["Define prioridades y objetivos", "Califica iniciativas desde el celular", "Toma las decisiones de tiempo"] },
  { icon: Presentation, t: "Advisor", d: "Conduce el proceso y deja el registro de cada decisión.", l: ["Facilita las sesiones de trabajo", "Revisa la formulación antes de calificar", "Verifica las evidencias"] },
  { icon: UsersRound, t: "Líderes y responsables", d: "Reciben lo aprobado con fechas y reportan su avance.", l: ["Resultados clave e iniciativas a cargo", "Tareas y proyectos del trimestre", "Evidencia de cada entrega"] },
];

const SECCIONES = [["#ruta", "La ruta"], ["#sesion", "En sesión"], ["#proyectos", "Proyectos"], ["#inteligencia", "Inteligencia"], ["#plataforma", "Plataforma"]];

/** Anillos concéntricos del isotipo: uno de cada tres en dorado. */
function Anillos({ cx, cy, n = 12, paso = 104 }: { cx: number; cy: number; n?: number; paso?: number }) {
  return (
    <svg className="sp-anillos" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={cx} cy={cy} r={130 + i * paso} fill="none"
          stroke={i % 3 === 0 ? "#F1BA5B" : "#FFFFFF"} strokeOpacity={i % 3 === 0 ? 0.3 : 0.075} strokeWidth={i % 3 === 0 ? 1.4 : 1} />
      ))}
    </svg>
  );
}

function Rasgos({ items }: { items: string[][] }) {
  return (
    <ul className="sp-rasgos">
      {items.map(([t, d]) => <li key={t}><Check size={17} strokeWidth={2.6} /><span><b>{t}</b> {d}</span></li>)}
    </ul>
  );
}

export function SitioPublico() {
  const anio = new Date().getFullYear();
  return (
    <div className="sp">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>

      <header className="sp-top">
        <div className="sp-wrap sp-top-in">
          <Link href="/" aria-label="Gestión estratégica, inicio"><MarcaGE oscura firma={false} alto="32px" /></Link>
          <nav className="sp-nav" aria-label="Secciones">
            {SECCIONES.map(([h, t]) => <a key={h} href={h}>{t}</a>)}
          </nav>
          <Link href="/login" className="sp-btn sp-btn-linea sp-btn-chico">Iniciar sesión</Link>
        </div>
      </header>

      <main id="contenido">
        {/* ── portada ── */}
        <section className="sp-hero">
          <Anillos cx={1080} cy={410} />
          <div className="sp-wrap sp-hero-in">
            <div>
              <span className="sp-kicker rise" style={{ color: "var(--gold-fill)" }}>Plataforma de gestión estratégica</span>
              <h1 className="sp-h1 rise rise-1"><span>De la estrategia</span> <span><i>declarada</i></span> <span>a la estrategia</span> <span><em>cumplida</em>.</span></h1>
              <p className="sp-hero-p rise rise-2">
                Gestión estratégica acompaña al comité directivo desde las prioridades hasta el seguimiento de cada proyecto.
                Objetivos, resultados clave e iniciativas se deciden con una misma regla y quedan a la vista de todos.
              </p>
              <div className="sp-cta rise rise-3">
                <a href={DEMO} className="sp-btn sp-btn-oro">Solicitar una demostración <ArrowRight size={17} strokeWidth={2.4} /></a>
                <Link href="/login" className="sp-btn sp-btn-linea">Iniciar sesión</Link>
              </div>
            </div>

            <figure className="sp-vista rise rise-2" role="img"
              aria-label="Vista ilustrativa de la matriz de priorización: cuatro iniciativas ordenadas por puntaje, con su decisión de implementar, preparar o dejar en backlog.">
              <div className="sp-flota sp-flota-b" aria-hidden="true">
                <h4>Avance de proyectos</h4>
                <div className="sp-caps">
                  {AVANCE.map(([c, p]) => <div key={c}>{c}<span>{p} %</span><i style={v({ "--w": `${p}%` })} /></div>)}
                </div>
              </div>
              <div className="sp-panel" aria-hidden="true">
                <div className="sp-panel-top">
                  <div><strong>Priorización</strong><small>Horizonte 1 · comité directivo</small></div>
                  <span className="sp-vivo"><i />En vivo</span>
                </div>
                <div className="sp-fila sp-cab"><span>#</span><span>Iniciativa y puntaje</span><span>Decisión</span></div>
                {EJEMPLO.map((x, i) => {
                  const p = puntaje(x.n), compite = x.n[0] >= 3;
                  return (
                    <div className="sp-fila" key={x.nombre}>
                      <span className="sp-pos">{compite ? i + 1 : "–"}</span>
                      <div className="sp-ini">
                        <b>{x.nombre}</b>
                        <div className={`sp-barra${compite ? "" : " sp-tenue"}`}><i style={v({ "--w": `${p}%` })} /><span>{es(p)}</span></div>
                      </div>
                      <div className="sp-fin">
                        <div className="sp-niveles">{x.n.map((n, j) => <i key={j} data-n={n} title={CRITERIA[j].short}>{n}</i>)}</div>
                        <span className={`sp-chip ${x.chip}`}>{x.decision}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="sp-panel-pie">Puntaje = (40·Impacto + 30·Evidencia + 20·Sostenibilidad + 10·Capacidad) ÷ 4</div>
              </div>
              <div className="sp-flota sp-flota-a" aria-hidden="true">
                <h4>Calificaciones recibidas</h4>
                <div className="sp-quorum"><b>9</b><span>de 10 directivos</span></div>
                <div className="sp-puntos">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i === 9 ? "sp-falta" : undefined} />)}</div>
              </div>
              <figcaption className="sp-nota-fig">Vista ilustrativa con datos de ejemplo</figcaption>
            </figure>
          </div>
        </section>

        {/* ── cuatro frentes ── */}
        <section className="sp-areas" aria-label="Lo que resuelve la plataforma">
          <div className="sp-wrap sp-areas-in">
            {AREAS.map((a, i) => (
              <a className="sp-area" href={a.h} key={a.t}>
                <code>0{i + 1}</code>
                <b>{a.t}<ArrowDown size={18} strokeWidth={2.4} /></b>
                <span>{a.d}</span>
              </a>
            ))}
          </div>
        </section>

        {/* ── la ruta ── */}
        <section id="ruta" className="sp-sec sp-oscura">
          <div className="sp-wrap">
            <span className="sp-kicker">La ruta</span>
            <h2 className="sp-h2">Cinco pasos, del diagnóstico al trimestre.</h2>
            <p className="sp-lead">Cada paso deja una decisión registrada y habilita el siguiente. Nada se califica sin estar ligado a un resultado clave.</p>
            <ol className="sp-ruta">
              {PASOS.map((p, i) => (
                <li className="sp-paso" key={p.t} style={v({ "--i": i })}>
                  <span className="sp-paso-n">0{i + 1}</span>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                  <small>{p.s}</small>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── en sesión ── */}
        <section id="sesion" className="sp-sec sp-blanca">
          <div className="sp-wrap sp-sesion">
            <div>
              <span className="sp-kicker">En sesión</span>
              <h2 className="sp-h2">Hecha para la sala donde se decide.</h2>
              <p className="sp-lead">
                En las sesiones de trabajo, cada directivo califica desde su celular y el consolidado aparece en pantalla en segundos.
                La conversación se concentra donde hay desacuerdo.
              </p>
              <ul className="sp-puntos-clave">
                <li><span className="sp-ico"><Smartphone size={20} /></span><div><b>Una calificación por persona</b><span>Cada miembro del comité califica una vez cada iniciativa, con la guía de cada nivel a la vista.</span></div></li>
                <li><span className="sp-ico"><Radio size={20} /></span><div><b>Consolidado en vivo</b><span>El promedio por criterio y el puntaje se actualizan cada pocos segundos, sin recargar.</span></div></li>
                <li><span className="sp-ico"><Scale size={20} /></span><div><b>Aviso de bajo consenso</b><span>Si las calificaciones se separan más de 15 puntos, la plataforma lo marca para conversarlo antes de decidir.</span></div></li>
              </ul>
            </div>

            <figure className="sp-escena sp-ver" role="img"
              aria-label="Vista ilustrativa: un directivo califica una iniciativa en el celular y la pantalla de la sala muestra el consolidado con el nivel de consenso.">
              <div className="sp-celular" aria-hidden="true">
                <div className="sp-pantalla">
                  <h4>Calificar iniciativa</h4>
                  <h5>Expansión del canal digital</h5>
                  {CRITERIA.map((c, j) => {
                    const sel = EJEMPLO[1].n[j];
                    return (
                      <div className="sp-criterio" key={c.key}>
                        <div>{c.short}<span>{c.weight}</span></div>
                        <div className="sp-seg">{([1, 2, 3, 4] as Level[]).map((n) => <i key={n} className={n === sel ? "sp-on" : undefined}>{n}</i>)}</div>
                        <small>{LEVEL_NAMES[sel]}</small>
                      </div>
                    );
                  })}
                  <div className="sp-enviar">Enviar calificación</div>
                </div>
              </div>
              <div className="sp-consol" aria-hidden="true">
                <div className="sp-consol-cab"><strong>Consolidado del comité</strong><span className="sp-vivo"><i />En vivo</span></div>
                <div className="sp-consol-item">
                  <div><b>Expansión del canal digital</b><em>{es(puntaje(EJEMPLO[1].n))}</em></div>
                  <div className="sp-eje">{[77.5, 80, 82.5, 85, 85, 85, 87.5, 87.5, 90, 90].map((p, i) => <i key={i} style={v({ "--x": `${((p - 25) / 75) * 100}%` })} />)}</div>
                  <div className="sp-eje-pie"><span>25 — 100</span><span className="sp-chip sp-chip-ok">Con consenso</span></div>
                </div>
                <div className="sp-consol-item">
                  <div><b>Rediseño de la intranet</b><em>{es(puntaje(EJEMPLO[3].n))}</em></div>
                  <div className="sp-eje sp-disperso">{[37.5, 42.5, 45, 50, 52.5, 55, 57.5, 60, 62.5, 62.5].map((p, i) => <i key={i} style={v({ "--x": `${((p - 25) / 75) * 100}%` })} />)}</div>
                  <div className="sp-eje-pie"><span>25 — 100</span><span className="sp-chip sp-chip-warn">Bajo consenso · 25 puntos</span></div>
                </div>
              </div>
            </figure>
          </div>
        </section>

        {/* ── gestión de proyectos ── */}
        <section id="proyectos" className="sp-sec">
          <div className="sp-wrap">
            <div className="sp-doble">
              <div>
                <span className="sp-kicker">Gestión de proyectos</span>
                <h2 className="sp-h2">Cada iniciativa aprobada tiene su plan de trabajo.</h2>
                <p className="sp-lead">Lo que el comité decide implementar se convierte en tareas con responsable, fechas y evidencia. El avance se sigue por iniciativa y por persona.</p>
              </div>
              <Rasgos items={RASGOS_GP} />
            </div>

            <figure className="sp-gp sp-ver" role="img"
              aria-label="Vista ilustrativa del gestor de proyectos: tablero de tareas por estado, cronograma comparado con la línea base y carga de trabajo por persona.">
              <div aria-hidden="true">
                <div className="sp-gp-top">
                  <div><strong>Expansión del canal digital</strong><small>Plan de trabajo de la iniciativa</small></div>
                  <div className="sp-tabs"><span className="sp-on">Tablero</span><span>Cronograma</span><span>Personas</span></div>
                </div>
                <div className="sp-gp-stats">
                  <div><b>7</b><span>Tareas</span></div>
                  <div><b className="sp-mal">1</b><span>Vencida</span></div>
                  <div><b>3</b><span>Vencen en 14 días</span></div>
                  <div><b>2</b><span>Hechas con evidencia</span></div>
                </div>
                <div className="sp-gp-cuerpo">
                  <div className="sp-kanban">
                    {TABLERO.map((c) => (
                      <div className="sp-col" key={c.col}>
                        <h5>{c.col}<span>{c.tareas.length}</span></h5>
                        {c.tareas.map((t) => (
                          <div className={`sp-tarea${t.tarde ? " sp-tarde" : ""}${c.col === "Hecha" ? " sp-hecha" : ""}`} key={t.t}>
                            <b>{t.t}</b>
                            <div className="sp-tarea-pie">
                              <span className="sp-ava">{t.q}</span>
                              {t.ev && <Paperclip size={13} />}
                              {t.tarde && <span className="sp-chip sp-chip-bad">Vencida</span>}
                              <time>{t.f}</time>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="sp-lado">
                    <div>
                      <h5>Cronograma frente a la línea base</h5>
                      <div className="sp-gantt">
                        {CRONO.map((c) => (
                          <div key={c.t} className={c.d === "en fecha" ? undefined : "sp-tarde"}>
                            <span>{c.t}<em>{c.d}</em></span>
                            <i style={v({ "--b0": `${c.b[0]}%`, "--bw": `${c.b[1]}%`, "--a0": `${c.a[0]}%`, "--aw": `${c.a[1]}%` })} />
                          </div>
                        ))}
                      </div>
                      <p className="sp-leyenda"><i className="sp-l-base" />Línea base<i className="sp-l-vig" />Vigente</p>
                    </div>
                    <div>
                      <h5>Carga por persona</h5>
                      <div className="sp-carga">
                        {CARGA.map((c) => (
                          <div key={c.q}>
                            <span className="sp-ava">{c.q}</span>
                            <div><b>{c.n}</b><small className={c.mal ? "sp-mal" : undefined}>{c.d}</small></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <figcaption className="sp-nota-fig sp-nota-clara">Vista ilustrativa con datos de ejemplo</figcaption>
            </figure>
          </div>
        </section>

        {/* ── inteligencia ── */}
        <section id="inteligencia" className="sp-sec sp-oscura sp-honda">
          <div className="sp-wrap">
            <div className="sp-doble">
              <div>
                <span className="sp-kicker">Inteligencia</span>
                <h2 className="sp-h2">El sector y el mercado, con cifras que declaran su fuente.</h2>
                <p className="sp-lead">Inteligencia sistematiza datos abiertos de entidades públicas y ubica a la empresa en cada lectura, para decidir con contexto.</p>
              </div>
              <Rasgos items={RASGOS_BI} />
            </div>

            <figure className="sp-bi sp-ver" role="img"
              aria-label="Vista ilustrativa de Inteligencia: la empresa ubicada entre las sociedades de su sector por crecimiento y margen operacional, con cifras del sector y señales del entorno.">
              <div aria-hidden="true">
                <div className="sp-gp-top">
                  <div><strong>Inteligencia del sector</strong><small>Corte anual · datos abiertos</small></div>
                  <div className="sp-tabs"><span className="sp-on">Resumen</span><span>Competencia</span><span>Territorio</span><span>Señales</span></div>
                </div>
                <div className="sp-bi-cuerpo">
                  <div className="sp-disp">
                    <h5>Crecimiento frente a margen operacional</h5>
                    <div className="sp-disp-fig">
                      <svg viewBox="0 0 520 280" preserveAspectRatio="none">
                        <line x1="34" y1="256" x2="486" y2="256" stroke="#fff" strokeOpacity="0.16" />
                        <line x1="34" y1="24" x2="34" y2="256" stroke="#fff" strokeOpacity="0.16" />
                        <line x1="260" y1="24" x2="260" y2="256" stroke="#F1BA5B" strokeOpacity="0.4" strokeDasharray="4 5" />
                        <line x1="34" y1="140" x2="486" y2="140" stroke="#F1BA5B" strokeOpacity="0.4" strokeDasharray="4 5" />
                        {NUBE.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.g} fill="#fff" fillOpacity="0.3" />)}
                        <circle cx={EMPRESA.x} cy={EMPRESA.y} r="15" fill="#F1BA5B" fillOpacity="0.16" />
                        <circle cx={EMPRESA.x} cy={EMPRESA.y} r="7" fill="#F1BA5B" />
                      </svg>
                      <span className="sp-disp-yo" style={v({ "--x": `${(EMPRESA.x / 520) * 100}%`, "--y": `${(EMPRESA.y / 280) * 100}%` })}>Tu empresa</span>
                      <span className="sp-disp-med">Mediana del sector</span>
                    </div>
                    <p className="sp-disp-eje"><span>Margen operacional ↑</span><span>Crecimiento de ingresos →</span></p>
                  </div>
                  <div className="sp-bi-lado">
                    <div className="sp-bi-cifras">
                      <div><b>412</b><span>sociedades que reportan</span></div>
                      <div><b>6,8 %</b><span>crecimiento mediano</span></div>
                      <div><b>5,2 %</b><span>margen operacional mediano</span></div>
                    </div>
                    <div>
                      <h5>Posición por ingresos</h5>
                      <div className="sp-rango"><b>37</b><span>de 412 sociedades del sector</span></div>
                      <div className="sp-rango-eje"><i /></div>
                    </div>
                    <div>
                      <h5>Señales del entorno</h5>
                      <ul className="sp-senales">
                        {SENALES.map(([t, d]) => <li key={t}><span className="sp-etq">{t}</span><span>{d}</span><ExternalLink size={13} /></li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <figcaption className="sp-nota-fig">Vista ilustrativa con datos de ejemplo</figcaption>
            </figure>
          </div>
        </section>

        {/* ── la plataforma ── */}
        <section id="plataforma" className="sp-sec">
          <div className="sp-wrap">
            <span className="sp-kicker">La plataforma</span>
            <h2 className="sp-h2">Todo el ciclo estratégico en un solo lugar.</h2>
            <p className="sp-lead">Los módulos comparten los mismos datos: lo que el comité decide en uno aparece en los demás sin volver a escribirlo.</p>
            <ol className="sp-indice">
              {INCLUYE.map(([t, d], i) => (
                <li key={t} className="sp-ver"><code>{String(i + 1).padStart(2, "0")}</code><div><b>{t}</b><span>{d}</span></div></li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── para quién ── */}
        <section id="roles" className="sp-sec sp-blanca">
          <div className="sp-wrap">
            <span className="sp-kicker">Para quién</span>
            <h2 className="sp-h2">Cada rol ve lo que le corresponde decidir o cumplir.</h2>
            <div className="sp-roles">
              {ROLES.map((r) => (
                <article className="sp-rol sp-ver" key={r.t} style={{ background: "var(--bg-warm)" }}>
                  <span className="sp-ico"><r.icon size={22} /></span>
                  <h3>{r.t}</h3>
                  <p>{r.d}</p>
                  <ul>{r.l.map((x) => <li key={x}><Check size={16} strokeWidth={2.6} />{x}</li>)}</ul>
                </article>
              ))}
            </div>
            <ul className="sp-garantias">
              <li><Building2 size={20} /><span><b>Un espacio por empresa.</b> Los datos de cada organización están aislados de los demás.</span></li>
              <li><ShieldCheck size={20} /><span><b>Roles y permisos.</b> Cada persona entra con su cuenta y ve lo que su rol permite.</span></li>
              <li><History size={20} /><span><b>Registro de actividad.</b> Queda constancia de quién decidió qué y cuándo.</span></li>
              <li><FileDown size={20} /><span><b>Decisiones descargables.</b> Cada módulo se exporta a PDF, Word y Excel.</span></li>
            </ul>
          </div>
        </section>

        {/* ── cierre ── */}
        <section className="sp-sec sp-cierre">
          <Anillos cx={720} cy={900} n={9} paso={92} />
          <div className="sp-wrap">
            <h2 className="sp-h2">El primer paso es saber dónde está tu empresa.</h2>
            <p className="sp-lead">Dos diagnósticos sirven de punto de partida. El acceso a cada uno se habilita después de un primer contacto.</p>
            <div className="sp-entradas">
              {ENTRADAS.map((e, i) => (
                <article className="sp-entrada" key={e.t}>
                  <div className="sp-entrada-cab"><code>0{i + 1}</code><span>Acceso previo contacto</span></div>
                  <h3>{e.t}</h3>
                  <p>{e.d}</p>
                  <a href={correo(e.a)}>Solicitar acceso <ArrowRight size={16} strokeWidth={2.4} /></a>
                </article>
              ))}
            </div>
            <p className="sp-cierre-o">¿Prefieres ver primero la plataforma completa?</p>
            <div className="sp-cta">
              <a href={DEMO} className="sp-btn sp-btn-oro">Solicitar una demostración <ArrowRight size={17} strokeWidth={2.4} /></a>
              <Link href="/login" className="sp-btn sp-btn-linea">Iniciar sesión</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="sp-pie">
        <div className="sp-wrap sp-pie-in">
          <MarcaGE oscura firma={false} alto="30px" />
          <nav aria-label="Pie de página">
            {SECCIONES.map(([h, t]) => <a key={h} href={h}>{t}</a>)}
            <a href="#roles">Para quién</a>
            <Link href="/login">Iniciar sesión</Link>
          </nav>
        </div>
        <div className="sp-wrap sp-pie-legal"><span>© {anio} Gestión estratégica</span><span>{DESARROLLADO_POR}</span></div>
      </footer>
    </div>
  );
}
