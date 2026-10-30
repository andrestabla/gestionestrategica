// Población por departamento de Colombia para la lectura de demanda del módulo de Inteligencia (M7).
// Proyecciones de población del DANE para 2025 con base en el Censo Nacional de Población y Vivienda 2018
// (serie departamental 2020-2050). Los nombres coinciden con los del mapa (src/data/geo.ts) y con los
// departamentos del benchmark sectorial (scripts/sector-fetch.ts).

export type DepartmentPopulation = { name: string; capital: string; population: number };

export const CO_POPULATION_SOURCE = {
  name: "DANE · Proyecciones de población 2025 (CNPV 2018, serie departamental 2020-2050)",
  url: "https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion",
  note: "Población total proyectada a 30 de junio de 2025 por departamento; total nacional 53,06 millones.",
};

export const CO_POPULATION: DepartmentPopulation[] = [
  { name: "Bogotá D.C.", capital: "Bogotá", population: 7942867 },
  { name: "Antioquia", capital: "Medellín", population: 6928372 },
  { name: "Valle del Cauca", capital: "Cali", population: 4708393 },
  { name: "Cundinamarca", capital: "Bogotá", population: 3535067 },
  { name: "Atlántico", capital: "Barranquilla", population: 2865034 },
  { name: "Santander", capital: "Bucaramanga", population: 2398303 },
  { name: "Bolívar", capital: "Cartagena", population: 2241282 },
  { name: "Córdoba", capital: "Montería", population: 1992907 },
  { name: "Nariño", capital: "Pasto", population: 1713586 },
  { name: "Norte de Santander", capital: "Cúcuta", population: 1709289 },
  { name: "Cauca", capital: "Popayán", population: 1599148 },
  { name: "Magdalena", capital: "Santa Marta", population: 1544507 },
  { name: "Cesar", capital: "Valledupar", population: 1469159 },
  { name: "Tolima", capital: "Ibagué", population: 1386410 },
  { name: "Boyacá", capital: "Tunja", population: 1290393 },
  { name: "Huila", capital: "Neiva", population: 1208728 },
  { name: "Meta", capital: "Villavicencio", population: 1156405 },
  { name: "La Guajira", capital: "Riohacha", population: 1066679 },
  { name: "Caldas", capital: "Manizales", population: 1054450 },
  { name: "Sucre", capital: "Sincelejo", population: 1034102 },
  { name: "Risaralda", capital: "Pereira", population: 1003225 },
  { name: "Chocó", capital: "Quibdó", population: 593106 },
  { name: "Quindío", capital: "Armenia", population: 557884 },
  { name: "Casanare", capital: "Yopal", population: 473165 },
  { name: "Caquetá", capital: "Florencia", population: 429041 },
  { name: "Putumayo", capital: "Mocoa", population: 390742 },
  { name: "Arauca", capital: "Arauca", population: 279191 },
  { name: "Vichada", capital: "Puerto Carreño", population: 148738 },
  { name: "Amazonas", capital: "Leticia", population: 85057 },
  { name: "Guaviare", capital: "San José del Guaviare", population: 84696 },
  { name: "San Andrés y Providencia", capital: "San Andrés", population: 63438 },
  { name: "Guainía", capital: "Inírida", population: 59706 },
  { name: "Vaupés", capital: "Mitú", population: 44142 },
];
