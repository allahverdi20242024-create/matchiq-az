import type { Metadata } from "next";
import { Clock3 } from "lucide-react";
import { CrestCredits } from "@/components/club-crest";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MatchIQ AZ | Futbol analitikası", template: "%s | MatchIQ AZ" },
  description: "Futbol oyunlarının statistik təhlili üçün Azərbaycan dilində nümayiş paneli.",
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Browser hosts can add root attributes before React hydrates.
  return <html lang="az" suppressHydrationWarning><body>
    <a className="skip" href="#main">Əsas məzmuna keç</a>
    <div className="shell">
      <Navigation />
      <div className="workspace">
        <header className="topbar"><span>Futbol analitikası</span><div><span className="timezone"><Clock3 size={15} /> Bakı vaxtı</span></div></header>
        <main id="main" className="content">{children}</main>
        <footer><div className="site-footer"><strong>MatchIQ AZ</strong><CrestCredits /></div></footer>
      </div>
    </div>
  </body></html>;
}
