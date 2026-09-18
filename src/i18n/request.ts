import { getRequestConfig } from "next-intl/server";
import { brand } from "@/config/brand";

/**
 * Single-locale setup (es-419). Adding a second locale later only requires
 * routing + another messages file; components already use message keys.
 */
export default getRequestConfig(async () => {
  const locale = brand.locale;
  return {
    locale,
    timeZone: brand.defaultTimezone,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
