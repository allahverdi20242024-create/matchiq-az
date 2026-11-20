import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import { ClubLabel, LeagueLabel } from "@/components/club-crest";
import { competitionName, fixtureDateOnly as dateOnly, fixtureDateTime as dateTime, loadFixtureFeed, realMatchPath } from "@/lib/real-fixtures";
import { SimulationPanel } from "./simulation";
import { Badge } from "@/components/ui/badge";


export async function generateMetadata() {
  const { t } = await getPreferences();
  return { title: t.realFixtures };
}

export default async function RealFixtures({ searchParams }: {
  searchParams: Promise<{ nov?: string | string[]; oyun?: string | string[]; sinaq?: string | string[] }>;
}) {
  const { t, intlLocale } = await getPreferences();
  const params = await searchParams;
  const view = params.nov === "neticeler" ? "results" : "upcoming";
  const feed = await loadFixtureFeed(view);
  return <>
    <div className="heading"><div><h1>{t.realFixtures}</h1></div></div>
    <div className="section-heading">
      <nav className="tabs" aria-label={t.fixtureView}>
        <Link href="/real-oyunlar" aria-current={view === "upcoming" ? "page" : undefined}>{t.upcomingMatches}</Link>
        <Link href="/real-oyunlar?nov=neticeler" aria-current={view === "results" ? "page" : undefined}>{t.recentResults}</Link>
      </nav>
    </div>
    {feed === null ? <section className="panel empty"><h2>{t.dataServiceUnavailable}</h2><p>{t.refreshThePageInAMoment}</p></section> : <>
      {feed.unavailable.length > 0 && <p className="muted">{t.dataUnavailable}{" "}{feed.unavailable.map((code) => competitionName(code, t)).join(", ")}.</p>}
      {view === "upcoming" && <SimulationPanel matchId={params.oyun} rawTrials={params.sinaq} groups={feed.competitions
        .filter((group) => group.matches.length > 0)
        .map((group) => ({
          code: group.competition,
          label: competitionName(group.competition, t),
          choices: group.matches.map((match) => ({ id: match.id, home: match.home.name, away: match.away.name })),
        }))} />}
      <div className="method-grid source">
        {feed.competitions.map((group) => <section className="panel detail" key={group.competition}>
          <div className="fixture-meta"><h2><LeagueLabel code={group.competition} /></h2>
            <Badge>{group.stale ? t.staleData : t.realData}</Badge></div>
          <p className="muted">{t.sourceWithColon}{" "}<a href={group.source_url}>{group.source}</a>{" " + t.retrieved + " "}<time dateTime={group.fetched_at}>{dateTime(intlLocale).format(new Date(group.fetched_at))}</time></p>
          {group.matches.length === 0 ? <p className="muted">{t.noMatchesInThisSection}</p> : <dl className="data-list">
            {group.matches.slice(0, 8).map((match) => <div key={match.id}>
              <dt><Link className="flex flex-wrap items-center gap-1.5" href={realMatchPath(match.id)}><ClubLabel name={match.home.name} /> <span aria-hidden="true">–</span> <ClubLabel name={match.away.name} /></Link></dt>
              <dd>
                {match.score && <strong>{match.score.join(" : ")} · </strong>}
                {match.kickoff ? <time dateTime={match.kickoff}>{dateTime(intlLocale).format(new Date(match.kickoff))}</time>
                  : <><time dateTime={match.date}>{dateOnly(intlLocale).format(new Date(match.date))}</time>{!match.score && " " + t.kickoffUnconfirmedSuffix}</>}
              </dd>
            </div>)}
          </dl>}
          {group.matches.length > 8 && <p className="muted">{t.showingTheFirst8Matches}</p>}
        </section>)}
      </div>
    </>}
  </>;
}
