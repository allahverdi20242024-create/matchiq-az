import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import { Activity, CalendarDays, ChartNoAxesCombined, UsersRound } from "lucide-react";
import { ClubLabel, LeagueLabel } from "@/components/club-crest";
import { Badge } from "@/components/ui/badge";
import { bakuDate, formatDate } from "@/lib/demo";
import { fixtureDateOnly, fixtureDateTime, loadFixtureFeed, realMatchPath } from "@/lib/real-fixtures";
import styles from "./dashboard.module.css";

const quickLinks = [
  { title: "monteCarloSimulation", href: "/real-oyunlar#simulation-title", icon: Activity },
  { title: "teamStatistics", href: "/real-komandalar", icon: UsersRound },
  { title: "modelBacktesting", href: "/tarixce", icon: ChartNoAxesCombined },
] as const;

function Pitch() {
  return <div className={styles.pitchVisual} aria-hidden="true">
    <div className={styles.pitchHalo} />
    <div className={styles.field}>
      <span className={styles.midline} />
      <span className={styles.centerCircle} />
      <span className={styles.centerSpot} />
      <span className={styles.leftBox} /><span className={styles.rightBox} />
      <span className={styles.leftGoal} /><span className={styles.rightGoal} />
      <span className={styles.route} /><span className={styles.routeSecond} />
      <span className={styles.markerOne} /><span className={styles.markerTwo} /><span className={styles.markerThree} />
    </div>
  </div>;
}

export default async function Home() {
  const { t, locale, intlLocale } = await getPreferences();
  const feed = await loadFixtureFeed("upcoming");
  const now = new Date();
  const upcoming = feed?.competitions.flatMap((group) => group.matches.slice(0, 8)
    .map((match) => ({ ...match, competition: group.competition, stale: group.stale })))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.kickoff ?? "~").localeCompare(b.kickoff ?? "~"))
    .slice(0, 3) ?? [];

  return <>
    <div className="heading"><div><h1>{t.dashboard}</h1></div>
      <span className="date-tag"><CalendarDays size={16} aria-hidden="true" />{formatDate(bakuDate(now), intlLocale)}</span></div>

    <section className={styles.hero}>
      <Pitch />
      <div className={styles.heroContent}>
        <h2>{t.heroStart} <em>{t.heroEmphasis}</em>{locale === "az" ? " " : ""}{t.heroEnd}</h2>

        <Link className="primary" href="/real-oyunlar"><CalendarDays size={18} aria-hidden="true" />{" "}{t.exploreRealFixtures}</Link>
      </div>
    </section>

    <nav className={styles.quickLinks} aria-label={t.analyticsSections}>
      {quickLinks.map(({ title, href, icon: Icon }) => <Link className={styles.quickLink} key={href} href={href}>
        <span className="stat-icon"><Icon size={19} aria-hidden="true" /></span>
        <span><strong>{t[title]}</strong></span>
      </Link>)}
    </nav>

    <section className={styles.upcoming} aria-labelledby="real-preview">
      <div className="section-heading">
        <h2 id="real-preview"><CalendarDays size={22} aria-hidden="true" />{" "}{t.upcomingRealFixtures}</h2>
        <Link className={styles.allLink} href="/real-oyunlar">{t.allRealFixtures}</Link>
      </div>
      {upcoming.length > 0 ? <div className={styles.realGrid}>
        {upcoming.map((match) => <article className={styles.realCard} key={match.competition + match.id}>
          <div className={styles.realMeta}><LeagueLabel code={match.competition} /></div>
          <div className={styles.matchNames}><strong><ClubLabel name={match.home.name} /></strong><strong><ClubLabel name={match.away.name} /></strong></div>
          <time dateTime={match.kickoff ?? match.date}>{(match.kickoff ? fixtureDateTime : fixtureDateOnly)(intlLocale).format(new Date(match.kickoff ?? match.date))}</time>
          {!match.kickoff && <span className={styles.timeNote}>{t.kickoffTimeUnconfirmed}</span>}
          {match.stale && <Badge>{t.staleData}</Badge>}
          <Link className={styles.allLink} href={realMatchPath(match.id)}
            aria-label={match.home.name + " " + t.and + " " + match.away.name + " " + t.fixtureAnalysisSuffix}>{t.matchAnalysis}</Link>
        </article>)}
      </div> : <div className="panel detail muted">{feed ? t.noUpcomingFixtures : t.fixtureServiceUnavailable}</div>}
    </section>

  </>;
}
