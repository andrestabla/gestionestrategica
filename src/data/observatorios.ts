// Observatorios y fuentes externas del módulo de Inteligencia, por país de la
// empresa. Colombia enlaza con los observatorios de Algoritmo T; Ecuador, con
// las fuentes oficiales mientras se construyen los observatorios propios.

export type Observatory = {
  icon: "factory" | "map" | "briefcase" | "trend" | "file" | "shield";
  title: string;
  desc: string;
  tags: string[];
  href: string;
  cta: string;
};

const CO: Observatory[] = [
  { icon: "factory", title: "Sector y competencia", desc: "Tamaño, crecimiento, concentración y márgenes de referencia del sector, con las sociedades que lo componen: la base del Benchmark (M2).", tags: ["Supersociedades", "datos.gov.co", "CIIU rev. 4"], href: "https://www.algoritmot.com/bi/regional", cta: "Abrir observatorio" },
  { icon: "map", title: "Territorio y demanda", desc: "Actividad industrial y de construcción por departamento: dónde está la demanda que la empresa aún no atiende y qué sede la cubre mejor.", tags: ["33 departamentos", "Licencias de construcción", "Parques industriales"], href: "https://www.algoritmot.com/bi/regional", cta: "Abrir observatorio" },
  { icon: "briefcase", title: "Talento y empleabilidad", desc: "Oferta de perfiles comerciales, logísticos y administrativos en las ciudades donde opera y donde planea abrir.", tags: ["OLE", "DANE · GEIH"], href: "https://www.algoritmot.com/bi/laboral", cta: "Abrir observatorio" },
  { icon: "trend", title: "Señales de crecimiento", desc: "Importaciones de insumos industriales, precios de referencia y ciclos de compra de los sectores cliente.", tags: ["DIAN", "Banco de la República"], href: "https://www.algoritmot.com/bi/oferta", cta: "Abrir observatorio" },
  { icon: "file", title: "Espacio de trabajo", desc: "Informes propios combinando sector, territorio y los resultados del diagnóstico, exportables en PDF y CSV.", tags: ["Autonomía"], href: "https://www.algoritmot.com/bi/workspace", cta: "Abrir observatorio" },
];

const EC: Observatory[] = [
  { icon: "factory", title: "Sector y competencia", desc: "Las compañías del sector bajo control de la Superintendencia de Compañías: ingresos, crecimiento, utilidad y empleo por compañía y por provincia. La base del Benchmark (M2).", tags: ["SCVS · Ranking empresarial", "CIIU G4772", "Portal de información"], href: "https://appscvsmovil.supercias.gob.ec/ranking/ranking.html", cta: "Abrir ranking SCVS" },
  { icon: "map", title: "Territorio y demanda", desc: "Población por provincia y cantón, proyecciones y condiciones de vida: dónde está la demanda que la red aún no atiende y qué provincia conviene abrir primero.", tags: ["INEC · Censo 2022", "24 provincias", "Proyecciones"], href: "https://www.ecuadorencifras.gob.ec/censo-ecuador/", cta: "Abrir INEC" },
  { icon: "shield", title: "Regulación y precios de medicamentos", desc: "Permisos de funcionamiento y registro sanitario de farmacias, cuadro nacional de medicamentos básicos y precios techo fijados por el Consejo Nacional de Precios.", tags: ["ARCSA", "MSP · CNMB", "Precios techo"], href: "https://www.controlsanitario.gob.ec/", cta: "Abrir ARCSA" },
  { icon: "briefcase", title: "Talento y empleabilidad", desc: "Empleo, subempleo e ingresos por provincia y rama; afiliación al IESS: la oferta de químicos farmacéuticos, auxiliares de farmacia y perfiles comerciales donde opera y donde planea abrir.", tags: ["INEC · ENEMDU", "IESS", "Ministerio del Trabajo"], href: "https://www.ecuadorencifras.gob.ec/enemdu-anual/", cta: "Abrir ENEMDU" },
  { icon: "trend", title: "Señales de crecimiento", desc: "Consumo de los hogares, inflación de la división salud, importaciones de medicamentos y crédito: los ciclos que mueven la demanda de la farmacia.", tags: ["BCE", "INEC · IPC salud", "SENAE"], href: "https://www.bce.fin.ec/", cta: "Abrir BCE" },
  { icon: "file", title: "Espacio de trabajo", desc: "Informes propios combinando sector, territorio y los resultados del diagnóstico, exportables en PDF y CSV.", tags: ["Autonomía"], href: "https://www.algoritmot.com/bi/workspace", cta: "Abrir observatorio" },
];

export const observatoriesFor = (country: "CO" | "EC" | undefined): Observatory[] => (country === "EC" ? EC : CO);
