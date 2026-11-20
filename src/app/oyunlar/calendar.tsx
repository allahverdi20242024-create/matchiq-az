import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";
import Form from "next/form";
import { ClubCrest, LeagueLabel } from "@/components/club-crest";
import { Badge } from "@/components/ui/badge";
import { bakuDate } from "@/lib/demo";
import { fixtureDateOnly, loadFixtureFeed, realMatchPath } from "@/lib/real-fixtures";
import type { RealMatch } from "@/lib/real-fixtures";

const titles = { "bu-gun": "todaySMatches", sabah: "tomorrowSMatches", gelecek: "upcomingMatches" } as const;
const timeOnly = (locale: string) => new Intl.DateTimeFormat(locale, {
  timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit", hour12: false,
});

async function CalendarCard({ match, competition, stale, now, showDate }: {
  match: RealMatch;
  competition: string;
  stale: boolean;
  now: Date;
  showDate: boolean;
}) {
  const { t, intlLocale } = await getPreferences();
  const start = match.kickoff ? new Date(match.kickoff) : null;
  return <article className="panel fixture calendar-card">
    <div className="fixture-meta"><LeagueLabel code={competition} />
      <Badge>{stale ? t.staleData : match.score ? t.finished : start && start <= now ? t.kickoffTimePassed : t.scheduled}</Badge></div>
    <div className="fixture-teams">
      <div><ClubCrest name={match.home.name} /><strong>{match.home.name}</strong></div>
      <div className="calendar-kickoff">
        {match.score ? <b>{match.score.join(" : ")}</b> :
          start ? <time dateTime={start.toISOString()}><b>{timeOnly(intlLocale).format(start)}</b></time> : <Clock3 size={24} aria-hidden="true" />}
        <small>{start && !match.score ? t.bakuTime : match.score ? t.finalScore : t.kickoffTimeUnconfirmed}</small>
        {showDate && <time dateTime={match.date}><small>{fixtureDateOnly(intlLocale).format(new Date(match.date))}</small></time>}
      </div>
      <div><ClubCrest name={match.away.name} /><strong>{match.away.name}</strong></div>
    </div>
    <Link className="fixture-link" href={realMatchPath(match.id)}
      aria-label={match.home.name + " " + t.and + " " + match.away.name + " " + t.fixtureAnalysisSuffix}>{t.matchAnalysis}</Link>
  </article>;
}

type Period = keyof typeof titles;

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

function validDate(value: string | string[] | undefined): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && dateKey(date) === value;
}

export async function Calendar({ period, date }: { period?: Period; date?: string | string[] }) {
  const { t } = await getPreferences();
  const now = new Date();
  const today = dateKey(bakuDate(now));
  const tomorrow = dateKey(bakuDate(now, 1));
  const selected = validDate(date) ? date : period === "sabah" ? tomorrow : today;
  const upcoming = period === "gelecek" && date === undefined;
  const view = upcoming ? "upcoming" : selected === today ? "today" : selected === tomorrow ? "tomorrow"
    : selected > today ? "upcoming" : "results";
  const feed = await loadFixtureFeed(view);
  const through = dateKey(bakuDate(now, 6));
  const groups = feed?.competitions.map((group) => ({
    ...group, matches: group.matches.filter((match) => upcoming ? match.date <= through : match.date === selected),
  })).filter((group) => group.matches.length > 0) ?? [];

  return <>
    <div className="heading calendar-heading">
      <h1>{period ? t[titles[period]] : t.fixtureSchedule}</h1>
      <Form action="/oyunlar" className="calendar-filter" key={selected}>
        <label htmlFor="fixture-date">{t.fixtureDate}</label>
        <input id="fixture-date" type="date" name="tarix" required defaultValue={selected} />
        <button type="submit" className="primary">{t.showFixtures}</button>
      </Form>
    </div>
    {groups.length === 0 ? <section className="panel empty">
      <span className="stat-icon"><CalendarDays size={22} aria-hidden="true" /></span>
      <h2>{feed ? t.noMatchesFoundForThisDate : t.fixtureScheduleUnavailable}</h2>

    </section> : <div className="method-grid">
      {groups.map((group) => {
        return <section className="calendar-group" key={group.competition}>
          <div className="section-heading">
            <h2><LeagueLabel code={group.competition} /></h2>
          </div>
          <div className="match-grid">{group.matches.map((match) =>
            <CalendarCard match={match} competition={group.competition} key={match.id} stale={group.stale} now={now} showDate={upcoming} />)}</div>
        </section>;
      })}
    </div>}

  </>;
}
