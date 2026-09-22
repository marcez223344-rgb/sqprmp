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
  // Requires the datamindssolutions.com domain and a mailbox; see docs/DEPLOYMENT.md §2.
  supportEmail: "admin@datamindssolutions.com",
  // D-09: the service is offered by the founder as an individual taxpayer (monotributo);
  // "Data Minds Solutions" is the trade name, not a company.
  legalName: "Marcelo Pisner (monotributista), nombre de fantasía Data Minds Solutions",
  legalEntityKind: "individual" as const,
  // Empty while the owner chooses not to publish them (D-09): the legal pages then identify
  // the provider by name and support email only. Required before charging in Argentina.
  legalAddress: "",
  taxId: "",
  jurisdiction: "Ciudad Autónoma de Buenos Aires, República Argentina",
  refundDays: 7,
} as const;
