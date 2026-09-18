/**
 * Single source of truth for product identity. Components must import from here
 * instead of hardcoding names, taglines or asset paths.
 */
export const brand = {
  productName: "Data Minds SQL Academy",
  shortName: "SQL Academy",
  organization: "Data Minds Solutions",
  tagline: "Aprende SQL con datos reales de negocio",
  description:
    "Plataforma de aprendizaje de SQL para profesionales de América Latina: ejercicios con datos de negocio realistas, retroalimentación inmediata y certificados verificables.",
  locale: "es-419",
  defaultTimezone: "America/Argentina/Buenos_Aires",
  logo: {
    light: "/brand/logo-light.svg",
    dark: "/brand/logo-dark.svg",
    mark: "/brand/mark.svg",
  },
  supportEmail: "hola@dataminds.example", // placeholder until P-3 is answered
  legalName: "Data Minds Solutions", // placeholder until D-09 is answered
  legalAddress: "PENDIENTE (D-09)", // street address for legal pages; owner fills in (D-09)
  taxId: "PENDIENTE (D-09)", // CUIT or equivalent; owner fills in (D-09)
  jurisdiction: "Ciudad Autónoma de Buenos Aires, República Argentina",
  refundDays: 7,
} as const;
