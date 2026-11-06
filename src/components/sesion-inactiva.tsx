"use client";

// Cierre por inactividad: si la persona lleva INACTIVIDAD_MIN minutos sin interactuar (en cualquier pestaña de esta
// plataforma), se cierra la sesión y se abre un modal que lo explica. Mientras hay actividad, un ping cada 5 minutos
// renueva la cookie. La última actividad se comparte entre pestañas por localStorage.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui";
import { useBase } from "@/components/user-context";
import { INACTIVIDAD_MIN } from "@/lib/inactividad";
import { Clock, LogIn } from "lucide-react";

const CLAVE = "sesion-actividad";
const LIMITE_MS = INACTIVIDAD_MIN * 60_000;
const PING_MS = 5 * 60_000;

const leer = () => { try { return Number(localStorage.getItem(CLAVE)) || 0; } catch { return 0; } };
const marcar = () => { try { localStorage.setItem(CLAVE, String(Date.now())); } catch { /* sin almacenamiento */ } };

export function SesionInactiva() {
  const router = useRouter();
  const base = useBase();
  const [cerrada, setCerrada] = useState(false);
  useEffect(() => {
    let local = Date.now(); let ultimoPing = Date.now(); let cerrando = false;
    marcar();
    const actividad = () => { local = Date.now(); };
    const ev: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove", "wheel"];
    for (const e of ev) window.addEventListener(e, actividad, { passive: true });
    const tick = async () => {
      const ahora = Date.now();
      if (local > leer()) marcar();                           // esta pestaña es la más reciente: comparte su actividad
      const ultima = Math.max(local, leer());
      if (ahora - ultima >= LIMITE_MS) {
        if (cerrando) return; cerrando = true;
        try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* sin red: la cookie caduca sola */ }
        setCerrada(true);
        return;
      }
      if (ahora - ultimoPing >= PING_MS && ultima > ultimoPing) {   // hubo actividad desde el último ping: renovar la cookie
        ultimoPing = ahora;
        try { const r = await fetch("/api/auth/ping", { cache: "no-store" }); if (r.status === 401) { cerrando = true; setCerrada(true); } } catch { /* sin red */ }
      }
    };
    const t = setInterval(() => { void tick(); }, 30_000);
    return () => { clearInterval(t); for (const e of ev) window.removeEventListener(e, actividad); };
  }, []);
  if (!cerrada) return null;
  return (
    <Modal variante="dialogo" title="Sesión cerrada por inactividad" onClose={() => router.push(`${base}/login`)}
      footer={<button type="button" onClick={() => { router.push(`${base}/login`); router.refresh(); }} className="btn-primary inline-flex items-center gap-1.5 text-[12.5px]"><LogIn size={13} /> Volver a entrar</button>}>
      <div className="flex items-start gap-3 text-[13px] leading-relaxed text-ink">
        <Clock size={18} className="mt-0.5 shrink-0 text-cyan-deep" />
        <p>Llevabas más de {INACTIVIDAD_MIN} minutos sin actividad, así que cerramos tu sesión por seguridad. Todo lo que respondiste o editaste hasta ese momento quedó guardado. Vuelve a entrar para continuar donde ibas.</p>
      </div>
    </Modal>
  );
}
