import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Bot, Briefcase, Building2, ChartNoAxesColumn, ClipboardList, Compass, Crosshair, Eye, FileBarChart, FileCheck2,
  Flag, GitCompareArrows, Handshake, KeyRound, Layers, ListChecks, Lock, MapPinned, MessagesSquare, Milestone, Presentation, Printer,
  Route, Scale, ScanSearch, SearchCheck, Shield, Signpost, Target, TrendingUp, Users, Wallet, X, type LucideIcon,
} from "lucide-react";
import { DESARROLLADO_POR, MarcaGE } from "@/components/logo";
import { DIAGNOSTICOS_PUBLICOS, diagnosticoPublico } from "@/data/diagnosticos-publicos";
import { CONTACTO_SITIO } from "@/app/sitio-publico";
import { SECCIONES } from "./secciones";
import "../../sitio.css";

// /diagnosticos/<slug> — página pública de cada diagnóstico de entrada: propósito, qué mide, cómo se hace, cómo se
// calcula, qué resultados arroja (con figuras de ejemplo) y para qué sirven. Componente de servidor, sin JavaScript
// propio, con los estilos del sitio público.
const ICONOS: Record<string, LucideIcon> = {
  Bot, Briefcase, Building2, ChartNoAxesColumn, ClipboardList, Compass, Crosshair, Eye, FileBarChart, FileCheck2, Flag, GitCompareArrows,
  Handshake, KeyRound, Layers, ListChecks, Lock, MapPinned, MessagesSquare, Milestone, Presentation, Printer, Route, Scale, ScanSearch,
  SearchCheck, Shield, Signpost, Target, TrendingUp, Users, Wallet,
};
const Ico = ({ n, size = 20 }: { n: string; size?: number }) => { const I = ICONOS[n] ?? Signpost; return <I size={size} aria-hidden="true" />; };
const QUIEN: Record<string, string> = { "Tú": "tu", "La plataforma": "plataforma", "Tu asesor": "asesor" };
const INDICE = [["proposito", "Propósito"], ["mide", "Qué mide"], ["como", "Cómo se hace"], ["calculo", "Cómo se calcula"], ["resultados", "Resultados"], ["usos", "Para qué sirven"], ["antes", "Antes de empezar"]];
export function generateStaticParams() { return DIAGNOSTICOS_PUBLICOS.map((d) => ({ slug: d.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = diagnosticoPublico((await params).slug);
  return d ? { title: `${d.titulo} · Gestión estratégica`, description: d.bajada } : {};
}

export default async function DiagnosticoPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = diagnosticoPublico((await params).slug);
  if (!d) notFound();
  const otro = DIAGNOSTICOS_PUBLICOS.find((x) => x.slug !== d.slug)!;
  const solicitar = `mailto:${CONTACTO_SITIO}?subject=${encodeURIComponent(d.asunto)}`;
  const S = SECCIONES[d.slug];
  return (
    <div className="sp">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <header className="sp-top">
        <div className="sp-wrap sp-top-in">
          <Link href="/" aria-label="Gestión estratégica, inicio"><MarcaGE oscura firma={false} alto="32px" /></Link>
          <nav className="sp-nav" aria-label="Diagnósticos">
            <Link href="/">Inicio</Link>
            {DIAGNOSTICOS_PUBLICOS.map((x) => <Link key={x.slug} href={`/diagnosticos/${x.slug}`} aria-current={x.slug === d.slug ? "page" : undefined}>{x.corto}</Link>)}
          </nav>
          <Link href="/codigo" className="sp-btn sp-btn-linea sp-btn-chico">Tengo un código</Link>
        </div>
      </header>

      <main id="contenido">
        <section className="sp-hero sp-sub-hero">
          <div className="sp-wrap sp-sub-hero-in">
            <div className="sp-dx-hero">
              <div>
                <Link href="/#diagnosticos" className="sp-sub-volver"><ArrowLeft size={15} /> Diagnósticos</Link>
                <span className="sp-kicker">Diagnóstico de entrada</span>
                <h1 className="sp-sub-h1">{d.titulo}</h1>
                <p className="sp-hero-p">{d.bajada}</p>
                <div className="sp-cta">
                  <Link href="/codigo" className="sp-btn sp-btn-oro">Tengo un código <ArrowRight size={17} strokeWidth={2.4} /></Link>
                  <a href={solicitar} className="sp-btn sp-btn-linea">Solicitar un código</a>
                </div>
              </div>
              {S && <div className="sp-dx-hero-vista"><S.portada /><p className="sp-nota-fig">Vista ilustrativa del informe, con datos de ejemplo.</p></div>}
            </div>
            <dl className="sp-sub-cifras">{d.cifras.map((c) => <div key={c.rotulo}><dt>{c.valor}</dt><dd>{c.rotulo}</dd></div>)}</dl>
          </div>
        </section>

        <nav className="sp-dx-indice-nav" aria-label="En esta página">
          <div className="sp-wrap"><span>En esta página</span>{INDICE.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}</div>
        </nav>

        <section id="proposito" className="sp-sec sp-blanca" aria-labelledby="proposito-t">
          <div className="sp-wrap">
            <span className="sp-kicker">Propósito</span>
            <h2 className="sp-h2" id="proposito-t">Para qué sirve</h2>
            <div className="sp-dx-icards sp-dx-icards-4">{d.proposito.map((p) => <article key={p.t} className="sp-dx-icard"><span className="sp-dx-ico sp-dx-ico-g"><Ico n={p.icono} size={22} /></span><h3>{p.t}</h3><p>{p.d}</p></article>)}</div>
          </div>
        </section>

        {S && <S.mide />}

        <section id="como" className="sp-sec sp-blanca" aria-labelledby="como-t">
          <div className="sp-wrap">
            <span className="sp-kicker">Paso a paso</span>
            <h2 className="sp-h2" id="como-t">Cómo se hace</h2>
            <p className="sp-lead sp-dx-lead">{d.duracion}</p>
            <ol className="sp-dx-linea" style={{ "--n": d.pasos.length } as CSSProperties}>
              {d.pasos.map((p, i) => (
                <li key={p.t} data-quien={QUIEN[p.quien]}>
                  <span className="sp-dx-linea-ico"><Ico n={p.icono} size={22} /></span>
                  <div><small>Paso {i + 1} · <b>{p.quien}</b></small><h3>{p.t}</h3><p>{p.d}</p></div>
                </li>
              ))}
            </ol>
            <aside className="sp-dx-recibes" aria-labelledby="recibes">
              <h2 id="recibes">Qué recibes</h2>
              <ul>{d.recibes.map((r) => <li key={r.t}><span><Ico n={r.icono} size={19} /></span>{r.t}</li>)}</ul>
            </aside>
          </div>
        </section>

        {S && <S.calculo />}
        {S && <S.resultados />}

        <section id="usos" className="sp-sec" aria-labelledby="usos-t">
          <div className="sp-wrap">
            <span className="sp-kicker">Para qué sirven los resultados</span>
            <h2 className="sp-h2 sp-dx-h2" id="usos-t">Lo que la dirección puede hacer con ellos</h2>
            <div className="sp-dx-icards sp-dx-icards-3 sp-dx-icards-b">{d.usos.map((u) => <article key={u.t} className="sp-dx-icard"><span className="sp-dx-ico sp-dx-ico-g"><Ico n={u.icono} size={22} /></span><h3>{u.t}</h3><p>{u.d}</p></article>)}</div>
            <div className="sp-dx-noes">
              <h3>Lo que no es</h3>
              <ul>{d.noEs.map((x) => <li key={x.t}><span><X size={16} strokeWidth={3} aria-hidden="true" /></span><div><b>{x.t}</b>{x.d}</div></li>)}</ul>
            </div>
          </div>
        </section>

        <section id="antes" className="sp-sec sp-blanca" aria-labelledby="antes-t">
          <div className="sp-wrap">
            <span className="sp-kicker">Antes de empezar</span>
            <h2 className="sp-h2" id="antes-t">Lo que conviene saber</h2>
            <div className="sp-dx-icards sp-dx-icards-3">{d.responde.map((p) => <article key={p.t} className="sp-dx-icard"><span className="sp-dx-ico sp-dx-ico-g"><Ico n={p.icono} size={22} /></span><h3>{p.t}</h3><p>{p.d}</p></article>)}</div>
          </div>
        </section>

        <section className="sp-sec sp-cierre">
          <div className="sp-wrap">
            <h2 className="sp-h2">El acceso es con un código personal.</h2>
            <p className="sp-lead">Lo genera y lo envía el equipo que acompaña el diagnóstico. Con él registras tu organización y entras directo.</p>
            <div className="sp-cta">
              <Link href="/codigo" className="sp-btn sp-btn-oro">Tengo un código <ArrowRight size={17} strokeWidth={2.4} /></Link>
              <a href={solicitar} className="sp-btn sp-btn-linea">Solicitar un código</a>
            </div>
            <p className="sp-cierre-o">También puedes conocer el <Link href={`/diagnosticos/${otro.slug}`} className="sp-sub-enlace">{otro.titulo.charAt(0).toLowerCase() + otro.titulo.slice(1)}</Link>.</p>
          </div>
        </section>
      </main>

      <footer className="sp-pie">
        <div className="sp-wrap sp-pie-in">
          <MarcaGE oscura firma={false} alto="30px" />
          <nav aria-label="Pie de página">
            <Link href="/">Inicio</Link>
            {DIAGNOSTICOS_PUBLICOS.map((x) => <Link key={x.slug} href={`/diagnosticos/${x.slug}`}>{x.corto}</Link>)}
            <Link href="/codigo">Tengo un código</Link>
            <Link href="/login">Iniciar sesión</Link>
          </nav>
        </div>
        <div className="sp-wrap sp-pie-legal"><span>© {new Date().getFullYear()} Gestión estratégica</span><span>{DESARROLLADO_POR}</span></div>
      </footer>
    </div>
  );
}
