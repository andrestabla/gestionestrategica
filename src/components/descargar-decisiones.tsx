"use client";

// «Descargar decisiones»: lo decidido en el módulo, con la marca de la plataforma, en PDF, DOCX o XLSX.

import { useEffect, useRef, useState } from "react";
import { Download, FileText, FileSpreadsheet, File, ChevronDown } from "lucide-react";
import type { ModuloExport } from "@/server/exportar";

export function DescargarDecisiones({ modulo, compacto = false }: { modulo: ModuloExport; compacto?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [open]);
  const href = (f: string) => `/api/td/exportar?modulo=${modulo}&formato=${f}`;
  const opciones = [{ f: "pdf", label: "PDF", icon: FileText, desc: "para leer y compartir" }, { f: "docx", label: "Word (.docx)", icon: File, desc: "para editar el acta" }, { f: "xlsx", label: "Excel (.xlsx)", icon: FileSpreadsheet, desc: "para trabajar los datos" }];
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn-ghost btn-sm inline-flex items-center gap-1.5 text-[12px]" aria-haspopup="menu" aria-expanded={open} title="Descargar lo decidido en este módulo con la marca de la plataforma"><Download size={12} /> {compacto ? "Descargar" : "Descargar decisiones"} <ChevronDown size={11} className="text-faint" /></button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-[230px] overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {opciones.map((o) => (
            <a key={o.f} role="menuitem" href={href(o.f)} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-ink hover:bg-surface-2"><o.icon size={14} className="shrink-0 text-cyan-deep" /><span><span className="font-semibold">{o.label}</span><span className="block text-[11px] text-faint">{o.desc}</span></span></a>
          ))}
        </div>
      )}
    </div>
  );
}
