import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";
import { notFound } from "next/navigation";
import { ClubCrest, LeagueLabel } from "@/components/club-crest";
import { Badge } from "@/components/ui/badge";
import { bakuDate } from "@/lib/demo";
import { competitionName, fixtureDateOnly, fixtureDateTime, loadFixtureFeed, realMatchPath } from "@/lib/real-fixtures";
import type { RealMatch } from "@/lib/real-fixtures";

const titles = { "bu-gun": "todaySMatches", sabah: "tomorrowSMatches", gelecek: "upcomingMatches" } as const;
const tabs = { "bu-gun": "today", sabah: "tomorrow", gelecek: "upcoming" } as const;
const timeOnly = (locale: string) => new Intl.DateTimeFormat(locale, {
  timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit", hour12: false,
});

async function CalendarCard({ match, competition, stale, now }: {
  match: RealMatch;
  competition: string;
  stale: boolean;
  now: Date;
}) {
  const { t, intlLocale } = await getPreferences();
  const start = match.kickoff ? new Date(match.kickoff) : null;
  const eligible = !match.score && (start ? start > now : match.date > bakuDate(now).toISOString().slice(0, 10));
  return <article className="panel fixture calendar-card">
    <div className="fixture-meta"><LeagueLabel code={competition} />
      <Badge>{stale ? t.staleData : match.score ? t.finished : start && start <= now ? t.kickoffTimePassed : t.scheduled}</Badge></div>
    <div className="fixture-teams">
      <div><ClubCrest name={match.home.name} /><strong>{match.home.name}</strong></div>
      <div className="calendar-kickoff">
        {match.score ? <b>{match.score.join(" : ")}</b> :
          start ? <time dateTime={start.toISOString()}><b>{timeOnly(intlLocale).format(start)}</b></time> : <Clock3 size={24} aria-hidden="true" />}
        <small>{start && !match.score ? t.bakuTime : match.score ? t.finalScore : t.kickoffTimeUnconfirmed}</small>
        <time dateTime={match.date}><small>{fixtureDateOnly(intlLocale).format(new Date(match.date))}</small></time>
      </div>
      <div><ClubCrest name={match.away.name} /><strong>{match.away.name}</strong></div>
    </div>
    <Link className="fixture-link" href={realMatchPath(match.id)}
      aria-label={match.home.name + " " + t.and + " " + match.away.name + " " + t.fixtureAnalysisSuffix}>{t.matchAnalysis}</Link>
    {!eligible && !match.score && !start && <p className="muted text-sm">{t.simulationRequiresAConfirmedKickoffTime}</p>}
  </article>;
}

export default async function Matches({ params }: { params: Promise<{ period: string }> }) {
  const { t, intlLocale } = await getPreferences();
  const { period } = await params;
  if (period !== "bu-gun" && period !== "sabah" && period !== "gelecek") notFound();

  const view = period === "bu-gun" ? "today" : period === "sabah" ? "tomorrow" : "upcoming";
  const feed = await loadFixtureFeed(view);
  const now = new Date();
  const through = bakuDate(now, 6).toISOString().slice(0, 10);
  const groups = feed?.competitions.map((group) => ({
    ...group, matches: view === "upcoming" ? group.matches.filter((match) => match.date <= through) : group.matches,
  })).filter((group) => group.matches.length > 0) ?? [];
  const selectedDate = view === "upcoming" ? null : bakuDate(now, view === "tomorrow" ? 1 : 0);

  return <>
    <div className="heading">
      <div><h1>{t[titles[period]]}</h1><p>{period === "gelecek" ? t.realFixturesForTheNextSevenDays : t.realFixturesBakuTime}</p></div>
      {selectedDate && <span className="date-tag"><CalendarDays size={16} aria-hidden="true" />{fixtureDateOnly(intlLocale).format(selectedDate)}</span>}
    </div>
    <nav className="tabs mb-4 w-fit" aria-label={t.fixtureDates}>
      {Object.entries(tabs).map(([id, label]) =>
        <Link href={"/oyunlar/" + id} key={id} aria-current={period === id ? "page" : undefined}>{t[label]}</Link>)}
    </nav>
    {feed && feed.unavailable.length > 0 && <p className="muted mb-4 text-sm">
      {t.dataUnavailable}{" "}{feed.unavailable.map((code) => competitionName(code, t)).join(", ")}.
    </p>}
    {groups.length === 0 ? <section className="panel empty">
      <span className="stat-icon"><CalendarDays size={22} aria-hidden="true" /></span>
      <h2>{feed ? t.noMatchesFoundForThisDate : t.fixtureScheduleUnavailable}</h2>
      <p>{feed ? t.theConnectedSourcesHaveReturnedNoFixtures : t.refreshThePageInAMoment}</p>
    </section> : <div className="method-grid">
      {groups.map((group) => {
        return <section className="calendar-group" key={group.competition}>
          <div className="section-heading">
            <h2><LeagueLabel code={group.competition} /></h2>
            <p className="muted text-sm">{t.sourceWithColon}{" "}<a className="underline" href={group.source_url}>{group.source}</a> · <time dateTime={group.fetched_at}>{fixtureDateTime(intlLocale).format(new Date(group.fetched_at))}</time></p>
          </div>
          <div className="match-grid">{group.matches.map((match) =>
            <CalendarCard match={match} competition={group.competition} key={match.id} stale={group.stale} now={now} />)}</div>
        </section>;
      })}
    </div>}

  </>;
}
