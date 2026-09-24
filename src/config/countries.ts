/**
 * Countries offered in onboarding and in the profile (ISO 3166-1 alpha-2).
 *
 * Alphabetical by Spanish name, with "Otro país" last. The list used to be LATAM-first and the
 * owner concluded España was missing because it sat after "Estados Unidos" (feedback 2026-09-24):
 * in a list this long, only alphabetical order lets someone predict where a country is, and it is
 * what makes a native select's type-ahead ("esp") land where the learner expects.
 */
const catalog = [
  { code: "AR", name: "Argentina", timezone: "America/Argentina/Buenos_Aires" },
  { code: "BO", name: "Bolivia", timezone: "America/La_Paz" },
  { code: "BR", name: "Brasil", timezone: "America/Sao_Paulo" },
  { code: "CL", name: "Chile", timezone: "America/Santiago" },
  { code: "CO", name: "Colombia", timezone: "America/Bogota" },
  { code: "CR", name: "Costa Rica", timezone: "America/Costa_Rica" },
  { code: "CU", name: "Cuba", timezone: "America/Havana" },
  { code: "EC", name: "Ecuador", timezone: "America/Guayaquil" },
  { code: "SV", name: "El Salvador", timezone: "America/El_Salvador" },
  { code: "ES", name: "España", timezone: "Europe/Madrid" },
  { code: "US", name: "Estados Unidos", timezone: "America/New_York" },
  { code: "GT", name: "Guatemala", timezone: "America/Guatemala" },
  { code: "HN", name: "Honduras", timezone: "America/Tegucigalpa" },
  { code: "MX", name: "México", timezone: "America/Mexico_City" },
  { code: "NI", name: "Nicaragua", timezone: "America/Managua" },
  { code: "PA", name: "Panamá", timezone: "America/Panama" },
  { code: "PY", name: "Paraguay", timezone: "America/Asuncion" },
  { code: "PE", name: "Perú", timezone: "America/Lima" },
  { code: "PR", name: "Puerto Rico", timezone: "America/Puerto_Rico" },
  { code: "DO", name: "República Dominicana", timezone: "America/Santo_Domingo" },
  { code: "UY", name: "Uruguay", timezone: "America/Montevideo" },
  { code: "VE", name: "Venezuela", timezone: "America/Caracas" },
] as const;

/** The catch-all option, always last: it is not a country and must not sort among them. */
export const OTHER_COUNTRY_CODE = "XX";
const other = { code: OTHER_COUNTRY_CODE, name: "Otro país", timezone: "UTC" } as const;

export const countries = [
  ...[...catalog].sort((a, b) => a.name.localeCompare(b.name, "es")),
  other,
] as const;

export type CountryCode = (typeof countries)[number]["code"];
export const countryCodes = countries.map((c) => c.code) as [CountryCode, ...CountryCode[]];
