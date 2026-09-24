import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

/**
 * Makes the app look finished when a learner saves it to a phone home screen. Colors are
 * the light-theme background and the primary action color from docs/DESIGN_SYSTEM.md §2.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.productName,
    short_name: brand.shortName,
    description: brand.description,
    lang: brand.locale,
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F8FB",
    theme_color: "#2B4FE0",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
