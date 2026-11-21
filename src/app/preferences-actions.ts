"use server";

import { cookies } from "next/headers";
import { isLocale, isTheme, languageCookie, themeCookie } from "@/lib/language";

const options = { path: "/", httpOnly: true, sameSite: "lax", maxAge: 365 * 24 * 60 * 60 } as const;

export async function changeLanguage(form: FormData) {
  const value = form.get("language");
  if (isLocale(value)) (await cookies()).set(languageCookie, value, options);
}

export async function changeTheme(form: FormData) {
  const value = form.get("theme");
  if (isTheme(value)) (await cookies()).set(themeCookie, value, options);
}
