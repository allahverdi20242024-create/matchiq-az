import type { Metadata } from "next";
import { Clock3, Languages, Moon, Sun } from "lucide-react";
import { CrestCredits } from "@/components/club-crest";
import { Navigation } from "@/components/navigation";
import { LanguageContext } from "@/components/preferences-context";
import { getPreferences } from "@/lib/preferences";
import { changeLanguage, changeTheme } from "./preferences-actions";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getPreferences();
  return {
    title: { default: t.siteTitle, template: "%s | MatchIQ AZ" },
    description: t.siteDescription,
  };
}

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, theme, t } = await getPreferences();
  // Browser hosts can add root attributes before React hydrates.
  return <html lang={locale} data-theme={theme} suppressHydrationWarning><body>
    <LanguageContext value={locale}>
      <a className="skip" href="#main">{t.skipToMainContent}</a>
      <div className="shell">
        <Navigation />
        <div className="workspace">
          <header className="topbar">
            <span>{t.footballAnalytics}</span>
            <div className="topbar-controls">
              <span className="timezone"><Clock3 size={15} aria-hidden="true" /> {t.bakuTime}</span>
              <form action={changeLanguage} className="preference-group" aria-label={t.language}>
                <Languages size={15} aria-hidden="true" />
                <button type="submit" name="language" value="az" lang="az" aria-label="Azərbaycan dili" aria-pressed={locale === "az"}>AZ</button>
                <button type="submit" name="language" value="en" lang="en" aria-label="English" aria-pressed={locale === "en"}>EN</button>
              </form>
              <form action={changeTheme} className="preference-group" aria-label={t.appearance}>
                <button type="submit" name="theme" value="light" aria-label={t.light} title={t.light} aria-pressed={theme === "light"}><Sun size={16} aria-hidden="true" /></button>
                <button type="submit" name="theme" value="dark" aria-label={t.dark} title={t.dark} aria-pressed={theme === "dark"}><Moon size={16} aria-hidden="true" /></button>
              </form>
            </div>
          </header>
          <main id="main" className="content">{children}</main>
          <footer><div className="site-footer"><strong>MatchIQ AZ</strong><CrestCredits /></div></footer>
        </div>
      </div>
    </LanguageContext>
  </body></html>;
}
