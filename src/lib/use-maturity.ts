"use client";

// Hook de la medición vigente EFECTIVA: consulta /api/td/maturity y cae a la
// medición publicada de la vista de la empresa activa (useCatalog) mientras
// carga o si no hay sesión. Cuando el corte A3 se publica desde la
// plataforma, los tableros que usan este hook conmutan.

import { useCallback, useEffect, useState } from "react";
import { useCatalog } from "@/components/catalog-context";
import { scoresOf } from "@/lib/vista";
import type { ScoresMap } from "@/components/charts";
import type { VariableCapture } from "@/server/store";

export type MaturityApi = {
  assessments: { id: string; label: string; period: string; status: string; note: string }[];
  current: { id: string; label: string; period: string; scores: ScoresMap };
  previous: { id: string; label: string; period: string; scores: ScoresMap } | null;
  published: boolean;
  capture: {
    vars: Record<string, VariableCapture>;
    progress: { total: number; perception: number; dik: number; level: number };
  };
};

/** Promedio de una línea; 0 si la línea no tiene celdas (empresa sin medición). */
const lineAvg = (map: ScoresMap, n: number) => {
  const dims = Object.values(map[n] ?? {});
  return dims.length ? dims.reduce((a, d) => a + d.value, 0) / dims.length : 0;
};

export function useMaturity() {
  const v = useCatalog();
  const [data, setData] = useState<MaturityApi | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/td/maturity");
      if (res.ok) setData(await res.json());
    } catch { /* la vista de la empresa sirve de respaldo */ }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const scores: ScoresMap = data?.current.scores ?? scoresOf(v);
  const lineScoreOf = (n: number) => lineAvg(scores, n);
  const institution = [1, 2, 3, 4].reduce((a, n) => a + lineScoreOf(n), 0) / 4;
  const prevLineScoreOf = (n: number) => {
    const prev = data?.previous?.scores;
    if (!prev) return null;
    return lineAvg(prev, n);
  };

  return { data, refetch, scores, lineScoreOf, prevLineScoreOf, institution };
}
