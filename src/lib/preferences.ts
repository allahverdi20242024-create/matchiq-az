import { cookies } from "next/headers";
import { cache } from "react";
import { getLanguage, isLocale, isTheme, languageCookie, themeCookie } from "./language";

export const getPreferences = cache(async () => {
  const store = await cookies();
  const language = store.get(languageCookie)?.value ?? store.get("matchiq-language")?.value;
  const appearance = store.get(themeCookie)?.value ?? store.get("matchiq-theme")?.value;
  const locale = isLocale(language) ? language : "az";
  const theme = isTheme(appearance) ? appearance : "dark";
  return { locale, theme, ...getLanguage(locale) };
});
