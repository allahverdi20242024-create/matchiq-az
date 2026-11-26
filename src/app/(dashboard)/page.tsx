import { Suspense } from "react";
import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import Form from "next/form";
import { Activity, ArrowUpRight, ChartNoAxesCombined, ChevronLeft, ChevronRight, UsersRound } from "lucide-react";
import { ClubCrest, ClubLabel, LeagueLabel } from "@/components/club-crest";
import { Badge } from "@/components/ui/badge";
import { dateKey, fixtureView, isDashboardUpcoming, validDate } from "@/lib/fixture-date";
import { bakuDate } from "@/lib/demo";
import { fixtureDateOnly, loadFixtureFeed, realMatchPath } from "@/lib/real-fixtures";
import styles from "./dashboard.module.css";
import { FeaturedForm } from "./featured-form";

const quickLinks = [
  { title: "monteCarloSimulation", href: "/real-oyunlar#simulation-title", icon: Activity },
  { title: "teamStatistics", href: "/real-komandalar", icon: UsersRound },
  { title: "modelBacktesting", href: "/tarixce", icon: ChartNoAxesCombined },
] as const;

export default async function Home({ searchParams }: {
  searchParams: Promise<{ tarix?: string | string[] }>;
}) {
  const [{ t }, { tarix }] = await Promise.all([getPreferences(), searchParams]);
  const now = new Date();
  const today = dateKey(bakuDate(now));
  const tomorrow = dateKey(bakuDate(now, 1));
  const selected = validDate(tarix) ? tarix : today;
  const date = new Date(selected);
  const adjacentDate = (offset: number) => dateKey(new Date(date.getTime() + offset * 86_400_000));
  const calendarUrl = "/oyunlar?tarix=" + selected;
  return <>
    <h1 id="real-preview" className={styles.title}>{t.dailyFixtures}</h1>
    <div className={styles.toolbar}>
      <div className={styles.dateShortcuts}>
        <Link prefetch={false} href="/" aria-current={selected === today ? "date" : undefined}>{t.today}</Link>
        <Link prefetch={false} href={"/?tarix=" + tomorrow} aria-current={selected === tomorrow ? "date" : undefined}>{t.tomorrow}</Link>
      </div>
      <div className={styles.dateControls}>
        <Link prefetch={false} aria-label={t.previousDay} className={styles.dateArrow} href={"/?tarix=" + adjacentDate(-1)}><ChevronLeft size={17} aria-hidden="true" /></Link>
        <Form action="/" className="calendar-filter" key={selected}>
          <label className="sr-only" htmlFor="dashboard-date">{t.fixtureDate}</label>
          <input id="dashboard-date" type="date" name="tarix" autoComplete="off" required defaultValue={selected} />
          <button type="submit" className={styles.dateSubmit}>{t.showFixtures}</button>
        </Form>
        <Link prefetch={false} aria-label={t.nextDay} className={styles.dateArrow} href={"/?tarix=" + adjacentDate(1)}><ChevronRight size={17} aria-hidden="true" /></Link>
      </div>
    </div>
    <section aria-labelledby="real-preview">
      <Suspense key={selected} fallback={<>
        <div role="status" className="skeleton skeleton-hero"><span className="sr-only">{t.loading}</span></div>
      </>}>
        <DailyFixtures selected={selected} today={today} tomorrow={tomorrow} now={now} calendarUrl={calendarUrl} />
      </Suspense>
    </section>

    <nav className={styles.quickLinks} aria-label={t.analyticsSections}>
      {quickLinks.map(({ title, href, icon: Icon }) => <Link className={styles.quickLink} key={href} href={href}>
        <Icon size={17} aria-hidden="true" />
        <strong>{t[title]}</strong><ArrowUpRight size={16} aria-hidden="true" />
      </Link>)}
    </nav>
  </>;
}

async function DailyFixtures({ selected, today, tomorrow, now, calendarUrl }: {
  selected: string;
  today: string;
  tomorrow: string;
  now: Date;
  calendarUrl: string;
}) {
  const { t, intlLocale } = await getPreferences();
  const feed = selected < today ? undefined
    : await loadFixtureFeed(fixtureView(selected, today, tomorrow), today);
  const fixtures = feed?.competitions.flatMap((group) => group.matches
    .filter((match) => match.date === selected && isDashboardUpcoming(match, now, today))
    .map((match) => {
      const rows = group.standings?.rows;
      const home = rows?.find(row => row.team.id === match.home.id);
      const away = rows?.find(row => row.team.id === match.away.id);
      const fixture = { ...match, competition: group.competition, stale: group.stale };
      if (group.stale || !home || !away || Math.min(home.played, away.played) < 5) {
        return { ...fixture, priority: 0 };
      }
      const rank = Math.max(home.position, away.position);
      return { ...fixture, priority: rank <= 2 ? 2 : rank <= 4 ? 1 : 0 };
    }))
    .sort((a, b) => b.priority - a.priority
      || (a.kickoff ?? "~").localeCompare(b.kickoff ?? "~")) ?? [];
  const [featured, ...nextMatches] = fixtures.slice(0, 5);
  const dateOnly = fixtureDateOnly(intlLocale);
  const kickoffTime = new Intl.DateTimeFormat(intlLocale, {
    timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return <>
    {featured ? <div className={styles.board} data-has-list={nextMatches.length > 0}>
      {nextMatches.length > 0 && <div className={styles.schedule}>
        <div className={styles.scheduleHeader}>
          <h2>{new Intl.NumberFormat(intlLocale).format(fixtures.length)} {t.matches}</h2>
          <Link className={styles.allLink} href={calendarUrl}>{t.fullDayFixtures}</Link>
        </div>
        <ul className={styles.matchList}>
          {nextMatches.map((match) => <li key={match.competition + match.id}>
            <Link prefetch={false} href={realMatchPath(match.id)} className={styles.matchRow}>
              <span className={styles.rowTime}>
                {match.kickoff && <time dateTime={match.kickoff}>{kickoffTime.format(new Date(match.kickoff))}</time>}
                {match.stale ? <small>{t.staleData}</small> : !match.kickoff && <small>{t.kickoffTimeUnconfirmed}</small>}
              </span>
              <span className={styles.matchNames}><ClubLabel name={match.home.name} /><ClubLabel name={match.away.name} /></span>
              <span className={styles.rowLeague}><LeagueLabel code={match.competition} /></span>
              <ChevronRight className={styles.rowChevron} size={15} aria-hidden="true" />
            </Link>
          </li>)}
        </ul>
      </div>}
      <article className={styles.feature}>
        <div className={styles.meta}><LeagueLabel code={featured.competition} />
          {featured.stale && <Badge>{t.staleData}</Badge>}
        </div>
        <div className={styles.matchup}>
          <div className={styles.team}><ClubCrest name={featured.home.name} eager /><strong>{featured.home.name}</strong></div>
          <div className={styles.kickoff}>
            {featured.kickoff && <time dateTime={featured.kickoff}>{kickoffTime.format(new Date(featured.kickoff))}</time>}
            <small>{dateOnly.format(new Date(featured.date))}</small>
            {!featured.kickoff && <small>{t.kickoffTimeUnconfirmed}</small>}
          </div>
          <div className={styles.team}><ClubCrest name={featured.away.name} eager /><strong>{featured.away.name}</strong></div>
        </div>
        <Suspense key={featured.id} fallback={<div className={styles.formPlaceholder} role="status">
          <span className="sr-only">{t.loading}</span>
        </div>}>
          <FeaturedForm fixtureId={featured.id} />
        </Suspense>
        <div className={styles.actions}>
          <Link className="primary" href={realMatchPath(featured.id)}>{t.matchAnalysis}</Link>
          {!nextMatches.length && <Link className={styles.allLink} href={calendarUrl}>{t.fixtureSchedule}</Link>}
        </div>
      </article>
    </div> : <section className="panel empty">
      <h2>{feed === null ? t.fixtureServiceUnavailable : t.noUpcomingMatchesForDate}</h2>
      <Link className={styles.allLink} href={calendarUrl}>{t.fixtureSchedule}</Link>
    </section>}
    </>;
}
