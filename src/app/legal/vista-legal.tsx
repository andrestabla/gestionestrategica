import Link from "next/link";
import { ArrowLeft, Download, FileText, ShieldCheck } from "lucide-react";
import { DESARROLLADO_POR, MarcaGE } from "@/components/logo";
import { DOCUMENTOS_LEGALES, PROVEEDOR, fechaLarga, llenarDoc, rutaDoc, type Bloque, type DocLegal } from "@/lib/legal";
import "../sitio.css";

// Vista pública de un documento legal (/privacidad, /seguridad, /legal/<id>) con los estilos del sitio público:
// portada oscura, índice lateral y el texto por secciones. Componente de servidor, sin JavaScript propio.

export function MarcoLegal({ children, actual }: { children: React.ReactNode; actual?: string }) {
  const anio = new Date().getFullYear();
  return (
    <div className="sp">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <header className="sp-top">
        <div className="sp-wrap sp-top-in">
          <Link href="/" aria-label="Gestión estratégica, inicio"><MarcaGE oscura firma={false} alto="32px" /></Link>
          <nav className="sp-nav" aria-label="Documentos legales">
            <Link href="/legal" aria-current={actual === "legal" ? "page" : undefined}>Confianza</Link>
            <Link href="/privacidad" aria-current={actual === "tratamiento" ? "page" : undefined}>Privacidad</Link>
            <Link href="/seguridad" aria-current={actual === "seguridad" ? "page" : undefined}>Seguridad</Link>
          </nav>
          <Link href="/login" className="sp-btn sp-btn-linea sp-btn-chico">Iniciar sesión</Link>
        </div>
      </header>
      <main id="contenido">{children}</main>
      <footer className="sp-pie">
        <div className="sp-wrap sp-pie-in">
          <MarcaGE oscura firma={false} alto="30px" />
          <nav aria-label="Pie de página">
            <Link href="/">Inicio</Link>
            {DOCUMENTOS_LEGALES.map((d) => <Link key={d.id} href={rutaDoc(d.id)}>{d.corto}</Link>)}
          </nav>
        </div>
        <div className="sp-wrap sp-pie-legal"><span>© {anio} {PROVEEDOR.razon} · NIT {PROVEEDOR.nit}</span><span>{DESARROLLADO_POR}</span></div>
      </footer>
    </div>
  );
}

function Bloques({ bloques }: { bloques: Bloque[] }) {
  return <>{bloques.map((b, i) => {
    if (typeof b === "string") return <p key={i}>{b}</p>;
    if ("lista" in b) return <ul key={i}>{b.lista.map((x, j) => <li key={j}>{x}</li>)}</ul>;
    if ("nota" in b) return <p key={i} className="sp-legal-nota">{b.nota}</p>;
    return (
      <div key={i} className="sp-legal-tabla" role="region" aria-label="Tabla" tabIndex={0}>
        <table><thead><tr>{b.tabla.cabeza.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{b.tabla.filas.map((f, j) => <tr key={j}>{f.map((c, k) => (k === 0 ? <th key={k} scope="row">{c}</th> : <td key={k}>{c}</td>))}</tr>)}</tbody></table>
      </div>
    );
  })}</>;
}

/** Documento completo. Las plantillas se muestran como modelo, con los espacios que se llenan al firmar. */
export function VistaLegal({ doc: original }: { doc: DocLegal }) {
  const doc = llenarDoc(original);   // los campos sin dato quedan como espacio para completar
  return (
    <MarcoLegal actual={doc.id}>
      <section className="sp-hero sp-sub-hero sp-oscura">
        <div className="sp-wrap sp-sub-hero-in sp-legal-hero">
          <Link href="/legal" className="sp-sub-volver"><ArrowLeft size={15} /> Centro de confianza</Link>
          <span className="sp-kicker">{doc.plantilla ? "Modelo de documento" : "Política"}</span>
          <h1 className="sp-sub-h1">{doc.plantilla ? doc.corto : doc.titulo}</h1>
          <p className="sp-hero-p">{doc.resumen}</p>
          <div className="sp-legal-meta">
            <span>Versión del {fechaLarga(doc.version)}</span>
            <span>{PROVEEDOR.razon} · NIT {PROVEEDOR.nit}</span>
            <a href={`/api/legal/${doc.id}`} className="sp-legal-descarga"><Download size={14} /> Descargar en Word</a>
          </div>
        </div>
      </section>
      <section className="sp-sec sp-blanca sp-legal-sec">
        <div className="sp-wrap sp-legal-grid">
          <nav className="sp-legal-indice" aria-label="En este documento">
            <span>En este documento</span>
            {doc.secciones.map((s) => <a key={s.id} href={`#${s.id}`}>{s.titulo}</a>)}
          </nav>
          <article className="sp-legal-texto">
            {doc.plantilla && <p className="sp-legal-nota">Este es el modelo que se firma con cada empresa cliente. Los espacios en blanco se completan con sus datos al descargarlo desde la administración de la plataforma.</p>}
            {doc.secciones.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`}>
                <h2 id={`${s.id}-t`}>{s.titulo}</h2>
                <Bloques bloques={s.bloques} />
              </section>
            ))}
            <p className="sp-legal-contacto">Consultas sobre este documento: <a href={`mailto:${PROVEEDOR.correo}`}>{PROVEEDOR.correo}</a>.</p>
          </article>
        </div>
      </section>
    </MarcoLegal>
  );
}

/** Índice: el centro de confianza con los cinco documentos. */
export function IndiceLegal() {
  const politicas = DOCUMENTOS_LEGALES.filter((d) => !d.plantilla), modelos = DOCUMENTOS_LEGALES.filter((d) => d.plantilla);
  const tarjeta = (d: DocLegal) => (
    <Link key={d.id} href={rutaDoc(d.id)} className="sp-sub-tarjeta sp-legal-tarjeta">
      <span className="sp-legal-ico">{d.id === "seguridad" ? <ShieldCheck size={20} /> : <FileText size={20} />}</span>
      <h3>{d.corto}</h3>
      <p>{d.resumen}</p>
      <small>Versión del {fechaLarga(d.version)}</small>
    </Link>
  );
  return (
    <MarcoLegal actual="legal">
      <section className="sp-hero sp-sub-hero sp-oscura">
        <div className="sp-wrap sp-sub-hero-in sp-legal-hero">
          <span className="sp-kicker">Centro de confianza</span>
          <h1 className="sp-sub-h1">La información de tu empresa es de tu empresa</h1>
          <p className="sp-hero-p">En la plataforma se registran la estrategia, las cifras y las decisiones de cada empresa. Aquí están las políticas con las que la protegemos y los acuerdos que firmamos con cada cliente.</p>
        </div>
      </section>
      <section className="sp-sec sp-blanca">
        <div className="sp-wrap">
          <span className="sp-kicker">Políticas</span>
          <h2 className="sp-h2">Cómo tratamos y protegemos la información</h2>
          <div className="sp-sub-grid sp-sub-grid-3">{politicas.map(tarjeta)}</div>
          <span className="sp-kicker sp-legal-sep">Acuerdos con cada empresa</span>
          <h2 className="sp-h2">Lo que firmamos antes de empezar</h2>
          <div className="sp-sub-grid">{modelos.map(tarjeta)}</div>
          <p className="sp-legal-contacto">Responsable de seguridad y protección de datos: {PROVEEDOR.oficial} · <a href={`mailto:${PROVEEDOR.correo}`}>{PROVEEDOR.correo}</a>.</p>
        </div>
      </section>
    </MarcoLegal>
  );
}
