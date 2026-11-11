// Instrumento original de madurez digital para instituciones de educación superior:
// 52 variables en cuatro líneas misionales × cuatro dimensiones, evaluadas contra
// ocho referentes. Las variables, su protocolo y los dominios viven en
// educativa.json (extraído del instrumento original, sin la medición de ejemplo).
import type { MadInstrument, MadVariable, MadDomain } from "@/lib/madurez";
import raw from "./educativa.json";

const data = raw as unknown as { variables: MadVariable[]; domains: MadDomain[] };

export const EDUCATIVA: MadInstrument = {
  kind: "educativa",
  name: "Madurez digital · institución educativa",
  intro: "Mide la madurez de la transformación digital de la institución en sus cuatro líneas misionales. Cada variable combina la percepción de los actores, la evidencia documental y el nivel asignado contra una rúbrica.",
  lines: [
    { n: 1, code: "4.1", name: "Academia y Virtualidad", short: "Academia", color: "#0e93b4", weight: 0.3 },
    { n: 2, code: "4.2", name: "Investigación y CTeI", short: "Investigación", color: "#7c5cd6", weight: 0.25 },
    { n: 3, code: "4.3", name: "Extensión, Relacionamiento y Rankings", short: "Extensión", color: "#e0913f", weight: 0.2 },
    { n: 4, code: "4.4", name: "Arquitectura Empresarial y Gobierno Digital", short: "Arquitectura", color: "#3f9d8c", weight: 0.25 },
  ],
  dimensions: [
    { key: "organizacional", name: "Organizacional", short: "Org." },
    { key: "misional", name: "Misional / pedagógica", short: "Mis." },
    { key: "tecnologica", name: "Tecnológica", short: "Tec." },
    { key: "datos", name: "Datos e información", short: "Dat." },
  ],
  frames: {
    eMM: { name: "e-Learning Maturity Model", color: "var(--cyan-deep)" },
    "Decreto 1330": { name: "Decreto 1330 de 2019 · registros calificados", color: "var(--navy)" },
    CNA: { name: "Consejo Nacional de Acreditación", color: "var(--gold)" },
    "TOGAF 10": { name: "TOGAF 10 · arquitectura empresarial", color: "var(--n4)" },
    "DAMA-DMBOK": { name: "DAMA-DMBOK · gobierno de datos", color: "#7c5cd6" },
    INTEF: { name: "INTEF · competencia digital docente", color: "var(--n2)" },
    "ISO 27001": { name: "ISO 27001 · seguridad de la información", color: "var(--bad)" },
    CMI: { name: "Cuadro de mando integral", color: "var(--muted)" },
  },
  audiences: {
    directivos: "Gobierno y directivos",
    docentes: "Docentes e investigadores",
    administrativos: "Personal profesional y administrativo",
    estudiantes: "Estudiantes",
    aliados: "Egresados y actores externos",
  },
  d7: {
    D1: { name: "Estrategia, gobierno y aseguramiento de la calidad", short: "Estrategia y gobierno" },
    D2: { name: "Cultura, talento y competencias", short: "Talento" },
    D3: { name: "Diseño y gestión de procesos misionales", short: "Procesos" },
    D4: { name: "Datos, analítica y gestión del conocimiento", short: "Datos" },
    D5: { name: "Infraestructura, arquitectura y seguridad", short: "Infraestructura" },
    D6: { name: "Experiencia, inclusión y participación", short: "Experiencia" },
    D7: { name: "Innovación, ecosistemas e impacto", short: "Innovación" },
  },
  variables: data.variables,
  domains: data.domains,
  aiq: [
    { key: "A_G", name: "Gobierno, ética y riesgos", weight: 0.2, prep: true, variableIds: ["AR-ORG-1", "AR-DAT-1"] },
    { key: "A_T", name: "Datos, infraestructura, privacidad y seguridad", weight: 0.2, prep: true, variableIds: ["AR-TEC-3", "AV-TEC-4"] },
    { key: "A_C", name: "Talento y competencias de IA", weight: 0.15, prep: true, variableIds: ["AV-MIS-1"] },
    { key: "A_F", name: "Enseñanza, aprendizaje y evaluación", weight: 0.2, prep: false, variableIds: ["AV-MIS-4", "AV-DAT-1"] },
    { key: "A_R", name: "Investigación, innovación y creación", weight: 0.15, prep: false, variableIds: ["IN-TEC-3", "IN-DAT-3"] },
    { key: "A_X", name: "Extensión, proyección social y gestión", weight: 0.1, prep: false, variableIds: ["EX-TEC-1", "EX-DAT-2", "AR-DAT-3"] },
  ],
  safeguards: [
    { id: "SG-1", rule: "Inventario de sistemas de IA con responsable institucional", cap: 59 },
    { id: "SG-2", rule: "Revisión humana en decisiones académicas o de bienestar de alto impacto", cap: 59 },
    { id: "SG-3", rule: "Evaluación de privacidad o ética para tratamientos de alto riesgo", cap: 59 },
    { id: "SG-4", rule: "Sin tratamiento irregular conocido de datos personales ni incidentes graves sin gestionar", cap: 39 },
    { id: "SG-5", rule: "Integridad académica no gestionada únicamente con detección automatizada", cap: null },
  ],
};
