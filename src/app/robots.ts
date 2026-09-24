import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/urls";

/**
 * Everything a signed-out visitor cannot reach is disallowed: the proxy already redirects
 * those paths to /ingresar, and letting a crawler queue them only burns crawl budget on
 * redirects. `/verificar/` is excluded per certificate (it names a person) while the
 * verification form itself stays indexable.
 */
const DISALLOW = [
  "/admin",
  "/api/",
  "/auth/",
  "/acceso",
  "/aprender",
  "/certificados",
  "/consultas",
  "/ejercicio/",
  "/historial",
  "/leccion/",
  "/logros",
  "/onboarding",
  "/perfil",
  "/ranking",
  "/repaso",
  "/ruta",
  "/verificar/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: DISALLOW }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
