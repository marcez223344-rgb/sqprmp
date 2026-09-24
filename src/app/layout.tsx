import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ThemeScript } from "@/components/layout/theme-script";
import { brand } from "@/config/brand";
import { OG_LOCALE } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/seo/urls";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  const title = `${brand.productName} — ${t("metaTitle")}`;
  return {
    // Every relative URL below (and the generated opengraph-image) is made absolute
    // against this. Social crawlers drop relative image URLs silently.
    metadataBase: new URL(siteUrl()),
    title: {
      default: title,
      template: `%s · ${brand.shortName}`,
    },
    description: t("metaDescription"),
    applicationName: brand.productName,
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      siteName: brand.productName,
      locale: OG_LOCALE,
      url: siteUrl(),
      title,
      description: t("metaDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: t("metaDescription"),
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang={locale}
      className={`${inter.variable} ${manrope.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript nonce={nonce} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
