import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import Form from "next/form";
import { ClubLabel, LeagueLabel } from "@/components/club-crest";
import { bakuDate } from "@/lib/demo";
import { competitionName, fixtureDateOnly, loadFixtureFeed, realMatchPath } from "@/lib/real-fixtures";
import { dateKey, fixtureView, validDate } from "@/lib/fixture-date";
import type { RealMatch } from "@/lib/real-fixtures";
import styles from "./calendar.module.css";

const titles = { "bu-gun": "todaySMatches", sabah: "tomorrowSMatches", gelecek: "upcomingMatches" } as const;
const timeOnly = (locale: string) => new Intl.DateTimeFormat(locale, {
  timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit", hour12: false,
});

async function CalendarRow({ match, now, showDate }: {
  match: RealMatch;
  now: Date;
  showDate: boolean;
}) {
  const { t, intlLocale } = await getPreferences();
  const start = match.kickoff ? new Date(match.kickoff) : null;
  return <li><Link className={styles.row} href={realMatchPath(match.id)}>
      <span className={styles.time}>
        {start && !match.score && <time dateTime={start.toISOString()}>{timeOnly(intlLocale).format(start)}</time>}
        <small>{match.score ? t.finished : start ? (start <= now ? t.kickoffTimePassed : t.scheduled) : t.kickoffTimeUnconfirmed}</small>
        {showDate && <time dateTime={match.date}><small>{fixtureDateOnly(intlLocale).format(new Date(match.date))}</small></time>}
      </span>
      <span className={styles.teams}>
        <span><ClubLabel name={match.home.name} />{match.score && <b>{match.score[0]}</b>}</span>
        <span><ClubLabel name={match.away.name} />{match.score && <b>{match.score[1]}</b>}</span>
      </span>
      <ChevronRight size={16} aria-hidden="true" />
    </Link></li>;
}

type Period = keyof typeof titles;

export async function Calendar({ period, date, league }: {
  period?: Period; date?: string | string[]; league?: string | string[];
}) {
  const { t, intlLocale } = await getPreferences();
  const now = new Date();
  const today = dateKey(bakuDate(now));
  const tomorrow = dateKey(bakuDate(now, 1));
  const selected = validDate(date) ? date : period === "sabah" ? tomorrow : today;
  const upcoming = period === "gelecek" && date === undefined;
  const view = upcoming ? "upcoming" : fixtureView(selected, today, tomorrow);
  const feed = await loadFixtureFeed(view, today);
  const competitions = feed?.competitions ?? [];
  const selectedLeague = competitions.find(({ competition }) => competition === league)?.competition ?? "";
  const through = dateKey(bakuDate(now, 6));
  const weekday = new Intl.DateTimeFormat(intlLocale, { weekday: "short", timeZone: "UTC" });
  const dayNumber = new Intl.DateTimeFormat(intlLocale, { day: "numeric", timeZone: "UTC" });
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.parse(selected) + (i - 3) * 86_400_000));
  const groups = competitions.filter((group) => !selectedLeague || group.competition === selectedLeague).map((group) => ({
    ...group, matches: group.matches.filter((match) => upcoming ? match.date <= through : match.date === selected),
  })).filter((group) => group.matches.length > 0);

  return <>
    <div className="heading calendar-heading">
      <h1>{period ? t[titles[period]] : t.fixtureSchedule}</h1>
      <Form action="/oyunlar" className={`calendar-filter ${styles.filters}`} key={selected + ":" + selectedLeague}>
        <label htmlFor="fixture-date">{t.fixtureDate}</label>
        <input id="fixture-date" type="date" name="tarix" autoComplete="off" required defaultValue={selected} />
        <label className="sr-only" htmlFor="fixture-league">{t.competitionSelection}</label>
        <select id="fixture-league" name="liqa" defaultValue={selectedLeague}>
          <option value="">{t.allLeagues}</option>
          {competitions.map(({ competition }) => <option key={competition} value={competition}>
            {competitionName(competition, t)}
          </option>)}
        </select>
        <button type="submit" className="primary">{t.showFixtures}</button>
      </Form>
    </div>
    {!upcoming && <nav className={styles.days} aria-label={t.fixtureDate}>
      {days.map(day => {
        const key = dateKey(day);
        const params = new URLSearchParams({ tarix: key });
        if (selectedLeague) params.set("liqa", selectedLeague);
        return <Link key={key} href={"/oyunlar?" + params} aria-current={key === selected ? "date" : undefined}
          aria-label={fixtureDateOnly(intlLocale).format(day)}>
          <small>{key === today ? t.today : weekday.format(day)}</small><strong>{dayNumber.format(day)}</strong>
        </Link>;
      })}
    </nav>}
    {groups.length === 0 ? <section className="panel empty">
      <span className="stat-icon"><CalendarDays size={22} aria-hidden="true" /></span>
      <h2>{feed ? t.noMatchesFoundForThisDate : t.fixtureScheduleUnavailable}</h2>

    </section> : <div className={styles.groups}>
      {groups.map((group) => {
        return <section className={`panel ${styles.group}`} key={group.competition}>
          <div className={styles.league}>
            <h2><LeagueLabel code={group.competition} /></h2>
            {group.stale && <small>{t.staleData}</small>}
          </div>
          <ul className={styles.matches}>{group.matches.map((match) =>
            <CalendarRow match={match} key={match.id} now={now} showDate={upcoming} />)}</ul>
        </section>;
      })}
    </div>}

  </>;
}
