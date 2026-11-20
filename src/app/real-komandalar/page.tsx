import type { Metadata } from "next";
import Link from "next/link";
import { ClubCrest, ClubLabel, LeagueLabel } from "@/components/club-crest";
import { competitionNames as names } from "@/lib/real-fixtures";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Real komanda statistikası" };

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

const timestamp = new Intl.DateTimeFormat("az-AZ", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Baku",
});
const calendarDate = new Intl.DateTimeFormat("az-AZ", {
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

function VenueRecord({ title, stats }: { title: string; stats: RecordLine }) {
  return <section className="panel detail">
    <h3 className="mb-2 font-bold">{title}</h3>
    <dl className="data-list">
      <div><dt>Oyun</dt><dd>{stats.played}</dd></div>
      <div><dt>Qələbə / heç-heçə / məğlubiyyət</dt><dd>{stats.wins} / {stats.draws} / {stats.losses}</dd></div>
      <div><dt>Vurulan / buraxılan qol</dt><dd>{stats.goals_for} / {stats.goals_against}</dd></div>
    </dl>
  </section>;
}

function TeamDetails({ stats }: { stats: TeamStats }) {
  return <section aria-labelledby="team-title" className="method-grid">
    <h2 id="team-title" className="crest-label"><ClubCrest name={stats.team.name} />{stats.team.name}</h2>
    <div className="detail-grid">
      <VenueRecord title="Ev oyunları" stats={stats.home} />
      <VenueRecord title="Səfər oyunları" stats={stats.away} />
    </div>
    <section className="panel detail">
      <h3 className="mb-2 font-bold">Son {stats.recent.length} nəticə</h3>
      <dl className="data-list">
        {stats.recent.map((match) => <div key={match.match_id}>
          <dt><ClubLabel name={match.opponent.name} /> · {match.venue === "home" ? "Ev" : "Səfər"}<br />
            <time dateTime={match.date}>{calendarDate.format(new Date(match.date))}</time></dt>
          <dd>{match.scored}:{match.conceded}<br />
            {match.scored > match.conceded ? "Qələbə" : match.scored === match.conceded ? "Heç-heçə" : "Məğlubiyyət"}
          </dd>
        </div>)}
      </dl>
    </section>
  </section>;
}

function LeagueTable({ league }: { league: Competition }) {
  if (!league.provisional_table) return <ul className="space-y-2">
    {league.teams.map((row) => <li key={row.team.id}><Link href={teamLink(league.competition, row.team.id)}><ClubLabel name={row.team.name} /></Link></li>)}
  </ul>;

  return <>
    <h2 id="league-table">Nəticələrdən hesablanan cədvəl</h2>
    <p className="muted mb-3">Xal, top fərqi və vurulan qola görə sıralanır. Mənbədə çatışmayan nəticələr və inzibati xal dəyişiklikləri cədvəldə yer almaya bilər.</p>
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-labelledby="league-table">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead><tr className="border-b border-slate-700 text-right">
          {["Komanda", "Oyun", "Qələbə", "Heç-heçə", "Məğlubiyyət", "Top fərqi", "Xal"].map((label, index) =>
            <th className={index === 0 ? "px-2 py-2 text-left" : "px-2 py-2"} scope="col" key={label}>{label}</th>)}
        </tr></thead>
        <tbody>{league.teams.map(({ team, total, points }) => <tr key={team.id} className="border-b border-slate-800 text-right">
          <th scope="row" className="px-2 py-2 text-left"><Link href={teamLink(league.competition, team.id)}><ClubLabel name={team.name} /></Link></th>
          <td className="px-2">{total.played}</td><td className="px-2">{total.wins}</td><td className="px-2">{total.draws}</td>
          <td className="px-2">{total.losses}</td><td className="px-2">{total.goals_for - total.goals_against}</td><td className="px-2 font-bold">{points}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}

export default async function TeamsPage({ searchParams }: {
  searchParams: Promise<{ liqa?: string; komanda?: string }>;
}) {
  const [params, data] = await Promise.all([searchParams, loadStatistics()]);
  const league = params.liqa
    ? data?.competitions.find((item) => item.competition === params.liqa)
    : data?.competitions.find((item) => item.teams.length > 0) ?? data?.competitions[0];
  const selected = league?.teams.find((row) => row.team.id === params.komanda);
  return <>
    <div className="heading"><div><h1>Real komanda statistikası</h1><p>Ev və səfər göstəriciləri, son nəticələr və liqa cədvəli</p></div></div>
    {data && <nav className="tabs flex-wrap" aria-label="Yarış seçimi">
      {data.competitions.map((item) => <Link key={item.competition} href={teamLink(item.competition)}
        aria-current={league?.competition === item.competition ? "page" : undefined}>
        <LeagueLabel code={item.competition} />
      </Link>)}
    </nav>}
    {data && data.unavailable.length > 0 && <p className="muted source">Məlumat əlçatan deyil: {data.unavailable.map((code) => names[code] ?? code).join(", ")}.</p>}
    {!league ? <section className="panel empty source"><h2>{data ? "Yarış üzrə məlumat tapılmadı" : "Məlumat xidməti əlçatan deyil"}</h2></section> : <>
      <section className="panel detail source">
        <div className="fixture-meta"><h2><LeagueLabel code={league.competition} /></h2>
          <Badge>{league.stale ? "Köhnəlmiş məlumat" : "Real nəticələr"}</Badge></div>
        <p className="muted mb-3">{data?.season}/{(data?.season ?? 0) + 1} · {league.completed_matches} tamamlanmış oyun · <a href={league.source_url}>{league.source}</a> · <time dateTime={league.fetched_at}>{timestamp.format(new Date(league.fetched_at))}</time></p>
        {params.komanda && <Link href={teamLink(league.competition)}>Komanda siyahısına qayıt</Link>}
        {league.teams.length === 0 ? <p className="muted">Mənbədə tamamlanmış oyun yoxdur.</p> :
          !params.komanda && <LeagueTable league={league} />}
      </section>
      {params.komanda && <div className="source">{selected ? <TeamDetails stats={selected} /> : <section className="panel empty"><h2>Komanda tapılmadı</h2></section>}</div>}
    </>}
  </>;
}
