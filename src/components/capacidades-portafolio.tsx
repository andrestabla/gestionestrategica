"use client";

// Cruce capacidades–portafolio (marco 4Shine Empresas): qué capacidades instaladas o brechas, según la
// autoevaluación directiva consolidada (Fuente 1), sostienen o frenan las iniciativas del portafolio.
// Cada iniciativa declara la dimensión que instala (capability); el consolidado por dimensión se cruza con
// las decisiones del portafolio para leer dónde el portafolio descansa sobre una brecha.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, EmptyNote } from "@/components/ui";
import { useCatalog } from "@/components/catalog-context";
import { useBase } from "@/components/user-context";
import { lecturaF1 } from "@/lib/f1";
import { DIMS, THRESHOLD } from "@/data/mapa";
import { avg } from "@/lib/od";
import { decisionLabel, type Decision } from "@/lib/priorizacion";
import { DECISION_CLS } from "@/components/priorizacion";
import { ShieldAlert, ShieldCheck, Layers } from "lucide-react";

type F1Row = { email: string; r: Record<string, number> };
type Fila = { code: string; name: string; cap: string; m: number | null; n: number; inis: { id: string; name: string; decision: Decision | null; owner?: string }[]; lectura: "brecha-con" | "brecha-sin" | "instalada" | "sin-dato" };

const CLS: Record<Fila["lectura"], { chip: string; label: string }> = {
  "brecha-con": { chip: "chip chip-bad", label: "Brecha con iniciativas" },
  "brecha-sin": { chip: "chip chip-gold", label: "Brecha sin iniciativa" },
  instalada: { chip: "chip chip-ok", label: "Capacidad instalada" },
  "sin-dato": { chip: "chip", label: "Sin lectura" },
};

export function CapacidadesPortafolio({ decisions, compact = false }: { decisions?: Record<string, { decision?: Decision | null }>; compact?: boolean }) {
  const { catalog: cat } = useCatalog();
  const base = useBase();
  const [f1, setF1] = useState<F1Row[] | null>(null);
  const [fetched, setFetched] = useState<Record<string, { decision?: Decision | null }>>({});
  const dec = decisions ?? fetched;   // decisiones del portafolio: las pasa la pestaña o se leen aquí
  useEffect(() => {
    let alive = true;
    fetch("/api/td/f1").then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive) setF1(j ? (j.responses as F1Row[]) : []); }).catch(() => { if (alive) setF1([]); });
    if (!decisions) fetch("/api/td/priorizacion").then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive && j?.decisions) setFetched(j.decisions); }).catch(() => { /* sin red */ });
    return () => { alive = false; };
  }, [decisions]);

  const filas = useMemo<Fila[]>(() => {
    const lecturas = (f1 ?? []).map((x) => lecturaF1(x.r));
    return DIMS.map((d) => {
      const ms = lecturas.map((l) => l.dims.find((x) => x.d.code === d.code)?.m ?? null).filter((m): m is number => m != null);
      const m = avg(ms);
      const inis = cat.initiatives.filter((i) => (i.capability ?? "").startsWith(d.code)).map((i) => ({ id: i.id, name: i.name, decision: dec[i.id]?.decision ?? null, owner: cat.responsibles.find((r) => r.id === i.ownerId)?.dependencia }));
      const lectura: Fila["lectura"] = m == null ? "sin-dato" : m < THRESHOLD ? (inis.length ? "brecha-con" : "brecha-sin") : "instalada";
      return { code: d.code, name: d.name, cap: d.cap, m, n: ms.length, inis, lectura };
    }).sort((a, b) => (a.m ?? 9) - (b.m ?? 9));
  }, [f1, cat, dec]);
  const brechas = filas.filter((f) => f.lectura === "brecha-con" || f.lectura === "brecha-sin");
  const activas = (f: Fila) => f.inis.filter((i) => i.decision === "IMPLEMENTAR" || i.decision === "PREPARAR").length;
  const sobreBrecha = brechas.reduce((a, f) => a + activas(f), 0);
  const visibles = compact ? filas.filter((f) => f.lectura !== "sin-dato" && (f.lectura !== "instalada" || f.inis.length)) : filas;

  return (
    <Card className="rise mt-5 overflow-hidden">
      <CardHeader title="Capacidades y portafolio" sub={f1 === null ? "Leyendo la autoevaluación directiva…" : f1.length ? `Consolidado de ${f1.length} autoevaluación${f1.length === 1 ? "" : "es"} por dimensión frente a las iniciativas que la instalan · umbral ${THRESHOLD.toFixed(1)}` : "Sin autoevaluaciones directivas todavía: el cruce se construye cuando el equipo directivo responde la Fuente 1."} />
      {f1 && f1.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pb-3 text-[12px]">
          <span className="chip chip-bad"><ShieldAlert size={12} /> {brechas.length} brecha{brechas.length === 1 ? "" : "s"} bajo el umbral</span>
          <span className="chip chip-cyan"><Layers size={12} /> {sobreBrecha} iniciativa{sobreBrecha === 1 ? "" : "s"} aprobada{sobreBrecha === 1 ? "" : "s"} o condicionada{sobreBrecha === 1 ? "" : "s"} sobre una brecha</span>
          <span className="chip chip-ok"><ShieldCheck size={12} /> {filas.filter((f) => f.lectura === "instalada").length} instalada{filas.filter((f) => f.lectura === "instalada").length === 1 ? "" : "s"}</span>
        </div>
      )}
      {f1 && f1.length === 0 ? (
        <div className="px-5 pb-5"><EmptyNote>La lectura de capacidades sale de la <Link href={`${base}/panel/diagnostico/autoevaluacion`} className="font-semibold text-cyan-deep hover:underline">autoevaluación directiva</Link>. Cuando haya respuestas, cada dimensión se cruza con las iniciativas que la instalan.</EmptyNote></div>
      ) : f1 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-4 py-2">Dimensión</th><th className="px-2 py-2 text-right">Madurez</th><th className="px-2 py-2">Lectura</th><th className="px-2 py-2">Iniciativas que la instalan</th></tr></thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.code} className="border-t border-line align-top">
                  <td className="px-4 py-2"><div className="font-semibold text-ink">{f.name}</div><div className="text-[11.5px] text-faint">{f.code} · {f.cap}</div></td>
                  <td className="num px-2 py-2 text-right font-extrabold" style={{ color: f.m == null ? "var(--faint)" : f.m < THRESHOLD ? "var(--bad)" : "var(--ok)" }}>{f.m == null ? "—" : f.m.toFixed(1)}</td>
                  <td className="px-2 py-2"><span className={CLS[f.lectura].chip}>{CLS[f.lectura].label}</span></td>
                  <td className="px-2 py-2">
                    {f.inis.length === 0 ? <span className="italic text-faint">{f.lectura === "brecha-sin" ? "ninguna iniciativa la instala: brecha que el portafolio no atiende" : "—"}</span> : (
                      <ul className="space-y-1">{f.inis.map((i) => <li key={i.id} className="flex flex-wrap items-center gap-1.5"><Link href={`${base}/panel/iniciativas/${i.id}`} className="font-medium text-ink hover:text-cyan-deep hover:underline">{i.name}</Link>{i.owner && <span className="text-[11.5px] text-faint">· {i.owner}</span>}{i.decision ? <span className={DECISION_CLS[i.decision]}>{decisionLabel(i.decision)}</span> : <span className="text-[11px] italic text-faint">pendiente</span>}</li>)}</ul>
                    )}
                  </td>
                </tr>
              ))}
              {visibles.length === 0 && <tr><td colSpan={4} className="px-4 py-3 italic text-faint">Sin dimensiones con lectura.</td></tr>}
            </tbody>
          </table>
          <p className="px-5 py-3 text-[12px] leading-relaxed text-muted">Una brecha con iniciativas aprobadas descansa sobre una capacidad que aún no está: conviene que la cascada trimestral reserve hitos para instalarla antes de exigir resultado. Una brecha sin iniciativa es una decisión pendiente del portafolio.</p>
        </div>
      )}
    </Card>
  );
}
