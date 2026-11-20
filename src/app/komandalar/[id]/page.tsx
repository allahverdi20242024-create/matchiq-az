import { getPreferences } from "@/lib/preferences";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Crest, FixtureCard, Form } from "@/components/matches";
import { fixtures, teams } from "@/lib/demo";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getPreferences();
  const { id } = await params;
  const team = teams.find((item) => item.id === id);
  if (!team) notFound();
  await connection();
  const now = new Date();
  return <>
    <div className="heading"><div><h1>{team.name}</h1><p>{t.demoTeamStatistics}</p></div><Crest team={team} large /></div>
    <section className="panel detail"><h2>{t.formOverTheLastFiveMatches}</h2><Form team={team} />
      <dl className="data-list">{[t.win, t.draw, t.loss].map((label, index) => <div key={label}><dt>{label}</dt><dd>{team.record[index]}</dd></div>)}</dl>
    </section>
    <section className="source"><div className="section-heading"><h2>{t.demoMatches}</h2></div><div className="match-grid">
      {fixtures.filter((fixture) => fixture.home.id === id || fixture.away.id === id).map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} now={now} />)}
    </div></section>
  </>;
}
