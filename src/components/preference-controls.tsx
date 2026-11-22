"use client";

import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { changeLanguage, changeTheme } from "@/app/preferences-actions";
import { isLocale, isTheme, languageCookie, themeCookie, type Locale, type Theme } from "@/lib/language";
import { usePreferences } from "./preferences-context";

function preferenceValue(event: FormEvent<HTMLFormElement>) {
  return ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
}

function writePreference(name: string, value: Theme | Locale) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = name + "=" + value + "; Path=/; Max-Age=31536000; SameSite=Lax" + secure;
}

export function PreferenceControls({ locale, theme }: { locale: Locale; theme: Theme }) {
  const { t } = usePreferences();
  const router = useRouter();
  const [selectedLocale, selectLocale] = useOptimistic(locale);
  const [selectedTheme, selectTheme] = useState(theme);
  const [pending, startTransition] = useTransition();

  function submitLanguage(event: FormEvent<HTMLFormElement>) {
    const value = preferenceValue(event);
    if (!isLocale(value)) return;
    event.preventDefault();
    if (value === selectedLocale) return;
    writePreference(languageCookie, value);
    startTransition(() => {
      selectLocale(value);
      router.refresh();
    });
  }

  function submitTheme(event: FormEvent<HTMLFormElement>) {
    const value = preferenceValue(event);
    if (!isTheme(value)) return;
    event.preventDefault();
    document.documentElement.dataset.theme = value;
    writePreference(themeCookie, value);
    selectTheme(value);
  }

  return <div className="topbar-controls">
    <form action={changeLanguage} onSubmit={submitLanguage} className="preference-group language-switch" data-ball-side={selectedLocale === "az" ? "left" : "right"} aria-label={t.language} aria-busy={pending}>
      <button type="submit" name="language" value="az" lang="az" aria-label="Azərbaycan dili" aria-pressed={selectedLocale === "az"}><span>AZ</span></button>
      <button type="submit" name="language" value="en" lang="en" aria-label="English" aria-pressed={selectedLocale === "en"}><span>EN</span></button>
      {pending && <span className="sr-only" role="status">{t.loading}</span>}
    </form>
    <form action={changeTheme} onSubmit={submitTheme} className="preference-group theme-switch" data-ball-side={selectedTheme === "light" ? "left" : "right"} aria-label={t.appearance}>
      <button type="submit" name="theme" value="light" aria-label={t.light} title={t.light} aria-pressed={selectedTheme === "light"}><Sun size={16} aria-hidden="true" /></button>
      <button type="submit" name="theme" value="dark" aria-label={t.dark} title={t.dark} aria-pressed={selectedTheme === "dark"}><Moon size={16} aria-hidden="true" /></button>
    </form>
  </div>;
}
