import type { Metadata } from "next";
import { Clock3 } from "lucide-react";
import { CrestCredits } from "@/components/club-crest";
import { Navigation } from "@/components/navigation";
import { LanguageContext } from "@/components/preferences-context";
import { getPreferences } from "@/lib/preferences";
import { PreferenceControls } from "@/components/preference-controls";
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
            <span className="timezone"><Clock3 size={15} aria-hidden="true" /> {t.bakuTime}</span>
            <PreferenceControls locale={locale} theme={theme} />
          </header>
          <main id="main" className="content">{children}</main>
          <footer>
            <div className="site-footer">
              <p>{t.dataSources}{" "}<a className="underline" href="https://www.football-data.org/">football-data.org</a>
                {" · "}<a className="underline" href="https://github.com/openfootball/football.json">OpenFootball</a>
              </p>
              <CrestCredits />
            </div>
          </footer>
        </div>
      </div>
    </LanguageContext>
  </body></html>;
}
