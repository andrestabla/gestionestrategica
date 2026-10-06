"use client";

// Administración → Branding: identidad, tema visual, login, vista previa e
// historial. Un solo borrador (draft) para todas las secciones; «Guardar y
// aplicar» valida en el servidor, audita y re-tiñe el tema en vivo.

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui";
import { applyTheme, derive, BRAND_PRESETS } from "@/lib/branding";
import { BRANDING_FONTS, BRANDING_TIMEZONES, type Branding } from "@/server/store";
import {
  Loader2, AlertTriangle, X, Check, Paintbrush, Upload, Plus, Trash2,
  IdCard, Palette, LogIn, Eye, History, Image as ImageIcon,
} from "lucide-react";

type SubTab = "identidad" | "tema" | "login" | "preview" | "historial";
const SUBTABS: { id: SubTab; label: string; icon: typeof IdCard }[] = [
  { id: "identidad", label: "Identidad", icon: IdCard },
  { id: "tema", label: "Tema visual", icon: Palette },
  { id: "login", label: "Login", icon: LogIn },
  { id: "preview", label: "Vista previa", icon: Eye },
  { id: "historial", label: "Historial", icon: History },
];

type HistoryEntry = { id: number; at: string; actor: string; change: string };

export function BrandingTab() {
  const [saved, setSaved] = useState<Branding | null>(null);
  const [draft, setDraft] = useState<Branding | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sub, setSub] = useState<SubTab>("identidad");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState(false);

  const load = async () => {
    const res = await fetch("/api/td/settings");
    if (!res.ok) return;
    const j = await res.json();
    setSaved(j.branding);
    setDraft(j.branding);
    setHistory(j.brandingHistory ?? []);
  };
  useEffect(() => { load(); }, []);

  if (!draft || !saved) {
    return <p className="flex items-center gap-2 text-[13px] text-muted"><Loader2 size={15} className="animate-spin" /> Cargando branding…</p>;
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof Branding>(k: K, v: Branding[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const save = async () => {
    setSaving(true); setError(null); setOkMsg(false);
    const res = await fetch("/api/td/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branding: draft }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? `Error ${res.status}`);
    } else {
      applyTheme(draft);
      await load();
      setOkMsg(true);
    }
    setSaving(false);
  };

  return (
    <>
      {error && (
        <div className="rise mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3"
          style={{ background: "color-mix(in srgb, var(--bad) 8%, white)" }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--bad)" }} />
          <p className="flex-1 text-[12.5px] leading-relaxed text-ink-soft">{error}</p>
          <button onClick={() => setError(null)} className="text-faint hover:text-ink"><X size={14} /></button>
        </div>
      )}

      {/* sub-pestañas + guardar */}
      <div className="rise mb-5 flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface-2 p-1.5">
        {SUBTABS.map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition-all ${
              sub === t.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            <t.icon size={13} className={sub === t.id ? "text-cyan-deep" : ""} />
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-1">
          {okMsg && !dirty && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ok)" }}>
              <Check size={12} /> Aplicado
            </span>
          )}
          {dirty && <span className="text-[10.5px] text-warn" style={{ color: "var(--warn)" }}>Cambios sin guardar</span>}
          <button onClick={save} disabled={saving || !dirty}
            className="btn-primary !py-1.5 text-[12px] disabled:opacity-40">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Paintbrush size={12} />}
            Guardar y aplicar
          </button>
        </div>
      </div>

      {sub === "identidad" && <IdentidadSection d={draft} set={set} />}
      {sub === "tema" && <TemaSection d={draft} set={set} />}
      {sub === "login" && <LoginSection d={draft} set={set} />}
      {sub === "preview" && <PreviewSection d={draft} />}
      {sub === "historial" && <HistorialSection history={history} />}
    </>
  );
}

/* ─── controles reutilizables ─── */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-1 !text-[8.5px]">{label}</div>
      {children}
      {hint && <p className="mt-1 text-[10px] leading-snug text-faint">{hint}</p>}
    </div>
  );
}

function ShowToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} type="button"
      className={`chip shrink-0 cursor-pointer ${on ? "chip-ok" : ""}`}
      title={on ? "Visible" : "Oculto"}>
      {on ? "Mostrar" : "Oculto"}
    </button>
  );
}

function TextWithToggle({ label, value, show, hint, textarea, onValue, onShow }: {
  label: string; value: string; show: boolean; hint?: string; textarea?: boolean;
  onValue: (v: string) => void; onShow: (v: boolean) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-start gap-2">
        {textarea ? (
          <textarea value={value} onChange={(e) => onValue(e.target.value)} rows={2}
            className="input min-w-0 flex-1 resize-y !py-1.5 text-[12px]" />
        ) : (
          <input type="text" value={value} onChange={(e) => onValue(e.target.value)}
            className="input min-w-0 flex-1 !py-1.5 text-[12px]" />
        )}
        <ShowToggle on={show} onChange={onShow} />
      </div>
    </Field>
  );
}

/** URL + subir archivo local (var/branding → /api/branding-asset/…). */
function UrlUpload({ label, value, hint, onChange }: {
  label: string; value: string | null; hint?: string;
  onChange: (v: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/branding-asset", { method: "POST", body: fd });
    if (res.ok) onChange((await res.json()).url);
    setBusy(false);
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-8 w-8 shrink-0 rounded-lg bg-surface-2 object-contain" />
        )}
        <input type="text" value={value ?? ""} placeholder="https://… o sube un archivo"
          onChange={(e) => onChange(e.target.value || null)}
          className="input min-w-0 flex-1 !py-1.5 font-mono !text-[10.5px]" />
        <label className="btn-ghost shrink-0 cursor-pointer !py-1.5 text-[11px]">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />} Subir
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        </label>
      </div>
    </Field>
  );
}

function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 cursor-pointer rounded-lg border-0 bg-surface-2 p-1" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="input w-24 !py-1.5 text-center font-mono !text-[11px]" />
      </div>
    </Field>
  );
}

function ImageList({ label, items, hint, onChange }: {
  label: string; items: string[]; hint?: string;
  onChange: (v: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/branding-asset", { method: "POST", body: fd });
    if (res.ok) onChange([...items, (await res.json()).url]);
    setBusy(false);
  };
  return (
    <Field label={label} hint={hint}>
      <div className="space-y-1.5">
        {items.map((url, i) => (
          <div key={i} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-9 w-14 shrink-0 rounded-lg bg-surface-2 object-cover" />
            <input type="text" value={url}
              onChange={(e) => onChange(items.map((u, j) => (j === i ? e.target.value : u)))}
              className="input min-w-0 flex-1 !py-1.5 font-mono !text-[10px]" />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-ink" title="Quitar">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={() => onChange([...items, ""])} className="chip cursor-pointer">
            <Plus size={10} /> Agregar URL
          </button>
          <label className="chip cursor-pointer">
            {busy ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />} Subir imagen
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          </label>
        </div>
      </div>
    </Field>
  );
}

/* ═══ Identidad ═══ */

function IdentidadSection({ d, set }: {
  d: Branding; set: <K extends keyof Branding>(k: K, v: Branding[K]) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="rise rise-1">
        <CardHeader title="Identidad de la empresa"
          sub="cómo se identifica la plataforma: nombres, logos, favicon y zona horaria" />
        <div className="space-y-3 px-5 pb-5">
          <TextWithToggle label="Nombre de la plataforma" value={d.platformName}
            show={d.showPlatformName}
            onValue={(v) => set("platformName", v)} onShow={(v) => set("showPlatformName", v)} />
          <Field label="Nombre de la empresa">
            <input type="text" value={d.institutionName}
              onChange={(e) => set("institutionName", e.target.value)}
              className="input !py-1.5 text-[12px]" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sigla">
              <input type="text" value={d.shortName}
                onChange={(e) => set("shortName", e.target.value)}
                className="input !py-1.5 text-[12px]" />
            </Field>
            <Field label="Zona horaria">
              <select value={d.timezone} onChange={(e) => set("timezone", e.target.value)}
                className="input !py-1.5 text-[12px]">
                {BRANDING_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tagline">
            <input type="text" value={d.tagline} onChange={(e) => set("tagline", e.target.value)}
              className="input !py-1.5 text-[12px]" />
          </Field>
          <UrlUpload label="Logo principal (sobre fondos claros)" value={d.logoLight}
            hint="Aparece en la card del login y los exportables."
            onChange={(v) => set("logoLight", v)} />
          <UrlUpload label="Logo alterno (sobre fondos oscuros)" value={d.logoDark}
            hint="Rail lateral y panel de imagen del login. Si no se define, se reusa el principal."
            onChange={(v) => set("logoDark", v)} />
          <UrlUpload label="Favicon (icono de pestaña)" value={d.favicon}
            onChange={(v) => set("favicon", v)} />
        </div>
      </Card>

      <Card className="rise rise-2 self-start">
        <CardHeader title="Presets rápidos"
          sub="una combinación lista de colores, tipografía y radio — ajústala luego en «Tema visual»" />
        <div className="grid gap-2.5 px-5 pb-5 sm:grid-cols-2">
          {BRAND_PRESETS.map((p) => {
            const active = d.primary === p.values.primary && d.accent === p.values.accent && d.font === p.values.font;
            return (
              <button key={p.id}
                onClick={() => {
                  set("primary", p.values.primary);
                  set("secondary", p.values.secondary);
                  set("accent", p.values.accent);
                  set("font", p.values.font);
                  set("radius", p.values.radius);
                }}
                className={`rounded-xl p-3 text-left transition-all ${
                  active ? "ring-2 ring-cyan bg-cyan-wash" : "bg-surface-2 hover:bg-surface-3"}`}>
                <div className="flex items-center gap-1.5">
                  {[p.values.primary, p.values.secondary, p.values.accent].map((c, i) => (
                    <i key={i} className="h-4 w-4 rounded-full" style={{ background: c }} />
                  ))}
                  <span className="ml-1 text-[12px] font-bold text-ink">{p.name}</span>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-muted">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ═══ Tema visual ═══ */

function TemaSection({ d, set }: {
  d: Branding; set: <K extends keyof Branding>(k: K, v: Branding[K]) => void;
}) {
  const der = derive(d.primary);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="rise rise-1">
        <CardHeader title="Colores" sub="la paleta base — hover y focus se derivan automáticamente" />
        <div className="space-y-3 px-5 pb-5">
          <div className="grid grid-cols-3 gap-3">
            <ColorField label="Primario" value={d.primary} onChange={(v) => set("primary", v)} />
            <ColorField label="Secundario" value={d.secondary} onChange={(v) => set("secondary", v)} />
            <ColorField label="Acento" value={d.accent} onChange={(v) => set("accent", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hover automático">
              <div className="flex items-center gap-2">
                <i className="h-7 w-7 rounded-lg" style={{ background: der.hover }} />
                <span className="num text-[10.5px] text-muted">{der.hover}</span>
              </div>
            </Field>
            <Field label="Focus automático">
              <div className="flex items-center gap-2">
                <i className="h-7 w-7 rounded-lg" style={{ background: der.focus }} />
                <span className="num text-[10.5px] text-muted">{der.focus}</span>
              </div>
            </Field>
          </div>
          <Field label="Aplicación">
            <div className="overflow-hidden rounded-xl">
              <div className="h-2" style={{ background: `linear-gradient(90deg, ${derive(d.accent).fill}, ${d.accent} 38%, ${d.primary})` }} />
              <div className="flex items-center gap-3 p-3" style={{ background: `linear-gradient(160deg, ${d.secondary}, ${d.primary})` }}>
                <span className="text-[11px] font-bold text-white">{d.shortName}</span>
                <span className="chip !py-0 !text-[8.5px]" style={{ background: "rgba(255,255,255,.12)", color: derive(d.accent).fill }}>
                  acento
                </span>
              </div>
            </div>
          </Field>
        </div>
      </Card>

      <Card className="rise rise-2 self-start">
        <CardHeader title="Tipografía y forma"
          sub="fuente principal, radio de bordes, ancho máximo y estilo de botón" />
        <div className="space-y-3 px-5 pb-5">
          <Field label="Fuente principal (Google Fonts)">
            <select value={d.font} onChange={(e) => set("font", e.target.value)}
              className="input !py-1.5 text-[12px]">
              {BRANDING_FONTS.map((f) => <option key={f} value={f}>{f}{f === "Inter" ? " (por defecto)" : ""}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Radio de borde">
              <input type="text" value={d.radius} onChange={(e) => set("radius", e.target.value)}
                placeholder="0.8rem" className="input !py-1.5 font-mono !text-[11.5px]" />
            </Field>
            <Field label="Estilo de botón">
              <div className="flex gap-1.5">
                {(["solid", "outline"] as const).map((st) => (
                  <button key={st} onClick={() => set("buttonStyle", st)}
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                      d.buttonStyle === st ? "text-white" : "text-muted"}`}
                    style={d.buttonStyle === st
                      ? { background: d.primary }
                      : { boxShadow: `inset 0 0 0 1.5px ${d.primary}`, color: d.primary }}>
                    {st === "solid" ? "Sólido" : "Outline"}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Ancho máximo de página">
            <div className="flex flex-wrap gap-1.5">
              {["1100px", "1220px", "1260px", "1440px", "1600px", "100%"].map((w) => (
                <button key={w} onClick={() => set("maxWidth", w)}
                  className={`chip cursor-pointer ${d.maxWidth === w ? "chip-cyan" : ""}`}>
                  {w}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Muestra" hint="así se ven un botón y una tarjeta con esta configuración">
            <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3"
              style={{ fontFamily: `"${d.font}", Inter, sans-serif` }}>
              <button className="px-3.5 py-1.5 text-[12px] font-bold text-white"
                style={{ background: d.buttonStyle === "solid" ? d.primary : "transparent",
                  color: d.buttonStyle === "solid" ? "#fff" : d.primary,
                  boxShadow: d.buttonStyle === "outline" ? `inset 0 0 0 1.5px ${d.primary}` : undefined,
                  borderRadius: d.radius }}>
                Acción principal
              </button>
              <span className="bg-surface px-3 py-1.5 text-[11.5px] text-ink shadow-sm"
                style={{ borderRadius: d.radius }}>
                Tarjeta {d.radius}
              </span>
            </div>
          </Field>
        </div>
      </Card>
    </div>
  );
}

/* ═══ Login ═══ */

const LAYOUTS = [
  { id: "image-left", label: "Imagen izquierda / Formulario derecha" },
  { id: "image-right", label: "Imagen derecha / Formulario izquierda" },
  { id: "centered", label: "Centrado con imagen de fondo" },
] as const;

function LoginSection({ d, set }: {
  d: Branding; set: <K extends keyof Branding>(k: K, v: Branding[K]) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <Card className="rise rise-1">
          <CardHeader title="Layout" sub="disposición de la pantalla de acceso" />
          <div className="grid gap-2 px-5 pb-5 sm:grid-cols-3">
            {LAYOUTS.map((l) => (
              <button key={l.id} onClick={() => set("loginLayout", l.id)}
                className={`rounded-xl p-2.5 text-left transition-all ${
                  d.loginLayout === l.id ? "ring-2 ring-cyan bg-cyan-wash" : "bg-surface-2 hover:bg-surface-3"}`}>
                <div className="flex h-10 gap-1 overflow-hidden rounded-lg">
                  {l.id === "image-left" && (<><i className="w-1/2" style={{ background: d.primary }} /><i className="w-1/2 bg-surface" /></>)}
                  {l.id === "image-right" && (<><i className="w-1/2 bg-surface" /><i className="w-1/2" style={{ background: d.primary }} /></>)}
                  {l.id === "centered" && (
                    <i className="grid w-full place-items-center" style={{ background: d.primary }}>
                      <i className="h-6 w-10 rounded bg-surface" />
                    </i>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] font-semibold leading-snug text-ink">{l.label}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="rise rise-2">
          <CardHeader title="Textos del formulario" sub="con visibilidad individual" />
          <div className="space-y-3 px-5 pb-5">
            <TextWithToggle label="Titular del login" value={d.loginTitle} show={d.showLoginTitle}
              onValue={(v) => set("loginTitle", v)} onShow={(v) => set("showLoginTitle", v)} />
            <TextWithToggle label="Mensaje de bienvenida" value={d.loginWelcome} show={d.showLoginWelcome} textarea
              onValue={(v) => set("loginWelcome", v)} onShow={(v) => set("showLoginWelcome", v)} />
            <TextWithToggle label="Mensaje de soporte" value={d.loginSupport} show={d.showLoginSupport}
              onValue={(v) => set("loginSupport", v)} onShow={(v) => set("showLoginSupport", v)} />
          </div>
        </Card>

        <Card className="rise rise-3">
          <CardHeader title="Loader de la plataforma" sub="imagen/GIF y texto durante transiciones y esperas" />
          <div className="space-y-3 px-5 pb-5">
            <UrlUpload label="Imagen o GIF de carga" value={d.loader}
              onChange={(v) => set("loader", v)} />
            <TextWithToggle label="Texto del loader" value={d.loaderText} show={d.showLoaderText}
              onValue={(v) => set("loaderText", v)} onShow={(v) => set("showLoaderText", v)} />
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="rise rise-2">
          <CardHeader title="Bloque sobre la imagen" sub="titular, mensajes en rotación y soporte" />
          <div className="space-y-3 px-5 pb-5">
            <TextWithToggle label="Titular sobre imagen" value={d.heroTitle} show={d.showHeroTitle} textarea
              onValue={(v) => set("heroTitle", v)} onShow={(v) => set("showHeroTitle", v)} />
            <Field label="Mensajes de bienvenida sobre imagen (rotan por carga)">
              <div className="space-y-1.5">
                {d.heroMessages.map((m, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <textarea value={m} rows={2}
                      onChange={(e) => set("heroMessages", d.heroMessages.map((x, j) => (j === i ? e.target.value : x)))}
                      className="input min-w-0 flex-1 resize-y !py-1.5 text-[11.5px]" />
                    <button onClick={() => set("heroMessages", d.heroMessages.filter((_, j) => j !== i))}
                      className="rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-ink"><Trash2 size={13} /></button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <button onClick={() => set("heroMessages", [...d.heroMessages, ""])}
                    className="chip cursor-pointer"><Plus size={10} /> Agregar mensaje</button>
                  <ShowToggle on={d.showHeroMessages} onChange={(v) => set("showHeroMessages", v)} />
                </div>
              </div>
            </Field>
            <TextWithToggle label="Mensaje de soporte sobre imagen" value={d.heroSupport} show={d.showHeroSupport}
              onValue={(v) => set("heroSupport", v)} onShow={(v) => set("showHeroSupport", v)} />
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Color de capa (overlay)" value={d.overlayColor}
                onChange={(v) => set("overlayColor", v)} />
              <Field label={`Opacidad de capa · ${d.overlayOpacity}%`}>
                <input type="range" min={0} max={100} value={d.overlayOpacity}
                  onChange={(e) => set("overlayOpacity", Number(e.target.value))}
                  className="w-full accent-current" style={{ color: d.accent }} />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="rise rise-3">
          <CardHeader title="Imágenes del acceso" sub="rotación aleatoria por carga" />
          <div className="space-y-4 px-5 pb-5">
            <ImageList label="Imágenes del panel lateral" items={d.panelImages}
              hint="Se usan en los layouts con imagen lateral."
              onChange={(v) => set("panelImages", v)} />
            <ImageList label="Imágenes de fondo (layout centrado)" items={d.backgroundImages}
              hint="Fondo completo cuando el login es centrado."
              onChange={(v) => set("backgroundImages", v)} />
          </div>
        </Card>

        <Card className="rise rise-4">
          <CardHeader title="CSS personalizado (avanzado)"
            sub="se inyecta al final del tema — para ajustes finos puntuales" />
          <div className="px-5 pb-5">
            <textarea value={d.customCss} rows={5}
              onChange={(e) => set("customCss", e.target.value)}
              placeholder={`.kicker { letter-spacing: 0.2em; }`}
              className="input w-full resize-y font-mono !text-[11px]" />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══ Vista previa ═══ */

function PreviewSection({ d }: { d: Branding }) {
  const panelImg = d.panelImages[0] ?? d.backgroundImages[0] ?? null;
  const overlay = `${d.overlayColor}${Math.round(d.overlayOpacity * 2.55).toString(16).padStart(2, "0")}`;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="rise rise-1 overflow-hidden">
        <CardHeader title="Login" sub={`layout: ${LAYOUTS.find((l) => l.id === d.loginLayout)?.label}`} />
        <div className="px-5 pb-5" style={{ fontFamily: `"${d.font}", Inter, sans-serif` }}>
          <div className={`flex h-64 overflow-hidden shadow-md ${d.loginLayout === "image-right" ? "flex-row-reverse" : ""}`}
            style={{ borderRadius: d.radius }}>
            {d.loginLayout !== "centered" && (
              <div className="relative w-1/2 p-4"
                style={{ background: panelImg ? `url(${panelImg}) center/cover` : d.primary }}>
                <div className="absolute inset-0" style={{ background: overlay }} />
                <div className="relative flex h-full flex-col justify-between">
                  <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-white">
                    {d.showPlatformName ? d.platformName : ""}
                  </span>
                  <div>
                    {d.showHeroTitle && (
                      <p className="text-[13px] font-extrabold leading-tight text-white">{d.heroTitle}</p>
                    )}
                    {d.showHeroMessages && d.heroMessages[0] && (
                      <p className="mt-1.5 text-[9px] italic leading-snug text-white/75">“{d.heroMessages[0]}”</p>
                    )}
                  </div>
                  <span className="font-mono text-[7px] uppercase tracking-widest text-white/60">
                    {d.showHeroSupport ? d.heroSupport : d.tagline}
                  </span>
                </div>
              </div>
            )}
            <div className={`relative flex flex-1 items-center justify-center bg-bg p-4 ${d.loginLayout === "centered" ? "" : ""}`}
              style={d.loginLayout === "centered" && panelImg
                ? { background: `url(${panelImg}) center/cover` } : undefined}>
              {d.loginLayout === "centered" && <div className="absolute inset-0" style={{ background: overlay }} />}
              <div className="relative w-40 bg-surface p-3 shadow-lg" style={{ borderRadius: d.radius }}>
                {d.logoLight ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.logoLight} alt="" className="mb-1.5 h-5 object-contain" />
                ) : (
                  <div className="mb-1 text-[10px] font-extrabold" style={{ color: d.primary }}>
                    {d.showPlatformName ? d.platformName : d.shortName}
                  </div>
                )}
                {d.showLoginTitle && <div className="text-[11px] font-extrabold text-ink">{d.loginTitle}</div>}
                {d.showLoginWelcome && <p className="mt-0.5 text-[7.5px] leading-snug text-muted">{d.loginWelcome}</p>}
                <div className="mt-2 space-y-1">
                  <div className="h-4 rounded bg-surface-2" />
                  <div className="h-4 rounded bg-surface-2" />
                  <div className="grid h-5 place-items-center text-[8px] font-bold text-white"
                    style={{ background: d.buttonStyle === "solid" ? d.primary : "transparent",
                      color: d.buttonStyle === "solid" ? "#fff" : d.primary,
                      boxShadow: d.buttonStyle === "outline" ? `inset 0 0 0 1px ${d.primary}` : undefined,
                      borderRadius: `calc(${d.radius} / 1.5)` }}>
                    Entrar
                  </div>
                </div>
                {d.showLoginSupport && <p className="mt-1.5 text-[7px] text-faint">{d.loginSupport}</p>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rise rise-2 self-start overflow-hidden">
        <CardHeader title="Plataforma" sub="rail, paleta y componentes con esta identidad" />
        <div className="space-y-3 px-5 pb-5" style={{ fontFamily: `"${d.font}", Inter, sans-serif` }}>
          <div className="overflow-hidden p-4" style={{ background: `linear-gradient(160deg, ${d.secondary}, ${d.primary})`, borderRadius: d.radius }}>
            <div className="flex items-center gap-2">
              {d.logoDark || d.logoLight ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(d.logoDark ?? d.logoLight)!} alt="" className="h-6 object-contain" />
              ) : (
                <span className="text-[13px] font-extrabold text-white">{d.platformName}</span>
              )}
            </div>
            <div className="mt-3 overflow-hidden bg-white/[0.06]" style={{ borderRadius: `calc(${d.radius} / 1.2)` }}>
              <div className="h-[2.5px]" style={{ background: `linear-gradient(90deg, ${derive(d.accent).fill}, ${d.accent})` }} />
              <div className="px-3.5 py-2.5">
                <div className="text-[12px] font-bold text-white">{d.shortName}</div>
                <div className="text-[9.5px] text-white/45">{d.institutionName}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[d.primary, d.secondary, d.accent, derive(d.accent).fill].map((c, i) => (
              <span key={i} className="flex-1 rounded-lg py-2 text-center font-mono text-[8px] text-white" style={{ background: c }}>
                {c}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="chip" style={{ color: derive(d.accent).deep }}>kicker</span>
            <span className="rounded-full px-2.5 py-1 font-bold text-white" style={{ background: d.accent }}>chip activo</span>
            <span className="num font-bold" style={{ color: derive(d.accent).deep }}>3,2</span>
            <span className="text-faint">· {d.font} · radio {d.radius} · {d.maxWidth}</span>
          </div>
          {d.loader && (
            <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.loader} alt="" className="h-6 w-6 object-contain" />
              {d.showLoaderText && <span className="text-[10.5px] text-muted">{d.loaderText}…</span>}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ═══ Historial ═══ */

function HistorialSection({ history }: { history: HistoryEntry[] }) {
  return (
    <Card className="rise rise-1">
      <CardHeader title="Historial de cambios"
        sub="cada guardado queda auditado con autor, fecha y campos tocados" />
      <div className="px-5 pb-5">
        {history.length === 0 ? (
          <p className="py-4 text-[12px] italic text-faint">
            Sin cambios registrados aún — el primer «Guardar y aplicar» abre el historial.
          </p>
        ) : (
          <div className="relative space-y-3 pl-5">
            <span className="absolute bottom-1 left-[7px] top-1 w-px bg-line-strong" />
            {history.map((h) => (
              <div key={h.id} className="relative">
                <span className="absolute -left-[18px] top-[3px] grid h-[14px] w-[14px] place-items-center rounded-full bg-surface"
                  style={{ boxShadow: "0 0 0 1.5px var(--cyan)" }}>
                  <ImageIcon size={7} className="text-cyan-deep" />
                </span>
                <div className="num text-[9.5px] font-bold text-faint">
                  {new Date(h.at).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {h.actor}
                </div>
                <div className="text-[12px] leading-snug text-ink-soft">{h.change}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
