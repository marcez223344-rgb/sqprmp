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
  /**
   * `light` and `dark` pointed at `/brand/logo-light.svg` and `/brand/logo-dark.svg`, neither of
   * which has ever existed in `public/brand/`. Nothing rendered them — `Logo` draws the wordmark
   * as text plus a CSS mark (P-2), which is why the 404s were never noticed — so they were removed
   * rather than left as a trap for the next component that trusts this config. `mark` is real and
   * is what the Open Graph share card uses.
   */
  logo: {
    mark: "/brand/mark.svg",
  },
  // Requires the datamindssolutions.com domain and a mailbox; see docs/DEPLOYMENT.md §2.
  supportEmail: "admin@datamindssolutions.com",
  // The founder's consultancy, and the answer to "who is teaching me and why should I trust them".
  // Supplied by the owner 2026-09-24 and verified live. Linked from /nosotros and the footer.
  website: "https://www.datamindssolutions.com/",
  // D-09: the service is offered by the founder as an individual taxpayer (monotributo);
  // "Data Minds Solutions" is the trade name, not a company.
  legalName: "Marcelo Pisner — Data Minds Solutions",
  legalEntityKind: "individual" as const,
  // Empty while the owner chooses not to publish them (D-09): the legal pages then identify
  // the provider by name and support email only. Required before charging in Argentina.
  legalAddress: "",
  taxId: "",
  jurisdiction: "Ciudad Autónoma de Buenos Aires, República Argentina",
  // 10 days is the floor set by Argentina's consumer law for distance sales (Ley 24.240 art. 34);
  // it cannot be shortened by contract, so this is not a marketing choice.
  refundDays: 10,
} as const;
