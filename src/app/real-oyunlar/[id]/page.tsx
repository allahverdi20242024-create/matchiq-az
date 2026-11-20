import Link from "next/link";
import { notFound } from "next/navigation";
import { ClubCrest, ClubLabel, LeagueLabel } from "@/components/club-crest";
import { Badge } from "@/components/ui/badge";
import { competitionNames, fixtureDateOnly, fixtureDateTime, loadFixtureDetail, realMatchPath } from "@/lib/real-fixtures";
import type { RealMatch } from "@/lib/real-fixtures";
import { SimulationPanel } from "../simulation";

export const metadata = { title: "Real oyun təhlili" };

function TeamForm({ team, matches }: { team: RealMatch["home"]; matches: RealMatch[] }) {
  return <section className="panel detail">
    <h2><ClubLabel name={team.name} /></h2>
    {matches.length === 0 ? <p className="muted">Mənbədə əvvəlki nəticə yoxdur.</p> :
      <dl className="data-list">
        {matches.map((match) => {
          if (!match.score) return null;
          const home = match.home.id === team.id;
          const opponent = home ? match.away : match.home;
          const scored = match.score[home ? 0 : 1];
          const conceded = match.score[home ? 1 : 0];
          return <div key={match.id}>
            <dt><ClubLabel name={opponent.name} /><br />
              <time dateTime={match.date}>{fixtureDateOnly.format(new Date(match.date))}</time> · {home ? "Ev" : "Səfər"}</dt>
            <dd><strong>{scored}:{conceded}</strong><br />
              <span className="muted">{scored > conceded ? "Qələbə" : scored === conceded ? "Heç-heçə" : "Məğlubiyyət"}</span>
            </dd>
          </div>;
        })}
      </dl>}
  </section>;
}

export default async function RealMatchPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sinaq?: string | string[] }>;
}) {
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
    <h1>Oyun məlumatı əlçatan deyil</h1>
    <Link className="primary" href="/real-oyunlar">Real oyunlara qayıt</Link>
  </section>;

  const { match } = detail;
  const displayDate = match.kickoff ? fixtureDateTime.format(new Date(match.kickoff))
    : fixtureDateOnly.format(new Date(match.date));
  const teamUrl = (teamId: string) => "/real-komandalar?" + new URLSearchParams({ liqa: match.competition, komanda: teamId });

  return <>
    <div className="heading"><div><h1>Real oyun təhlili</h1><p>Oyun məlumatı, son nəticələr və statistik proqnoz</p></div>
      <Link className="tabs px-3 py-2 text-sm" href="/real-oyunlar">Real oyunlar</Link></div>
    <section className="panel detail-hero">
      <div className="fixture-meta">
        <LeagueLabel code={match.competition} />
        <Badge>{detail.stale ? "Köhnəlmiş məlumat" : match.score ? "Başa çatıb" : "Real məlumat"}</Badge>
      </div>
      <div className="fixture-teams">
        <div><ClubCrest name={match.home.name} /><Link href={teamUrl(match.home.id)}>{match.home.name}</Link></div>
        <div className="calendar-kickoff">
          {match.score && <b>{match.score.join(" : ")}</b>}
          <time dateTime={match.kickoff ?? match.date}>{displayDate}</time>
          <small>{match.kickoff ? "Bakı vaxtı" : "Saat təsdiqlənməyib"}</small>
        </div>
        <div><ClubCrest name={match.away.name} /><Link href={teamUrl(match.away.id)}>{match.away.name}</Link></div>
      </div>
      <p className="muted text-sm">Mənbə <a href={detail.source_url}>{detail.source}</a> · Yenilənib <time dateTime={detail.fetched_at}>{fixtureDateTime.format(new Date(detail.fetched_at))}</time></p>
    </section>
    {detail.can_simulate ? <SimulationPanel showFixturePicker={false} action={realMatchPath(match.id)} matchId={match.id} rawTrials={sinaq}
      groups={[{ code: match.competition, label: competitionNames[match.competition] ?? match.competition,
        choices: [{ id: match.id, home: match.home.name, away: match.away.name }] }]} /> :
      <section className="panel detail">
        <h2>Monte Karlo simulyasiyası</h2>
        <p className="muted">{match.score || match.kickoff ? "Bu oyun üçün oyunöncəsi simulyasiya artıq əlçatan deyil."
          : "Bu günün oyunu üçün simulyasiya başlama saatı təsdiqləndikdən sonra əlçatan olur."}</p>
      </section>}
    <section className="source" aria-labelledby="recent-form">
      <h2 id="recent-form" className="mb-2">Son nəticələr</h2>
      <p className="muted mb-3">Mənbədə olan əvvəlki oyun günlərindən hər komanda üzrə ən çox beş nəticə.</p>
      <div className="detail-grid">
        <TeamForm team={match.home} matches={detail.recent_home} />
        <TeamForm team={match.away} matches={detail.recent_away} />
      </div>
    </section>
  </>;
}
