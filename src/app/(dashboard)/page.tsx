import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import { Activity, CalendarDays, ChartNoAxesCombined, UsersRound } from "lucide-react";
import { ClubCrest, ClubLabel, LeagueLabel } from "@/components/club-crest";
import { Badge } from "@/components/ui/badge";
import { bakuDate, formatDate } from "@/lib/demo";
import { fixtureDateOnly, fixtureDateTime, loadFixtureFeed, realMatchPath } from "@/lib/real-fixtures";
import styles from "./dashboard.module.css";

const quickLinks = [
  { title: "monteCarloSimulation", href: "/real-oyunlar#simulation-title", icon: Activity },
  { title: "teamStatistics", href: "/real-komandalar", icon: UsersRound },
  { title: "modelBacktesting", href: "/tarixce", icon: ChartNoAxesCombined },
] as const;

export default async function Home() {
  const { t, intlLocale } = await getPreferences();
  const feed = await loadFixtureFeed("upcoming");
  const now = new Date();
  const upcoming = feed?.competitions.flatMap((group) => group.matches
    .map((match) => ({ ...match, competition: group.competition, stale: group.stale })))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.kickoff ?? "~").localeCompare(b.kickoff ?? "~"))
    .slice(0, 5) ?? [];
  const [featured, ...nextMatches] = upcoming;
  const dateOnly = fixtureDateOnly(intlLocale);
  const dateTime = fixtureDateTime(intlLocale);
  const kickoffTime = new Intl.DateTimeFormat(intlLocale, {
    timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return <>
    <div className="heading">
      <h1>{t.dashboard}</h1>
      <span className="date-tag"><CalendarDays size={16} aria-hidden="true" />{formatDate(bakuDate(now), intlLocale)}</span>
    </div>
    <section aria-labelledby="real-preview">
      <div className="section-heading">
        <h2 id="real-preview"><CalendarDays size={22} aria-hidden="true" />{t.upcomingRealFixtures}</h2>
        <Link className={styles.allLink} href="/real-oyunlar">{t.exploreRealFixtures}</Link>
      </div>
      {featured ? <div className={styles.board} data-has-list={nextMatches.length > 0}>
        <article className={styles.feature}>
          <div className={styles.meta}><LeagueLabel code={featured.competition} />
            {featured.stale && <Badge>{t.staleData}</Badge>}
          </div>
          <div className={styles.matchup}>
            <div className={styles.team}><ClubCrest name={featured.home.name} /><strong>{featured.home.name}</strong></div>
            <div className={styles.kickoff}>
              {featured.kickoff && <time dateTime={featured.kickoff}>{kickoffTime.format(new Date(featured.kickoff))}</time>}
              <small>{dateOnly.format(new Date(featured.date))}</small>
              {!featured.kickoff && <small>{t.kickoffTimeUnconfirmed}</small>}
            </div>
            <div className={styles.team}><ClubCrest name={featured.away.name} /><strong>{featured.away.name}</strong></div>
          </div>
          <div className={styles.actions}>
            <Link className="primary" href={realMatchPath(featured.id)}>{t.matchAnalysis}</Link>
            <Link className={styles.allLink} href="/oyunlar">{t.fixtureSchedule}</Link>
          </div>
        </article>
        {nextMatches.length > 0 && <ul className={styles.matchList}>
          {nextMatches.map((match) => <li key={match.competition + match.id}>
            <Link href={realMatchPath(match.id)} className={styles.matchRow}>
              <span className={styles.matchNames}><ClubLabel name={match.home.name} /><ClubLabel name={match.away.name} /></span>
              <span className={styles.rowTime}>
                <time dateTime={match.kickoff ?? match.date}>{(match.kickoff ? dateTime : dateOnly).format(new Date(match.kickoff ?? match.date))}</time>
                {match.stale ? <small>{t.staleData}</small> : !match.kickoff && <small>{t.kickoffTimeUnconfirmed}</small>}
              </span>
            </Link>
          </li>)}
        </ul>}
      </div> : <section className="panel empty">
        <h2>{feed ? t.noUpcomingFixtures : t.fixtureServiceUnavailable}</h2>
        <Link className={styles.allLink} href="/oyunlar">{t.fixtureSchedule}</Link>
      </section>}
    </section>

    <nav className={styles.quickLinks} aria-label={t.analyticsSections}>
      {quickLinks.map(({ title, href, icon: Icon }) => <Link className={styles.quickLink} key={href} href={href}>
        <span className="stat-icon"><Icon size={19} aria-hidden="true" /></span>
        <strong>{t[title]}</strong>
      </Link>)}
    </nav>
  </>;
}
