"use client";

// Metodología · la guía de lectura de la plataforma: el sistema 4Shine
// Empresas tal como lo definen el Dossier v2.0, la Matriz de capacidades
// v2.0, el 4Shine-OD v2.0 y los frameworks. Todo se lee de las MISMAS
// fuentes que usa el motor (src/data/4shine.json): si una definición
// cambia en los generadores de la línea, esta página cambia con ella.

import { PageHeader, Card, CardHeader } from "@/components/ui";
import { AccessChip } from "@/components/user-context";
import {
  CAPS, DIMS, dimsOf, LEVELS, STAGES, METHODOLOGIES, FRAMEWORKS, THRESHOLD, REGION, TEST,
} from "@/data/mapa";
import { PERSPECTIVES } from "@/data/cmi";
import { PERMISSION_MATRIX, type Action, type Role } from "@/lib/permissions";
import {
  Compass, Layers, Gauge, Footprints, BookOpenCheck, Wrench, Radar, ShieldCheck, Network, type LucideIcon,
} from "lucide-react";

const ACTION_LABEL: Record<Action, string> = {
  view: "Ver los módulos",
  edit_tasks: "Crear y editar tareas del gestor",
  edit_initiatives: "Editar iniciativas (avance, factores, bitácora)",
  evaluate_initiatives: "Evaluar con la matriz 4Shine de priorización",
  decide_initiatives: "Decidir el tiempo: implementar, preparar, backlog o renunciar",
  report_kpi: "Registrar valores de KPI",
  capture_maturity: "Capturar la autoevaluación de un corte",
  publish_maturity: "Verificar evidencia, calificar y publicar mediciones",
  verify_evidence: "Verificar evidencia de tareas",
  manage_users: "Administrar usuarios y roles",
  manage_platform: "Integraciones, branding y configuración",
};
const ROLES: { key: Role; label: string }[] = [
  { key: "ADMIN", label: "Admin" }, { key: "CONSULTOR", label: "Advisor" }, { key: "LIDER", label: "Líder" },
  { key: "RESPONSABLE", label: "Responsable" }, { key: "DIRECTIVO", label: "Directivo" },
];

function Section({ id, icon: Icon, title, sub, children }: { id: string; icon: LucideIcon; title: string; sub: string; children: React.ReactNode }) {
  return (
    <Card className="rise mb-5 scroll-mt-20" >
      <div id={id} />
      <CardHeader title={<span className="inline-flex items-center gap-2"><Icon size={15} className="text-cyan-deep" />{title}</span> as unknown as string} sub={sub} />
      {children}
    </Card>
  );
}

export default function MetodologiaPage() {
  const NAVL = [
    ["tesis", "Tesis y capacidades"], ["arquitectura", "Arquitectura"], ["madurez", "Escala de madurez"], ["etapas", "Etapas"],
    ["diagnostico", "Diagnóstico"], ["metodologias", "Metodologías"], ["frameworks", "Frameworks"], ["estrategia", "Cuadro de mando"], ["permisos", "Permisos"],
  ];
  return (
    <>
      <PageHeader kicker="Metodología" title="El sistema 4Shine Empresas"
        desc="Ninguna empresa puede sostener un crecimiento superior a la capacidad organizacional que ha desarrollado para dirigir, liderar, ejecutar y multiplicar. La plataforma gestiona esa capacidad: la diagnostica con evidencia, la prioriza y la instala con frameworks."
        actions={<AccessChip module="metodologia" />} />
      <div className="rise mb-6 flex flex-wrap gap-1.5">{NAVL.map(([id, l]) => <a key={id} href={`#${id}`} className="chip">{l}</a>)}</div>

      <Section id="tesis" icon={Compass} title="Cuatro capacidades, una secuencia" sub="Dirección elige · Liderazgo moviliza · Ejecución cumple · Multiplicación escala. Cada brecha temprana reaparece disfrazada más adelante.">
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          {CAPS.map((c) => (
            <div key={c.n} className="rounded-xl px-4 py-3 text-white" style={{ background: c.color }}>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">{c.code} · {c.verb}</div>
              <div className="text-[17px] font-extrabold">{c.name}</div>
              <p className="mt-1 text-[12px] leading-snug opacity-90">{c.q}</p>
              <ul className="mt-2 space-y-0.5 text-[11.5px] opacity-90">{dimsOf(c.n).map((d) => <li key={d.code}>{d.code} · {d.name}</li>)}</ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="arquitectura" icon={Layers} title="De la capacidad a la evidencia" sub="Cuatro niveles trazables: capacidad, dimensión, práctica observable y evidencia verificable. Sin artefacto demostrable, una práctica no supera el nivel 2.">
        <div className="grid gap-3 px-5 pb-4 sm:grid-cols-4">
          {[["4", "Capacidades", "Los cuatro dominios del crecimiento sostenible."], ["17", "Dimensiones", "Los focos que componen cada capacidad."], ["68", "Prácticas", "Lo que la organización hace de forma recurrente."], ["68", "Evidencias", "El artefacto, su contenido mínimo y su forma de verificación."]].map(([n, t, d]) => (
            <div key={t} className="rounded-xl bg-surface-2 px-4 py-3"><div className="num text-[26px] font-extrabold text-cyan-deep">{n}</div><div className="text-[13px] font-bold text-ink">{t}</div><div className="text-[11.5px] text-muted">{d}</div></div>
          ))}
        </div>
        <p className="px-5 pb-5 text-[12.5px] leading-relaxed text-muted">Cada práctica declara, además, la metodología que la sustenta y el framework con el que la empresa produce su evidencia. La Matriz de capacidades v2.0 es la fuente única del mapa; esta plataforma la lee sin modificarla.</p>
      </Section>

      <Section id="madurez" icon={Gauge} title="Cinco niveles de madurez" sub={`Umbral de brecha: ${THRESHOLD.toFixed(1).replace(".", ",")}. Dos o más capacidades en brecha indican una falla de arquitectura, no un problema de esfuerzo.`}>
        <div className="grid gap-2 px-5 pb-5 sm:grid-cols-5">
          {LEVELS.map((l) => (
            <div key={l.n} className="rounded-xl px-3 py-3 text-white" style={{ background: l.color }}><div className="num text-[22px] font-extrabold">{l.n}</div><div className="text-[12.5px] font-bold">{l.name}</div><p className="mt-1 text-[11px] leading-snug opacity-90">{l.desc}</p></div>
          ))}
        </div>
        <div className="border-t border-line px-5 py-3 text-[12px] text-muted">Rangos de lectura del diagnóstico completo: 1,0 a 1,9 incipiente · 2,0 a 2,9 emergente · 3,0 a 3,7 instalada · 3,8 a 4,5 gestionada · 4,6 a 5,0 multiplicadora. El test usa rangos propios: {TEST.rangos.map((r) => r.split(":")[0].toLowerCase()).join(" · ")}.</div>
      </Section>

      <Section id="etapas" icon={Footprints} title="Cinco etapas, un umbral por cruzar" sub="Las cuatro capacidades están presentes en todas las etapas; lo que cambia es cuál necesita dar el salto principal.">
        <div className="grid gap-3 px-5 pb-4 lg:grid-cols-5">
          {STAGES.map((s) => (
            <div key={s.name} className="rounded-xl border border-line px-4 py-3">
              <div className="text-[14px] font-extrabold text-ink">{s.name}</div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{s.pregunta}</p>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-cyan-deep">Lidera {s.lider}</div>
              <div className="text-[10.5px] text-faint">Soporte: {s.soporte}</div>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-faint">Umbral cruzado cuando</div>
              <ul className="mt-0.5 space-y-0.5 text-[11px] text-ink-soft">{s.umbral.map((u) => <li key={u}>· {u}</li>)}</ul>
              {s.frameworks.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{s.frameworks.map((f) => <a key={f} href={`#${f}`} className="chip">{f}</a>)}</div>}
            </div>
          ))}
        </div>
        <div className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">Condiciones frecuentes en las empresas de la región que afectan la lectura: {REGION.map((r) => r.name.toLowerCase()).join(", ")}. La adaptabilidad no es una quinta capacidad: es una condición transversal del sistema.</div>
      </Section>

      <Section id="diagnostico" icon={Radar} title="El diagnóstico 4Shine-OD" sub="Dos instrumentos en secuencia y tres fuentes que se contrastan.">
        <div className="grid gap-4 px-5 pb-5 lg:grid-cols-2">
          <div className="rounded-xl bg-surface-2 px-4 py-3"><div className="text-[13px] font-bold text-ink">1 · Test de capacidad empresarial</div><p className="mt-1 text-[12px] leading-relaxed text-muted">24 preguntas, seis por capacidad, más el desafío dominante. Entrega la etapa, el perfil de capacidades con su cobertura, la restricción principal y la acción a 90 días. Una práctica declarada y no demostrada queda como máximo en nivel 2. Una diferencia de dos o más puntos entre participantes activa una conversación de contraste.</p></div>
          <div className="rounded-xl bg-surface-2 px-4 py-3"><div className="text-[13px] font-bold text-ink">2 · Diagnóstico completo</div><p className="mt-1 text-[12px] leading-relaxed text-muted">F1, autoevaluación directiva: 68 afirmaciones, una por práctica. F2, percepción de equipos: 40 afirmaciones anónimas. F3, evidencia documental: 68 evidencias revisadas tal como están y el nivel de cada dimensión asignado con la rúbrica.</p></div>
        </div>
        <div className="grid gap-3 border-t border-line px-5 py-4 sm:grid-cols-2 lg:grid-cols-4 text-[12px]">
          <div><div className="label mb-1">Fórmula</div><p className="text-ink-soft">Madurez = 0,40 × F3 + 0,30 × F1 + 0,30 × F2. Techo de evidencia: nunca supera F3 + 1,0. Sin F2 suficiente: 55/45. Sin F3: máximo 2,9.</p></div>
          <div><div className="label mb-1">Relato sobre realidad</div><p className="text-ink-soft">F1 − F3 ≥ 1,5: la dirección declara prácticas que la evidencia no sostiene.</p></div>
          <div><div className="label mb-1">Brecha jerárquica</div><p className="text-ink-soft">F1 − F2 ≥ 1,5: la dirección vive una empresa distinta a la de sus equipos.</p></div>
          <div><div className="label mb-1">Instalada pero no vivida</div><p className="text-ink-soft">F3 ≥ 4 y F2 ≤ 2,5: el sistema existe en el papel y no llega a la experiencia diaria.</p></div>
        </div>
        <div className="border-t border-line px-5 py-3 text-[12px] text-muted">Prioridad de una brecha = (3,0 − madurez) × peso de arrastre. Nivel de acompañamiento: ninguna capacidad en brecha, sin intervención estructural; una, Focus (con la modalidad acotada de talleres de 4 a 20 horas); dos o dependencia cruzada, Growth Partner; tres o más, o CEO patrocinador y cuello de botella a la vez, Enterprise Elite.</div>
      </Section>

      <Section id="metodologias" icon={BookOpenCheck} title="Quince metodologías transversales" sub="Cada práctica declara la metodología que la sustenta; Scaling Up es la columna vertebral y las demás la complementan donde no llega.">
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Código</th><th className="px-3 py-2">Metodología</th><th className="px-3 py-2">Principio</th><th className="px-3 py-2">Dimensiones</th><th className="px-3 py-2">Referentes</th></tr></thead>
            <tbody>
              {METHODOLOGIES.map((m) => (
                <tr key={m.code} className="border-t border-line align-top">
                  <td className="num px-3 py-2 font-bold text-cyan-deep">{m.code}</td>
                  <td className="px-3 py-2 font-semibold text-ink">{m.name}</td>
                  <td className="px-3 py-2 text-ink-soft">{m.principio}</td>
                  <td className="px-3 py-2 text-muted">{DIMS.filter((d) => d.mets.includes(m.code)).map((d) => d.code).join(", ")}</td>
                  <td className="px-3 py-2 text-muted">{m.referentes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="frameworks" icon={Wrench} title="Quince frameworks: de la brecha a la evidencia" sub="Las hojas de trabajo con las que el equipo de la empresa materializa cada evidencia del mapa; 68 evidencias cubiertas, cada una en un solo lugar.">
        <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 lg:grid-cols-3">
          {FRAMEWORKS.map((f) => (
            <div key={f.id} id={f.id} className="scroll-mt-20 rounded-xl border border-line px-4 py-3">
              <div className="flex items-center justify-between"><span className="num text-[10.5px] font-extrabold text-cyan-deep">{f.id}</span><span className="chip">{f.cap}</span></div>
              <div className="mt-0.5 text-[13.5px] font-bold text-ink">{f.name}</div>
              <p className="mt-1 text-[11.5px] leading-snug text-muted">{f.promise}</p>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-faint">Evidencias · {f.ritmo}</div>
              <div className="mt-0.5 flex flex-wrap gap-1">{f.ev.map((e) => <span key={e} className="num text-[10px] text-ink-soft">{e}</span>)}</div>
              <div className="mt-2 text-[10.5px] text-faint">{f.bloques.map((b) => b.title).join(" · ")}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="estrategia" icon={Network} title="Cuadro de mando y OKR" sub="Cuatro perspectivas encadenadas; cada objetivo declara sus resultados clave (KPI), la dimensión que instala y la iniciativa que lo mueve.">
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          {PERSPECTIVES.map((p) => <div key={p.id} className="rounded-xl px-4 py-3" style={{ background: `color-mix(in srgb, ${p.color} 10%, white)` }}><div className="text-[13px] font-extrabold" style={{ color: p.color }}>{p.name}</div><div className="text-[10.5px] text-faint">{p.sub}</div><p className="mt-1 text-[11.5px] leading-snug text-muted">{p.desc}</p></div>)}
        </div>
      </Section>

      <Section id="permisos" icon={ShieldCheck} title="Quién puede qué" sub="Matriz central de permisos: el servidor la exige y la interfaz la refleja. «Capacidad» restringe al ámbito propio del responsable.">
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Acción</th>{ROLES.map((r) => <th key={r.key} className="px-3 py-2 text-center">{r.label}</th>)}</tr></thead>
            <tbody>
              {(Object.keys(PERMISSION_MATRIX) as Action[]).map((a) => (
                <tr key={a} className="border-t border-line"><td className="px-3 py-2 text-ink-soft">{ACTION_LABEL[a]}</td>{ROLES.map((r) => { const g = PERMISSION_MATRIX[a][r.key]; return <td key={r.key} className="px-3 py-2 text-center">{g === true ? <span className="chip chip-ok">Sí</span> : g === "line" ? <span className="chip chip-warn">Su capacidad</span> : <span className="text-faint">—</span>}</td>; })}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
