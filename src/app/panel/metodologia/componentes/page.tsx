"use client";

// Catálogo interno de componentes (sistema de diseño MASTER): tokens con su contraste, escala tipográfica,
// botones, chips, campos, tarjetas de cifras, esqueletos, avisos y confirmación. Solo para el administrador
// y el advisor; es la referencia viva para construir pantallas sin reinventar piezas.

import { useState } from "react";
import { PageHeader, Card, CardHeader, StatCard, Field, Skeleton, SkeletonCards, EmptyNote } from "@/components/ui";
import { useUser } from "@/components/user-context";
import { avisar, confirmar } from "@/components/feedback";
import { Save, Trash2, Pencil, Plus } from "lucide-react";

const TEXTOS = [
  ["--ink", "Texto principal"], ["--ink-soft", "Texto suave"], ["--muted", "Texto secundario"], ["--faint", "Texto tenue"],
  ["--cyan-deep", "Enlaces y énfasis"], ["--gold-text", "Dorado como texto"], ["--ok-text", "Correcto (texto)"], ["--warn-text", "Advertencia (texto)"], ["--bad-text", "Error (texto)"],
] as const;
const FONDOS = [["--surface", "Superficie"], ["--surface-2", "Superficie 2"], ["--bg", "Fondo"]] as const;
const ESCALA = [["badge", 11, "Insignias y kickers en mayúsculas"], ["xs", 12, "Metadatos, pies, celdas secundarias, chips"], ["sm", 13, "Ayudas, celdas de tabla, botones compactos"], ["base", 14, "Cuerpo y formularios"], ["h3", 16, "Títulos de tarjeta"], ["h2", 22, "Títulos de sección"], ["h1", 27, "Título de página"]] as const;

function lum(hex: string) {
  const h = hex.replace("#", ""); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contraste(a: string, b: string) { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function rgbToHex(rgb: string) { const m = rgb.match(/\d+/g); return m && m.length >= 3 ? "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("") : "#000000"; }

export default function ComponentesPage() {
  const me = useUser();
  const [tokens, setTokens] = useState<Record<string, string> | null>(null);
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (me.role !== "ADMIN" && me.role !== "CONSULTOR") return <Card className="rise p-6"><EmptyNote>El catálogo de componentes es una referencia interna del equipo que construye la plataforma.</EmptyNote></Card>;
  // los tokens se leen del documento (incluido el tema oscuro si está activo)
  const leer = () => {
    const cs = getComputedStyle(document.documentElement); const probe = document.createElement("div"); document.body.appendChild(probe);
    const out: Record<string, string> = {};
    for (const [t] of [...TEXTOS, ...FONDOS]) { probe.style.color = `var(${t})`; out[t] = rgbToHex(getComputedStyle(probe).color || cs.getPropertyValue(t)); }
    probe.remove(); setTokens(out);
  };
  const color = (t: string) => tokens?.[t] ?? "#000000";
  return (
    <>
      <PageHeader kicker="Sistema de diseño" title="Catálogo de componentes"
        desc="Las piezas de la plataforma tal como las define design-system/gestion-estrategica/MASTER.md. Lo que se construya nuevo sale de aquí."
        actions={<button type="button" onClick={leer} className="btn-ghost btn-sm">Medir contraste de los tokens</button>} />

      <Card className="rise mb-5">
        <CardHeader title="Color: tokens de texto frente a superficies" sub="objetivo WCAG AA: 4,5:1 en texto normal; pulsa «Medir» para leer los valores vigentes del tema activo" />
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full text-[12.5px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Token</th><th className="px-3 py-2">Uso</th>{FONDOS.map(([f, n]) => <th key={f} className="num px-2 py-2 text-center">{n}</th>)}</tr></thead>
            <tbody>
              {TEXTOS.map(([t, uso]) => (
                <tr key={t} className="border-t border-line">
                  <td className="px-3 py-2"><span className="inline-block h-3 w-3 rounded-sm align-middle" style={{ background: `var(${t})` }} /> <code className="num ml-1">{t}</code></td>
                  <td className="px-3 py-2" style={{ color: `var(${t})` }}>{uso}</td>
                  {FONDOS.map(([f]) => { const c = tokens ? contraste(color(t), color(f)) : null; return <td key={f} className="num px-2 py-2 text-center" style={{ background: `var(${f})` }}>{c ? <span className={`chip !py-0 ${c >= 4.5 ? "chip-ok" : c >= 3 ? "chip-warn" : "chip-bad"}`}>{c.toFixed(2)}:1</span> : "—"}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card className="rise">
          <CardHeader title="Tipografía" sub="Inter para texto; JetBrains Mono (clase num) para cifras y códigos. Piso: 11 px" />
          <div className="space-y-2 px-5 pb-5">
            {ESCALA.map(([n, px, uso]) => <div key={n} className="flex items-baseline gap-3"><span className="num w-12 text-[11px] text-faint">{px} px</span><span style={{ fontSize: px }} className={px >= 16 ? "font-extrabold text-ink" : "text-ink"}>{uso}</span></div>)}
            <div className="pt-2 text-[12px] text-muted">Rótulo en mayúsculas: <span className="label">Rótulo de sección</span> · cifra: <span className="num text-[13px] font-bold text-ink">4.231,5</span></div>
          </div>
        </Card>
        <Card className="rise">
          <CardHeader title="Botones y chips" sub="md 40 px · sm 32 px · 44 px en pantallas táctiles · una acción primaria por vista" />
          <div className="space-y-3 px-5 pb-5">
            <div className="flex flex-wrap items-center gap-2"><button className="btn-primary"><Save size={14} /> Primario</button><button className="btn-ghost"><Pencil size={14} /> Secundario</button><button className="btn-primary btn-sm"><Plus size={13} /> Primario sm</button><button className="btn-ghost btn-sm">Secundario sm</button><button className="btn-primary" disabled>Deshabilitado</button></div>
            <div className="flex flex-wrap items-center gap-2"><span className="chip">Chip</span><span className="chip chip-ok">Correcto</span><span className="chip chip-warn">Advertencia</span><span className="chip chip-bad">Error</span><span className="chip chip-gold">Dorado</span><span className="chip chip-cyan">Énfasis</span><button type="button" className="chip" aria-pressed="true">Filtro activo</button></div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => avisar("Guardado")}>Aviso «Guardado»</button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => avisar("Revisa la línea base del KR", "warn")}>Aviso de advertencia</button>
              <button type="button" className="btn-ghost btn-sm" onClick={async () => { if (await confirmar("¿Eliminar el objetivo OE-01? Se desvinculan sus resultados clave.")) avisar("Eliminado (demostración)"); }}><Trash2 size={13} /> Confirmación destructiva</button>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card className="rise">
          <CardHeader title="Campos de formulario" sub="etiqueta visible siempre, ayuda y error junto al campo; nunca solo placeholder" />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <Field label="Nombre del resultado clave" help="Con la cifra de la meta, p. ej. «Share del 3,2 % al 3,4 % en 2026»"><input className="input" value={valor} onChange={(e) => { setValor(e.target.value); setError(e.target.value && !/\d/.test(e.target.value) ? "El nombre debe incluir la cifra de la meta." : null); }} placeholder="Share del 3,2 % al 3,4 % en 2026" /></Field>
            <Field label="Frecuencia" error={error ?? undefined}><select className="input"><option>Mensual</option><option>Trimestral</option><option>Semestral</option><option>Anual</option></select></Field>
          </div>
        </Card>
        <Card className="rise">
          <CardHeader title="Cifras, estados vacíos y carga" sub="StatCard, EmptyNote y Skeleton" />
          <div className="space-y-3 px-5 pb-5">
            <div className="grid grid-cols-2 gap-3"><StatCard label="Iniciativas evaluadas" value={12} unit="de 14" foot="86 % con al menos una calificación" good /><StatCard label="Dimensiones bajo el umbral" value={5} unit="de 17" foot="prioridad = (3,0 − madurez) × arrastre" /></div>
            <EmptyNote>Aún no hay resultados clave para este objetivo: de 2 a 4 (máximo 5), con «+ Resultado clave».</EmptyNote>
            <SkeletonCards n={3} />
            <Skeleton className="h-10" />
          </div>
        </Card>
      </div>
    </>
  );
}
