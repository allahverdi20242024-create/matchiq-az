import { az, en } from "./translations";

export type Locale = "az" | "en";
export type Theme = "dark" | "light";

export const languageCookie = "matchiq-language";
export const themeCookie = "matchiq-theme";

export function isLocale(value: unknown): value is Locale {
  return value === "az" || value === "en";
}

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

export function getLanguage(locale: Locale) {
  return {
    t: locale === "en" ? en : az,
    intlLocale: locale === "en" ? "en-GB" : "az-AZ",
  };
}
