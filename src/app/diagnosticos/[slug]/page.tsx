import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { DESARROLLADO_POR, MarcaGE } from "@/components/logo";
import { DIAGNOSTICOS_PUBLICOS, diagnosticoPublico } from "@/data/diagnosticos-publicos";
import { CONTACTO_SITIO } from "@/app/sitio-publico";
import "../../sitio.css";

// /diagnosticos/<slug> — página pública de cada diagnóstico de entrada: para qué sirve y cómo funciona.
// Componente de servidor, sin JavaScript propio, con los estilos del sitio público.
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
            <Link href="/#diagnosticos" className="sp-sub-volver"><ArrowLeft size={15} /> Diagnósticos</Link>
            <span className="sp-kicker">Diagnóstico de entrada</span>
            <h1 className="sp-sub-h1">{d.titulo}</h1>
            <p className="sp-hero-p">{d.bajada}</p>
            <div className="sp-cta">
              <Link href="/codigo" className="sp-btn sp-btn-oro">Tengo un código <ArrowRight size={17} strokeWidth={2.4} /></Link>
              <a href={solicitar} className="sp-btn sp-btn-linea">Solicitar un código</a>
            </div>
            <dl className="sp-sub-cifras">{d.cifras.map((c) => <div key={c.rotulo}><dt>{c.valor}</dt><dd>{c.rotulo}</dd></div>)}</dl>
          </div>
        </section>

        <section className="sp-sec sp-blanca" aria-labelledby="proposito">
          <div className="sp-wrap">
            <span className="sp-kicker">Propósito</span>
            <h2 className="sp-h2" id="proposito">Para qué sirve</h2>
            <div className="sp-sub-grid">{d.proposito.map((p) => <article key={p.t} className="sp-sub-tarjeta"><h3>{p.t}</h3><p>{p.d}</p></article>)}</div>
          </div>
        </section>

        <section className="sp-sec" aria-labelledby="como">
          <div className="sp-wrap sp-sub-dos">
            <div>
              <span className="sp-kicker">Paso a paso</span>
              <h2 className="sp-h2" id="como">Cómo funciona</h2>
              <ol className="sp-sub-pasos">{d.pasos.map((p, i) => <li key={p.t}><span aria-hidden="true">{i + 1}</span><div><h3>{p.t}</h3><p>{p.d}</p></div></li>)}</ol>
            </div>
            <aside className="sp-sub-recibes" aria-labelledby="recibes">
              <h2 id="recibes">Qué recibes</h2>
              <ul>{d.recibes.map((r) => <li key={r}><Check size={17} strokeWidth={2.6} /><span>{r}</span></li>)}</ul>
            </aside>
          </div>
        </section>

        <section className="sp-sec sp-blanca" aria-labelledby="antes">
          <div className="sp-wrap">
            <span className="sp-kicker">Antes de empezar</span>
            <h2 className="sp-h2" id="antes">Lo que conviene saber</h2>
            <div className="sp-sub-grid sp-sub-grid-3">{d.responde.map((p) => <article key={p.t} className="sp-sub-tarjeta"><h3>{p.t}</h3><p>{p.d}</p></article>)}</div>
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
