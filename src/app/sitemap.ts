import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/urls";

/**
 * Only pages a signed-out crawler can actually render belong here. The 39 sections and
 * their lessons live behind `/leccion/[slug]`, which the proxy redirects to sign-in, so
 * listing them would publish 347 redirects; see the note in docs/DESIGN_SYSTEM.md §9 and
 * the report to the owner about a public per-section preview.
 */
const ROUTES: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/curriculo", priority: 0.9, changeFrequency: "weekly" },
  { path: "/precios", priority: 0.9, changeFrequency: "monthly" },
  { path: "/como-funciona", priority: 0.8, changeFrequency: "monthly" },
  { path: "/demo", priority: 0.8, changeFrequency: "monthly" },
  { path: "/nosotros", priority: 0.6, changeFrequency: "monthly" },
  { path: "/preguntas-frecuentes", priority: 0.6, changeFrequency: "monthly" },
  { path: "/verificar", priority: 0.4, changeFrequency: "yearly" },
  { path: "/terminos", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacidad", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
