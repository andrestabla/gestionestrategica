// Sitio público (/): lo que ve quien llega sin sesión. Componente de servidor,
// sin JavaScript propio. Presenta la plataforma por lo que hace (estrategia,
// priorización en sesión, gestión de proyectos, inteligencia), sin nombrar el
// método ni su mapa. Las vistas son ilustrativas, con datos de ejemplo que
// cumplen las reglas reales de la matriz de priorización.

import Link from "next/link";
import { ArrowDown, ArrowRight, Building2, Check, ExternalLink, FileDown, History, Paperclip, Presentation, Radio, Scale, ShieldCheck, Smartphone, Target, UsersRound } from "lucide-react";
import { DESARROLLADO_POR, MarcaGE } from "@/components/logo";
import { CRITERIA, LEVEL_NAMES, type Level } from "@/lib/priorizacion";
import { DIAGNOSTICOS_PUBLICOS } from "@/data/diagnosticos-publicos";
import "./sitio.css";

/** Correo de contacto. Pendiente de confirmar con el dueño del producto. */
const CONTACTO = "hola@algoritmot.com";
export const CONTACTO_SITIO = CONTACTO;
const correo = (asunto: string) => `mailto:${CONTACTO}?subject=${encodeURIComponent(asunto)}`;
const DEMO = correo("Demostración de Gestión estratégica");

// Dos puertas de entrada, cada una con su página (/diagnosticos/<slug>). Se entra con un código personal que envía el equipo que acompaña.

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
  { nombre: "Rediseño de la intranet", n: [2, 2, 2, 3], decision: "Aplazar", chip: "sp-chip-gris" },
];

const AVANCE = [["Canal digital", 72], ["Tablero del comité", 88], ["Servicio posventa", 45]] as const;

const AREAS = [
  { t: "Estrategia", d: "Prioridades, objetivos y resultados clave ligados entre sí.", h: "#ruta" },
  { t: "Priorización", d: "El comité califica y decide en sesión, con una misma regla.", h: "#sesion" },
  { t: "Proyectos", d: "Cada iniciativa aprobada, con tareas, riesgos, presupuesto y su efecto en los resultados.", h: "#proyectos" },
  { t: "Inteligencia", d: "Datos del sector y del mercado con la fuente declarada.", h: "#inteligencia" },
];

const PASOS = [
  { t: "Diagnosticar", d: "Un diagnóstico de capacidades con tres fuentes muestra el punto de partida: autoevaluación del equipo directivo, percepción anónima de los equipos y evidencia verificada.", s: "Brechas y punto de partida" },
  { t: "Elegir", d: "El comité define pocas prioridades estratégicas y los objetivos que responden a cada una. Solo ingresan al portafolio los objetivos vinculados con una prioridad.", s: "Prioridades y objetivos" },
  { t: "Medir", d: "Cada objetivo se concreta en resultados clave con línea base, meta y fecha. La validación asistida por IA señala lo que le falta a cada formulación.", s: "Resultados clave" },
  { t: "Priorizar", d: "El comité califica las iniciativas con cuatro criterios. El puntaje ordena y el comité decide: implementar, preparar, aplazar o renunciar.", s: "Matriz y portafolio" },
  { t: "Cumplir", d: "Lo aprobado se traduce en compromisos trimestrales y en un plan de trabajo con tareas, responsables y evidencias. El informe ejecutivo muestra el avance en cada corte.", s: "Cascada y proyectos" },
];

// ── gestión de proyectos (vista ilustrativa; «hoy» es el 10 de noviembre) ──
const RASGOS_GP = [
  ["Impacto en resultados clave.", "Cada proyecto declara qué resultado clave debe mover, y la plataforma muestra si la ejecución lo acerca a la meta o lo aleja."],
  ["Confianza de entrega.", "Un índice de 0 a 100 por proyecto y para todo el portafolio, que resume si lo aprobado se va a cumplir."],
  ["Tablero y cronograma.", "Tareas por estado, línea base, dependencias, hitos y ruta crítica: cada reprogramación se mide contra la fecha comprometida."],
  ["Riesgos.", "Probabilidad e impacto de cada riesgo, su respuesta, su responsable y el resultado clave que pondría en peligro."],
  ["Presupuesto frente al avance.", "Lo comprometido y lo ejecutado se comparan con lo avanzado, y se proyecta el costo al cierre."],
  ["Cierre con evidencia.", "Una tarea pasa al estado «Hecha» cuando incluye su soporte, y el asesor verifica la evidencia."],
  ["Carga por persona.", "Tareas abiertas, vencidas y próximas a vencer de cada responsable y de sus corresponsables."],
  ["Alertas e historial.", "Vencimientos, bloqueos y el registro de cada cambio, con su fecha y su autor."],
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
  ["Posición en el sector.", "Ingresos, crecimiento y margen de la empresa frente a las sociedades incluidas en la fuente consultada."],
  ["Competencia.", "Pares, rankings y concentración del sector."],
  ["Territorio.", "Dónde está el sector y dónde hay demanda por cubrir."],
  ["Señales del entorno.", "Regulación, mercado, macroeconomía y demanda, con la fuente y la fecha de cada dato."],
  ["Transformación digital de la industria.", "Cifras de adopción y lo que han hecho otras empresas del sector. La base se arma según la industria de cada empresa al crear su espacio."],
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
  ["Madurez digital", "El nivel de las prácticas digitales, contrastado con evidencia y con la industria, y un informe con prioridades."],
  ["Comparación sectorial", "La empresa frente a su sector, con datos abiertos de estados financieros."],
  ["Prioridades y objetivos", "Pocas prioridades estratégicas y los objetivos directivos que responden a cada una."],
  ["Resultados clave e indicadores", "Línea base, meta, fecha y responsable, con su tablero de seguimiento."],
  ["Iniciativas", "Formuladas con alcance, fechas, presupuesto y el resultado clave al que contribuyen."],
  ["Matriz de priorización", "Una misma regla para todo el comité: impacto, evidencia, sostenibilidad y capacidad."],
  ["Portafolio", "Las iniciativas organizadas por horizonte: implementar, preparar, aplazar o renunciar."],
  ["Capacidades para ejecutar", "Lo que hay que resolver antes de implementar lo que se aprobó."],
  ["Cascada trimestral", "Del año al trimestre, con compromisos y responsables."],
  ["Gestión de proyectos", "Impacto en resultados clave, tablero, cronograma con ruta crítica, riesgos y presupuesto."],
  ["Inteligencia", "Datos del sector, la competencia, el territorio y la transformación digital de la industria, con su fuente."],
  ["Informe ejecutivo", "El estado de la estrategia en un documento, con descargas en PDF, Word y Excel."],
  ["Acceso seguro", "Roles por empresa, doble factor con código al correo y registro de cada cambio."],
];

const ROLES = [
  { icon: Target, t: "Comité directivo", d: "Decide con la misma regla y ve el avance de lo que aprobó.", l: ["Define prioridades y objetivos", "Califica iniciativas desde el celular", "Decide qué implementar, preparar, aplazar o descartar"] },
  { icon: Presentation, t: "Asesor estratégico", d: "Conduce el proceso y deja el registro de cada decisión.", l: ["Facilita las sesiones de trabajo", "Revisa la formulación antes de calificar", "Verifica las evidencias"] },
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
                Gestión estratégica acompaña al comité directivo desde la definición de prioridades hasta el seguimiento de cada proyecto.
                Los objetivos, los resultados clave y las iniciativas quedan conectados y visibles para quienes participan.
              </p>
              <div className="sp-cta rise rise-3">
                <a href={DEMO} className="sp-btn sp-btn-oro">Solicitar una demostración <ArrowRight size={17} strokeWidth={2.4} /></a>
                <Link href="/login" className="sp-btn sp-btn-linea">Iniciar sesión</Link>
              </div>
            </div>

            <figure className="sp-vista rise rise-2" role="img"
              aria-label="Vista ilustrativa de la matriz de priorización: cuatro iniciativas ordenadas por puntaje, con su decisión de implementar, preparar o aplazar.">
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
            <p className="sp-lead">Cada paso deja una decisión registrada y habilita el siguiente. Toda iniciativa se vincula con un resultado clave antes de ser calificada.</p>
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
                <li><span className="sp-ico"><Smartphone size={20} /></span><div><b>Una calificación por persona</b><span>Cada miembro del comité califica una sola vez cada iniciativa, con la guía de cada nivel disponible durante la sesión.</span></div></li>
                <li><span className="sp-ico"><Radio size={20} /></span><div><b>Consolidado en vivo</b><span>El promedio por criterio y el puntaje se actualizan cada pocos segundos de forma automática.</span></div></li>
                <li><span className="sp-ico"><Scale size={20} /></span><div><b>Aviso de bajo consenso</b><span>Si la diferencia entre la calificación más alta y la más baja supera 15 puntos, la plataforma lo señala para que el comité lo discuta antes de decidir.</span></div></li>
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
                <h2 className="sp-h2">Cada iniciativa aprobada tiene su plan de trabajo, y se sabe si mueve el resultado.</h2>
                <p className="sp-lead">Cada iniciativa que el comité aprueba se convierte en un proyecto con tareas, responsables, fechas, riesgos y presupuesto. El avance se lee por proyecto, por persona y por el resultado clave que cada proyecto debe mover.</p>
              </div>
              <Rasgos items={RASGOS_GP} />
            </div>

            <figure className="sp-gp sp-ver" role="img"
              aria-label="Vista ilustrativa del gestor de proyectos: confianza de entrega, tablero de tareas por estado, cronograma comparado con la línea base, resultado clave que el proyecto mueve y carga de trabajo por persona.">
              <div aria-hidden="true">
                <div className="sp-gp-top">
                  <div><strong>Expansión del canal digital</strong><small>Plan de trabajo de la iniciativa</small></div>
                  <div className="sp-tabs sp-tabs-gp"><span>Impacto</span><span className="sp-on">Tablero</span><span>Cronograma</span><span>Personas</span><span>Riesgos</span><span>Presupuesto</span></div>
                </div>
                <div className="sp-gp-stats">
                  <div><b>78</b><span>Confianza de entrega</span></div>
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
                      <h5>Resultado clave que mueve</h5>
                      <div className="sp-carga">
                        <div><span className="sp-ava">KR</span><div><b>Ventas por el canal digital</b><small>Meta 20 % · va en 15 % · la ejecución va a favor</small></div></div>
                      </div>
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
                <h2 className="sp-h2">El sector y el mercado, con la fuente de cada cifra.</h2>
                <p className="sp-lead">El módulo de Inteligencia sistematiza datos abiertos de entidades públicas y compara a la empresa con su entorno para apoyar decisiones contextualizadas.</p>
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
                      <div><b>412</b><span>sociedades analizadas</span></div>
                      <div><b>6,8 %</b><span>mediana de crecimiento</span></div>
                      <div><b>5,2 %</b><span>mediana del margen operacional</span></div>
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
              <li><Building2 size={20} /><span><b>Un espacio por empresa.</b> Los datos de cada organización se mantienen separados de los de las demás.</span></li>
              <li><ShieldCheck size={20} /><span><b>Roles y acceso seguro.</b> Cada persona ve lo que su rol permite, y la empresa puede exigir un código al correo además de la contraseña.</span></li>
              <li><History size={20} /><span><b>Registro de actividad.</b> Queda constancia de quién decidió qué y cuándo.</span></li>
              <li><FileDown size={20} /><span><b>Decisiones descargables.</b> Cada módulo se exporta a PDF, Word y Excel.</span></li>
            </ul>
          </div>
        </section>

        {/* ── cierre ── */}
        <section id="diagnosticos" className="sp-sec sp-cierre">
          <Anillos cx={720} cy={900} n={9} paso={92} />
          <div className="sp-wrap">
            <h2 className="sp-h2">El primer paso es saber dónde está tu empresa.</h2>
            <p className="sp-lead">Dos diagnósticos sirven de punto de partida. Se entra con un código personal que envía el equipo que acompaña el diagnóstico.</p>
            <div className="sp-entradas">
              {DIAGNOSTICOS_PUBLICOS.map((e, i) => (
                <article className="sp-entrada" key={e.slug}>
                  <div className="sp-entrada-cab"><code>0{i + 1}</code><span>Acceso con código</span></div>
                  <h3>{e.titulo}</h3>
                  <p>{e.resumen}</p>
                  <Link href={`/diagnosticos/${e.slug}`}>Conocer más <ArrowRight size={16} strokeWidth={2.4} /></Link>
                </article>
              ))}
            </div>
            <p className="sp-cierre-o">¿Prefieres ver primero la plataforma completa?</p>
            <div className="sp-cta">
              <a href={DEMO} className="sp-btn sp-btn-oro">Solicitar una demostración <ArrowRight size={17} strokeWidth={2.4} /></a>
              <Link href="/codigo" className="sp-btn sp-btn-linea">Tengo un código</Link>
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
            <a href="#diagnosticos">Diagnósticos</a>
            <Link href="/codigo">Tengo un código</Link>
            <Link href="/login">Iniciar sesión</Link>
          </nav>
        </div>
        <div className="sp-wrap sp-pie-legal"><span>© {anio} Gestión estratégica</span><span>{DESARROLLADO_POR}</span></div>
      </footer>
    </div>
  );
}
