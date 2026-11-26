import { getPreferences } from "@/lib/preferences";
import { competitionName } from "@/lib/real-fixtures";
import { catalog, clubs, leagues, LeagueCrest, type CrestCredit } from "./crest-icons";

export { ClubCrest, ClubLabel } from "./crest-icons";

export async function LeagueLabel({ code }: { code: string }) {
  const { t } = await getPreferences();
  return <span className="crest-label"><LeagueCrest code={code} /><span>{competitionName(code, t)}</span></span>;
}

async function CreditList({ entries }: { entries: CrestCredit[] | readonly CrestCredit[] }) {
  const { t } = await getPreferences();
  return <ul className="mt-2 space-y-1">
    {entries.map((item) => <li key={item.source ?? item.author}>
      {item.source ? <a href={item.source}>{item.author} · Wikimedia Commons</a> : <>{item.author}{" "}{t.userProvidedLogo}</>}
      {item.license ? <> · <a href={item.license}>CC BY-SA 4.0</a></> : item.source && " " + t.creditPublicDomain}
      {" " + t.convertedToWebp}
    </li>)}
  </ul>;
}

export async function CrestCredits() {
  const { t } = await getPreferences();
  const leagueEntries = Object.values(leagues).filter((item): item is CrestCredit => item !== undefined);
  return <details className="crest-credits">
    <summary>{t.logoSourcesAndLicences}</summary>
    {catalog.length > 0 && <p className="mt-2">
      {t.someClubAndCompetitionLogosComeFrom}{" "}<a href="https://football-logos.cc/">football-logos.cc</a>{t.logosAreDisplayedForIdentification}{" "}<a href="https://football-logos.cc/license/">{t.termsOfUse}</a>
    </p>}
    <p className="mt-2">{t.uefaCrestCredit}{" "}<a href="https://www.uefa.com/uefachampionsleague/clubs/">UEFA.com</a></p>
    <div className="crest-credit-grid">
      <section><h2>{t.clubs}</h2><CreditList entries={clubs} /></section>
      <section><h2>{t.competitions}</h2><CreditList entries={leagueEntries} /></section>
    </div>
  </details>;
}
