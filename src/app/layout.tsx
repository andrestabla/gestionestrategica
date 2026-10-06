import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jbMono = JetBrains_Mono({ variable: "--font-jb", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "4Shine Empresas · Plataforma de gestión estratégica",
  description:
    "Plataforma de gestión estratégica del sistema 4Shine Empresas: diagnóstico 4Shine-OD, benchmark, cuadro de mando y OKR, indicadores, ruta, iniciativas, proyectos e inteligencia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${jbMono.variable} h-full antialiased`}>
      <body
        className="min-h-full"
        style={{
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          ["--font-mono" as string]: "var(--font-jb), ui-monospace, monospace",
        }}
      >
        {children}
      </body>
    </html>
  );
}
