"use client";

import { createContext, useContext } from "react";
import { getLanguage, type Locale } from "@/lib/language";

export const LanguageContext = createContext<Locale>("az");

export function usePreferences() {
  return getLanguage(useContext(LanguageContext));
}
