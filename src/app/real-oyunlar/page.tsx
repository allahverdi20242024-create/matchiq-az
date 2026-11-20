import Link from "next/link";
import { ClubLabel, LeagueLabel } from "@/components/club-crest";
import { competitionNames as competitions, fixtureDateOnly as dateOnly, fixtureDateTime as dateTime, loadFixtureFeed, realMatchPath } from "@/lib/real-fixtures";
import { SimulationPanel } from "./simulation";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Real oyunlar" };

export default async function RealFixtures({ searchParams }: {
  searchParams: Promise<{ nov?: string | string[]; oyun?: string | string[]; sinaq?: string | string[] }>;
}) {
  const params = await searchParams;
  const view = params.nov === "neticeler" ? "results" : "upcoming";
  const feed = await loadFixtureFeed(view);
  return <>
    <div className="heading"><div><h1>Real oyunlar</h1><p>Futbol təqvimi və provayderlərdən alınmış nəticələr</p></div></div>
    <div className="section-heading">
      <nav className="tabs" aria-label="Real oyunların görünüşü">
        <Link href="/real-oyunlar" aria-current={view === "upcoming" ? "page" : undefined}>Qarşıdakı oyunlar</Link>
        <Link href="/real-oyunlar?nov=neticeler" aria-current={view === "results" ? "page" : undefined}>Son nəticələr</Link>
      </nav>
    </div>
    {feed === null ? <section className="panel empty"><h2>Məlumat xidməti əlçatan deyil</h2><p>Bir qədər sonra səhifəni yeniləyin.</p></section> : <>
      {feed.unavailable.length > 0 && <p className="muted">Məlumat əlçatan deyil: {feed.unavailable.map((code) => competitions[code] ?? code).join(", ")}.</p>}
      {view === "upcoming" && <SimulationPanel matchId={params.oyun} rawTrials={params.sinaq} groups={feed.competitions
        .filter((group) => group.matches.length > 0)
        .map((group) => ({
          code: group.competition,
          label: competitions[group.competition] ?? group.competition,
          choices: group.matches.filter((match, index) => index < 8 || match.id === params.oyun).map((match) => ({ id: match.id, home: match.home.name, away: match.away.name })),
        }))} />}
      <div className="method-grid source">
        {feed.competitions.map((group) => <section className="panel detail" key={group.competition}>
          <div className="fixture-meta"><h2><LeagueLabel code={group.competition} /></h2>
            <Badge>{group.stale ? "Köhnəlmiş məlumat" : "Real məlumat"}</Badge></div>
          <p className="muted">Mənbə: <a href={group.source_url}>{group.source}</a> · Alınıb <time dateTime={group.fetched_at}>{dateTime.format(new Date(group.fetched_at))}</time></p>
          {group.matches.length === 0 ? <p className="muted">Bu bölmədə oyun yoxdur.</p> : <dl className="data-list">
            {group.matches.slice(0, 8).map((match) => <div key={match.id}>
              <dt><Link className="flex flex-wrap items-center gap-1.5" href={realMatchPath(match.id)}><ClubLabel name={match.home.name} /> <span aria-hidden="true">–</span> <ClubLabel name={match.away.name} /></Link></dt>
              <dd>
                {match.score && <strong>{match.score.join(" : ")} · </strong>}
                {match.kickoff ? <time dateTime={match.kickoff}>{dateTime.format(new Date(match.kickoff))}</time>
                  : <><time dateTime={match.date}>{dateOnly.format(new Date(match.date))}</time>{!match.score && " · Saat təsdiqlənməyib"}</>}
              </dd>
            </div>)}
          </dl>}
          {group.matches.length > 8 && <p className="muted">İlk 8 oyun göstərilir.</p>}
        </section>)}
      </div>
    </>}
  </>;
}
