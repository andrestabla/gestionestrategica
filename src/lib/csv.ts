"use client";

// Descarga CSV en el cliente (separador ; para Excel es-CO, BOM UTF-8).

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    // un texto que empieza por = + - @ lo ejecutaría la hoja de cálculo como fórmula: se antepone un apóstrofo
    const s = v === null || v === undefined ? "" : typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
