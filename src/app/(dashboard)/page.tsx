import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import Form from "next/form";
import { Activity, CalendarDays, ChartNoAxesCombined, ChevronLeft, ChevronRight, UsersRound } from "lucide-react";
import { ClubCrest, ClubLabel, LeagueLabel } from "@/components/club-crest";
import { Badge } from "@/components/ui/badge";
import { dateKey, fixtureView, validDate } from "@/lib/fixture-date";
import { bakuDate } from "@/lib/demo";
import { fixtureDateOnly, fixtureDateTime, loadFixtureFeed, realMatchPath } from "@/lib/real-fixtures";
import styles from "./dashboard.module.css";

const quickLinks = [
  { title: "monteCarloSimulation", href: "/real-oyunlar#simulation-title", icon: Activity },
  { title: "teamStatistics", href: "/real-komandalar", icon: UsersRound },
  { title: "modelBacktesting", href: "/tarixce", icon: ChartNoAxesCombined },
] as const;

export default async function Home({ searchParams }: {
  searchParams: Promise<{ tarix?: string | string[] }>;
}) {
  const [{ t, intlLocale }, { tarix }] = await Promise.all([getPreferences(), searchParams]);
  const now = new Date();
  const today = dateKey(bakuDate(now));
  const selected = validDate(tarix) ? tarix : today;
  const date = new Date(selected);
  const adjacentDate = (offset: number) => dateKey(new Date(date.getTime() + offset * 86_400_000));
  const calendarUrl = "/oyunlar?tarix=" + selected;
  const feed = await loadFixtureFeed(fixtureView(selected, today, dateKey(bakuDate(now, 1))));
  const fixtures = feed?.competitions.flatMap((group) => group.matches
    .filter((match) => match.date === selected)
    .map((match) => {
      const rows = group.standings?.rows;
      const home = rows?.find(row => row.team.id === match.home.id);
      const away = rows?.find(row => row.team.id === match.away.id);
      const fixture = { ...match, competition: group.competition, stale: group.stale };
      if (selected < today || match.score || group.stale || (match.kickoff && Date.parse(match.kickoff) <= now.getTime())
        || !home || !away || Math.min(home.played, away.played) < 5) {
        return { ...fixture, priority: 0 };
      }
      const rank = Math.max(home.position, away.position);
      return { ...fixture, priority: rank <= 2 ? 2 : rank <= 4 ? 1 : 0 };
    }))
    .sort((a, b) => Number(Boolean(a.score)) - Number(Boolean(b.score))
      || b.priority - a.priority
      || (a.kickoff ?? "~").localeCompare(b.kickoff ?? "~")) ?? [];
  const [featured, ...nextMatches] = fixtures.slice(0, 5);
  const dateOnly = fixtureDateOnly(intlLocale);
  const dateTime = fixtureDateTime(intlLocale);
  const kickoffTime = new Intl.DateTimeFormat(intlLocale, {
    timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return <>
    <div className="heading calendar-heading">
      <h1>{t.dashboard}</h1>
      <div className={styles.dateControls}>
        <Link aria-label={t.previousDay} className={styles.dateArrow} href={"/?tarix=" + adjacentDate(-1)}><ChevronLeft size={17} aria-hidden="true" /></Link>
        <Form action="/" className="calendar-filter" key={selected}>
          <label className="sr-only" htmlFor="dashboard-date">{t.fixtureDate}</label>
          <input id="dashboard-date" type="date" name="tarix" required defaultValue={selected} />
          <button type="submit" className="primary">{t.showFixtures}</button>
        </Form>
        <Link aria-label={t.nextDay} className={styles.dateArrow} href={"/?tarix=" + adjacentDate(1)}><ChevronRight size={17} aria-hidden="true" /></Link>
        {selected !== today && <Link className={styles.allLink} href="/">{t.today}</Link>}
      </div>
    </div>
    <section aria-labelledby="real-preview">
      <div className="section-heading">
        <h2 id="real-preview"><CalendarDays size={22} aria-hidden="true" />{t.dailyFixtures}</h2>
        {feed && <span className="muted text-sm">{fixtures.length} {t.matches}</span>}
      </div>
      {featured ? <div className={styles.board} data-has-list={nextMatches.length > 0}>
        <article className={styles.feature}>
          <div className={styles.meta}><LeagueLabel code={featured.competition} />
            {featured.stale && <Badge>{t.staleData}</Badge>}
          </div>
          <div className={styles.matchup}>
            <div className={styles.team}><ClubCrest name={featured.home.name} /><strong>{featured.home.name}</strong></div>
            <div className={styles.kickoff}>
              {featured.score ? <strong className={styles.score}>{featured.score.join(" : ")}</strong>
                : featured.kickoff && <time dateTime={featured.kickoff}>{kickoffTime.format(new Date(featured.kickoff))}</time>}
              <small>{dateOnly.format(new Date(featured.date))}</small>
              {!featured.kickoff && !featured.score && <small>{t.kickoffTimeUnconfirmed}</small>}
            </div>
            <div className={styles.team}><ClubCrest name={featured.away.name} /><strong>{featured.away.name}</strong></div>
          </div>
          {featured.priority > 0 && <p className={styles.featureReason}>{featured.priority === 2 ? t.leadersMeet : t.topFourMeet}</p>}
          <div className={styles.actions}>
            <Link className="primary" href={realMatchPath(featured.id)}>{t.matchAnalysis}</Link>
            <Link className={styles.allLink} href={calendarUrl}>{t.fixtureSchedule}</Link>
          </div>
        </article>
        {nextMatches.length > 0 && <ul className={styles.matchList}>
          {nextMatches.map((match) => <li key={match.competition + match.id}>
            <Link href={realMatchPath(match.id)} className={styles.matchRow}>
              <span className={styles.matchNames}><ClubLabel name={match.home.name} /><ClubLabel name={match.away.name} />
                {match.priority > 0 && <small className={styles.featureReason}>{match.priority === 2 ? t.leadersMeet : t.topFourMeet}</small>}
              </span>
              <span className={styles.rowTime}>
                {match.score ? <strong className={styles.rowScore}>{match.score.join(" : ")}</strong>
                  : <time dateTime={match.kickoff ?? match.date}>{(match.kickoff ? dateTime : dateOnly).format(new Date(match.kickoff ?? match.date))}</time>}
                {match.stale ? <small>{t.staleData}</small> : !match.kickoff && !match.score && <small>{t.kickoffTimeUnconfirmed}</small>}
              </span>
            </Link>
          </li>)}
        </ul>}
      </div> : <section className="panel empty">
        <h2>{feed ? t.noMatchesFoundForThisDate : t.fixtureServiceUnavailable}</h2>
        <Link className={styles.allLink} href={calendarUrl}>{t.fixtureSchedule}</Link>
      </section>}
      {fixtures.length > 5 && <Link className={styles.fullDay} href={calendarUrl}>{t.fullDayFixtures}</Link>}
    </section>

    <nav className={styles.quickLinks} aria-label={t.analyticsSections}>
      {quickLinks.map(({ title, href, icon: Icon }) => <Link className={styles.quickLink} key={href} href={href}>
        <span className="stat-icon"><Icon size={19} aria-hidden="true" /></span>
        <strong>{t[title]}</strong>
      </Link>)}
    </nav>
  </>;
}
