// Población por provincia del Ecuador · INEC, Censo de Población y Vivienda
// 2022 (resultados definitivos; tabla tomada de Wikipedia «Provincias de
// Ecuador», consultada el 7 oct 2026). Base de la lectura de demanda por
// provincia del módulo de Inteligencia para empresas ecuatorianas.

export type ProvincePopulation = { name: string; capital: string; population: number };

export const EC_POPULATION_SOURCE = {
  name: "INEC · Censo de Población y Vivienda 2022",
  url: "https://www.ecuadorencifras.gob.ec/censo-ecuador/",
  note: "Población por provincia según el censo 2022 (vía Wikipedia, «Provincias de Ecuador»).",
};

export const EC_POPULATION: ProvincePopulation[] = [
  { name: "Azuay", capital: "Cuenca", population: 801609 },
  { name: "Bolívar", capital: "Guaranda", population: 199078 },
  { name: "Cañar", capital: "Azogues", population: 227578 },
  { name: "Carchi", capital: "Tulcán", population: 172828 },
  { name: "Chimborazo", capital: "Riobamba", population: 471933 },
  { name: "Cotopaxi", capital: "Latacunga", population: 470210 },
  { name: "El Oro", capital: "Machala", population: 714592 },
  { name: "Esmeraldas", capital: "Esmeraldas", population: 553900 },
  { name: "Galápagos", capital: "Puerto Baquerizo Moreno", population: 28583 },
  { name: "Guayas", capital: "Guayaquil", population: 4391923 },
  { name: "Imbabura", capital: "Ibarra", population: 469879 },
  { name: "Loja", capital: "Loja", population: 485421 },
  { name: "Los Ríos", capital: "Babahoyo", population: 898652 },
  { name: "Manabí", capital: "Portoviejo", population: 1592840 },
  { name: "Morona Santiago", capital: "Macas", population: 192508 },
  { name: "Napo", capital: "Tena", population: 131672 },
  { name: "Orellana", capital: "El Coca", population: 182166 },
  { name: "Pastaza", capital: "Puyo", population: 111915 },
  { name: "Pichincha", capital: "Quito", population: 3089473 },
  { name: "Santa Elena", capital: "Santa Elena", population: 385735 },
  { name: "Santo Domingo de los Tsáchilas", capital: "Santo Domingo", population: 492969 },
  { name: "Sucumbíos", capital: "Nueva Loja", population: 199014 },
  { name: "Tungurahua", capital: "Ambato", population: 563532 },
  { name: "Zamora Chinchipe", capital: "Zamora", population: 110973 },
];
