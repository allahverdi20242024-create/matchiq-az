import { MatchResult } from "@/components/match-result";
import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubCrest, ClubLabel, LeagueLabel } from "@/components/club-crest";
import { Badge } from "@/components/ui/badge";
import { competitionName, fixtureDateOnly, fixtureDateTime, loadFixtureDetail, realMatchPath } from "@/lib/real-fixtures";
import type { RealMatch } from "@/lib/real-fixtures";
import { SimulationPanel } from "../simulation";
import { Suspense } from "react";
import { AiForecast } from "./ai-forecast";


async function TeamForm({ team, matches }: { team: RealMatch["home"]; matches: RealMatch[] }) {
  const { t, intlLocale } = await getPreferences();
  return <section className="panel detail">
    <h2><ClubLabel name={team.name} /></h2>
    {matches.length === 0 ? <p className="muted">{t.noPreviousResults}</p> :
      <dl className="data-list">
        {matches.map((match) => {
          if (!match.score) return null;
          const home = match.home.id === team.id;
          const opponent = home ? match.away : match.home;
          const scored = match.score[home ? 0 : 1];
          const conceded = match.score[home ? 1 : 0];
          return <div key={match.id}>
            <dt><ClubLabel name={opponent.name} /><br />
              <time dateTime={match.date}>{fixtureDateOnly(intlLocale).format(new Date(match.date))}</time> · {home ? t.home : t.away}</dt>
            <MatchResult scored={scored} conceded={conceded} />
          </div>;
        })}
      </dl>}
  </section>;
}

export async function generateMetadata() {
  const { t } = await getPreferences();
  return { title: t.realMatchAnalysis };
}

export default async function RealMatchPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sinaq?: string | string[] }>;
}) {
  const { t, intlLocale } = await getPreferences();
  const { id: routeId } = await params;
  let id: string;
  try {
    id = decodeURIComponent(routeId);
  } catch {
    notFound();
  }
  const [{ sinaq }, detail] = await Promise.all([searchParams, loadFixtureDetail(id)]);
  if (detail === "missing") notFound();
  if (!detail) return <section className="panel empty">
    <h1>{t.matchDataUnavailable}</h1>
    <Link className="primary" href="/real-oyunlar">{t.returnToRealFixtures}</Link>
  </section>;

  const { match } = detail;
  const displayDate = match.kickoff ? fixtureDateTime(intlLocale).format(new Date(match.kickoff))
    : fixtureDateOnly(intlLocale).format(new Date(match.date));
  const teamUrl = (teamId: string) => "/real-komandalar?" + new URLSearchParams({ liqa: match.competition, komanda: teamId });

  return <>
    <div className="heading"><div><h1>{t.realMatchAnalysis}</h1></div>
      <Link className="tabs px-3 py-2 text-sm" href="/real-oyunlar">{t.realFixtures}</Link></div>
    <section className="panel detail-hero">
      <div className="fixture-meta">
        <LeagueLabel code={match.competition} />
        {(detail.stale || match.score) && <Badge>{detail.stale ? t.staleData : t.finished}</Badge>}
      </div>
      <div className="fixture-teams">
        <div><ClubCrest name={match.home.name} /><Link href={teamUrl(match.home.id)}>{match.home.name}</Link></div>
        <div className="calendar-kickoff">
          {match.score && <b>{match.score.join(" : ")}</b>}
          <time dateTime={match.kickoff ?? match.date}>{displayDate}</time>
          <small>{match.kickoff ? t.bakuTime : t.kickoffTimeUnconfirmed}</small>
        </div>
        <div><ClubCrest name={match.away.name} /><Link href={teamUrl(match.away.id)}>{match.away.name}</Link></div>
      </div>
      <p className="muted text-sm">{t.updatedWithoutSeparator}{" "}<time dateTime={detail.fetched_at}>{fixtureDateTime(intlLocale).format(new Date(detail.fetched_at))}</time></p>
    </section>
    {detail.can_simulate ? <SimulationPanel showFixturePicker={false} action={realMatchPath(match.id)} matchId={match.id} rawTrials={sinaq}
      groups={[{ code: match.competition, label: competitionName(match.competition, t),
        choices: [{ id: match.id, home: match.home.name, away: match.away.name }] }]} /> :
      <section className="panel detail">
        <h2>{t.monteCarloSimulation}</h2>
        <p className="muted">{match.score || match.kickoff ? t.simulationClosed
          : t.simulationKickoffPending}</p>
      </section>}
    {detail.can_simulate && <Suspense fallback={<div className="panel detail" aria-busy="true"><div className="skeleton h-24" /></div>}>
      <AiForecast id={match.id} home={match.home.name} away={match.away.name} />
    </Suspense>}
    <section className="source" aria-labelledby="recent-form">
      <h2 id="recent-form" className="mb-2">{t.recentResults}</h2>
      
      <div className="detail-grid">
        <TeamForm team={match.home} matches={detail.recent_home} />
        <TeamForm team={match.away} matches={detail.recent_away} />
      </div>
    </section>
  </>;
}
