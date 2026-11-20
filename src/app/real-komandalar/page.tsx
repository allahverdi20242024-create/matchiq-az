import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import { ClubCrest, ClubLabel, LeagueLabel } from "@/components/club-crest";
import { competitionName } from "@/lib/real-fixtures";
import { Badge } from "@/components/ui/badge";


type RecordLine = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
};
type Team = { id: string; name: string };
type Result = { match_id: string; date: string; opponent: Team; venue: "home" | "away"; scored: number; conceded: number };
type TeamStats = { team: Team; total: RecordLine; home: RecordLine; away: RecordLine; points: number; recent: Result[] };
type Competition = {
  competition: string;
  source: string;
  source_url: string;
  fetched_at: string;
  stale: boolean;
  completed_matches: number;
  provisional_table: boolean;
  teams: TeamStats[];
};
type Statistics = { season: number; unavailable: string[]; competitions: Competition[] };

const timestamp = (locale: string) => new Intl.DateTimeFormat(locale, {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Baku",
});
const calendarDate = (locale: string) => new Intl.DateTimeFormat(locale, {
  dateStyle: "medium", timeZone: "UTC",
});

async function loadStatistics(): Promise<Statistics | null> {
  try {
    const base = process.env.MATCHIQ_API_URL || "http://127.0.0.1:8000";
    const response = await fetch(new URL("/v1/team-stats", base), {
      cache: "no-store", signal: AbortSignal.timeout(4000),
    });
    return response.ok ? await response.json() as Statistics : null;
  } catch {
    return null;
  }
}

function teamLink(competition: string, team?: string) {
  const query = new URLSearchParams({ liqa: competition });
  if (team) query.set("komanda", team);
  return "/real-komandalar?" + query;
}

async function VenueRecord({ title, stats }: { title: string; stats: RecordLine }) {
  const { t } = await getPreferences();
  return <section className="panel detail">
    <h3 className="mb-2 font-bold">{title}</h3>
    <dl className="data-list">
      <div><dt>{t.played}</dt><dd>{stats.played}</dd></div>
      <div><dt>{t.winsDrawsLosses}</dt><dd>{stats.wins} / {stats.draws} / {stats.losses}</dd></div>
      <div><dt>{t.goalsForAgainst}</dt><dd>{stats.goals_for} / {stats.goals_against}</dd></div>
    </dl>
  </section>;
}

async function TeamDetails({ stats }: { stats: TeamStats }) {
  const { t, intlLocale } = await getPreferences();
  return <section aria-labelledby="team-title" className="method-grid">
    <h2 id="team-title" className="crest-label"><ClubCrest name={stats.team.name} />{stats.team.name}</h2>
    <div className="detail-grid">
      <VenueRecord title={t.homeMatches} stats={stats.home} />
      <VenueRecord title={t.awayMatches} stats={stats.away} />
    </div>
    <section className="panel detail">
      <h3 className="mb-2 font-bold">{t.last}{" "}{stats.recent.length}{" "}{t.results}</h3>
      <dl className="data-list">
        {stats.recent.map((match) => <div key={match.match_id}>
          <dt><ClubLabel name={match.opponent.name} /> · {match.venue === "home" ? t.home : t.away}<br />
            <time dateTime={match.date}>{calendarDate(intlLocale).format(new Date(match.date))}</time></dt>
          <dd>{match.scored}:{match.conceded}<br />
            {match.scored > match.conceded ? t.win : match.scored === match.conceded ? t.draw : t.loss}
          </dd>
        </div>)}
      </dl>
    </section>
  </section>;
}

async function LeagueTable({ league }: { league: Competition }) {
  const { t } = await getPreferences();
  if (!league.provisional_table) return <ul className="space-y-2">
    {league.teams.map((row) => <li key={row.team.id}><Link href={teamLink(league.competition, row.team.id)}><ClubLabel name={row.team.name} /></Link></li>)}
  </ul>;

  return <>
    <h2 id="league-table">{t.standingsCalculatedFromResults}</h2>
    <p className="muted mb-3">{t.standingsExplanation}</p>
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-labelledby="league-table">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead><tr className="border-b border-[var(--line)] text-right">
          {[t.team, t.played, t.win, t.draw, t.loss, t.goalDifference, t.points].map((label, index) =>
            <th className={index === 0 ? "px-2 py-2 text-left" : "px-2 py-2"} scope="col" key={label}>{label}</th>)}
        </tr></thead>
        <tbody>{league.teams.map(({ team, total, points }) => <tr key={team.id} className="border-b border-[var(--line)] text-right">
          <th scope="row" className="px-2 py-2 text-left"><Link href={teamLink(league.competition, team.id)}><ClubLabel name={team.name} /></Link></th>
          <td className="px-2">{total.played}</td><td className="px-2">{total.wins}</td><td className="px-2">{total.draws}</td>
          <td className="px-2">{total.losses}</td><td className="px-2">{total.goals_for - total.goals_against}</td><td className="px-2 font-bold">{points}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}

export async function generateMetadata() {
  const { t } = await getPreferences();
  return { title: t.realTeamStatistics };
}

export default async function TeamsPage({ searchParams }: {
  searchParams: Promise<{ liqa?: string; komanda?: string }>;
}) {
  const { t, intlLocale } = await getPreferences();
  const [params, data] = await Promise.all([searchParams, loadStatistics()]);
  const league = params.liqa
    ? data?.competitions.find((item) => item.competition === params.liqa)
    : data?.competitions.find((item) => item.teams.length > 0) ?? data?.competitions[0];
  const selected = league?.teams.find((row) => row.team.id === params.komanda);
  return <>
    <div className="heading"><div><h1>{t.realTeamStatistics}</h1><p>{t.homeAndAwayRecordsRecentResultsAnd}</p></div></div>
    {data && <nav className="tabs flex-wrap" aria-label={t.competitionSelection}>
      {data.competitions.map((item) => <Link key={item.competition} href={teamLink(item.competition)}
        aria-current={league?.competition === item.competition ? "page" : undefined}>
        <LeagueLabel code={item.competition} />
      </Link>)}
    </nav>}
    {data && data.unavailable.length > 0 && <p className="muted source">{t.dataUnavailable}{" "}{data.unavailable.map((code) => competitionName(code, t)).join(", ")}.</p>}
    {!league ? <section className="panel empty source"><h2>{data ? t.noDataFoundForThisCompetition : t.dataServiceUnavailable}</h2></section> : <>
      <section className="panel detail source">
        <div className="fixture-meta"><h2><LeagueLabel code={league.competition} /></h2>
          <Badge>{league.stale ? t.staleData : t.realResults}</Badge></div>
        <p className="muted mb-3">{data?.season}/{(data?.season ?? 0) + 1} · {league.completed_matches}{" " + t.completedMatches + " "}<a href={league.source_url}>{league.source}</a> · <time dateTime={league.fetched_at}>{timestamp(intlLocale).format(new Date(league.fetched_at))}</time></p>
        {params.komanda && <Link href={teamLink(league.competition)}>{t.returnToTeamList}</Link>}
        {league.teams.length === 0 ? <p className="muted">{t.theSourceHasNoCompletedMatches}</p> :
          !params.komanda && <LeagueTable league={league} />}
      </section>
      {params.komanda && <div className="source">{selected ? <TeamDetails stats={selected} /> : <section className="panel empty"><h2>{t.teamNotFound}</h2></section>}</div>}
    </>}
  </>;
}
