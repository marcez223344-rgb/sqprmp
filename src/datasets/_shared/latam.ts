/**
 * Fictional-but-plausible LATAM name, city and currency pools. Names are common given names
 * and surnames combined at random; no real person is intended or represented.
 */
export const countries = [
  {
    code: "AR",
    name: "Argentina",
    currency: "ARS",
    timezone: "America/Argentina/Buenos_Aires",
    utcOffset: -3,
    weight: 30,
    cities: [
      "Buenos Aires",
      "Córdoba",
      "Rosario",
      "Mendoza",
      "La Plata",
      "Mar del Plata",
      "Tucumán",
    ],
  },
  {
    code: "MX",
    name: "México",
    currency: "MXN",
    timezone: "America/Mexico_City",
    utcOffset: -6,
    weight: 32,
    cities: [
      "Ciudad de México",
      "Guadalajara",
      "Monterrey",
      "Puebla",
      "Querétaro",
      "Mérida",
      "Tijuana",
    ],
  },
  {
    code: "CO",
    name: "Colombia",
    currency: "COP",
    timezone: "America/Bogota",
    utcOffset: -5,
    weight: 16,
    cities: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga"],
  },
  {
    code: "CL",
    name: "Chile",
    currency: "CLP",
    timezone: "America/Santiago",
    utcOffset: -4,
    weight: 10,
    cities: ["Santiago", "Valparaíso", "Concepción", "Antofagasta", "La Serena"],
  },
  {
    code: "PE",
    name: "Perú",
    currency: "PEN",
    timezone: "America/Lima",
    utcOffset: -5,
    weight: 8,
    cities: ["Lima", "Arequipa", "Trujillo", "Cusco", "Piura"],
  },
  {
    code: "UY",
    name: "Uruguay",
    currency: "UYU",
    timezone: "America/Montevideo",
    utcOffset: -3,
    weight: 4,
    cities: ["Montevideo", "Punta del Este", "Salto", "Paysandú"],
  },
] as const;

export type CountryCode = (typeof countries)[number]["code"];

/** Approximate local-currency multipliers relative to USD (fixed for reproducibility). */
export const usdRate: Record<string, number> = {
  ARS: 1350,
  MXN: 18.5,
  COP: 4100,
  CLP: 950,
  PEN: 3.7,
  UYU: 40,
};

export const givenNames = [
  "Valentina",
  "Mateo",
  "Camila",
  "Santiago",
  "Sofía",
  "Sebastián",
  "Isabella",
  "Matías",
  "Lucía",
  "Nicolás",
  "Martina",
  "Benjamín",
  "Emilia",
  "Joaquín",
  "Renata",
  "Tomás",
  "Antonella",
  "Lucas",
  "Catalina",
  "Facundo",
  "Ximena",
  "Diego",
  "Paula",
  "Andrés",
  "Daniela",
  "Felipe",
  "Mariana",
  "Gabriel",
  "Julieta",
  "Emiliano",
  "Regina",
  "Bruno",
  "Fernanda",
  "Ignacio",
  "Carolina",
  "Rodrigo",
  "Abril",
  "Agustín",
  "Florencia",
  "Maximiliano",
  "Alejandra",
  "Cristóbal",
  "Constanza",
  "Juan Pablo",
  "María José",
  "Thiago",
  "Ana Lucía",
  "Vicente",
  "Micaela",
  "Gonzalo",
];

export const surnames = [
  "García",
  "Rodríguez",
  "González",
  "Fernández",
  "López",
  "Martínez",
  "Pérez",
  "Sánchez",
  "Ramírez",
  "Torres",
  "Flores",
  "Rivera",
  "Gómez",
  "Díaz",
  "Cruz",
  "Morales",
  "Reyes",
  "Gutiérrez",
  "Ortiz",
  "Chávez",
  "Ramos",
  "Vargas",
  "Castillo",
  "Jiménez",
  "Romero",
  "Álvarez",
  "Mendoza",
  "Ruiz",
  "Aguilar",
  "Herrera",
  "Medina",
  "Castro",
  "Vega",
  "Rojas",
  "Silva",
  "Quispe",
  "Mamani",
  "Cabrera",
  "Acosta",
  "Benítez",
  "Paredes",
  "Ferreira",
  "Bustos",
  "Ledesma",
  "Molina",
  "Navarro",
  "Peralta",
  "Soto",
  "Villanueva",
  "Zambrano",
];

export function emailFor(name: string, id: number, domain = "ejemplo.lat"): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  return `${base}${id}@${domain}`;
}

/** Fake tax id per country (formats are plausible but the check digits are not real). */
export function taxIdFor(code: string, n: number): string {
  const digits = String(n).padStart(8, "0");
  switch (code) {
    case "AR":
      return `20-${digits}-3`;
    case "MX":
      return `XAXX${digits.slice(0, 6)}AB${digits.slice(6, 8)}`;
    case "CO":
      return `9${digits}-7`;
    case "CL":
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}-K`;
    case "PE":
      return `10${digits}5`;
    default:
      return `${digits}0012`;
  }
}
