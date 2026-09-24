import { beforeEach, describe, expect, it, vi } from "vitest";
import { brand } from "@/config/brand";
import { OG_LOCALE, buildPageMetadata } from "@/lib/seo/metadata";
import { absoluteUrl, siteHost, siteUrl } from "@/lib/seo/urls";

/**
 * A relative `og:image` is the classic silent reason a LinkedIn card renders as a grey box,
 * and LinkedIn is this product's acquisition channel. These assertions exist so nobody can
 * make the share tags relative again without a red test.
 */
describe("seo urls", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_APP_URL = original;
  });

  it("drops a trailing slash so paths do not double up", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://academia.example.com/";
    expect(siteUrl()).toBe("https://academia.example.com");
    expect(absoluteUrl("/precios")).toBe("https://academia.example.com/precios");
    expect(absoluteUrl("precios")).toBe("https://academia.example.com/precios");
  });

  it("leaves an already absolute URL alone and exposes the bare host", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://academia.example.com";
    expect(absoluteUrl("https://otro.example/x")).toBe("https://otro.example/x");
    expect(siteHost()).toBe("academia.example.com");
  });
});

describe("buildPageMetadata", () => {
  it("emits absolute canonical, og:url and og:image", () => {
    const meta = buildPageMetadata({
      path: "/precios",
      title: "Precios",
      description: "Un solo pago.",
    });
    const url = absoluteUrl("/precios");
    expect(meta.alternates?.canonical).toBe(url);
    expect(meta.openGraph?.url).toBe(url);
    const images = meta.openGraph && "images" in meta.openGraph ? meta.openGraph.images : undefined;
    const first = Array.isArray(images) ? images[0] : images;
    expect(first).toMatchObject({
      url: absoluteUrl("/opengraph-image"),
      width: 1200,
      height: 630,
    });
    expect(String(first && typeof first === "object" && "url" in first ? first.url : "")).toMatch(
      /^https?:\/\//,
    );
  });

  it("uses a territory code social platforms accept, never es_419", () => {
    expect(OG_LOCALE).toBe("es_LA");
    expect(OG_LOCALE).not.toContain("419");
  });

  it("leaves the image to the segment file when asked, and marks noIndex pages", () => {
    const meta = buildPageMetadata({
      path: "/verificar/abc",
      title: "Verificar certificado",
      description: "…",
      noIndex: true,
      imagePath: null,
    });
    expect(meta.openGraph && "images" in meta.openGraph).toBe(false);
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });

  it("appends the short brand name to the card headline unless the title is absolute", () => {
    expect(
      buildPageMetadata({ path: "/x", title: "Precios", description: "d" }).twitter?.title,
    ).toBe(`Precios · ${brand.shortName}`);
    expect(
      buildPageMetadata({ path: "/", title: "Marca — lema", description: "d", absoluteTitle: true })
        .twitter?.title,
    ).toBe("Marca — lema");
  });
});
