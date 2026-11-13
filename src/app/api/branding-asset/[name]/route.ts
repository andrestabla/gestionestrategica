import { NextResponse } from "next/server";
import { hydrateFromDb } from "@/server/store";
import path from "node:path";
import { getObject } from "@/server/storage";

// GET /api/branding-asset/:name — sirve un recurso de marca (público: el
// login los usa antes de autenticar).
const MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif", ".ico": "image/x-icon",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  await hydrateFromDb();
  const { name } = await params;
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }
  const buf = await getObject("branding", name);
  if (!buf) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const ext = path.extname(name).toLowerCase();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
      // abierto directamente, un SVG es un documento: sin esto, un script dentro del logo correría con el origen de la plataforma
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
