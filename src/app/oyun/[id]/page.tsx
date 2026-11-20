import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CalendarDays, FlaskConical, Trophy } from "lucide-react";
import { Crest, Form, Probability } from "@/components/matches";
import { OutcomeChart } from "@/components/outcome-chart";
import { Badge } from "@/components/ui/badge";
import { fixtures, formatDate, formatDecimal, kickoff } from "@/lib/demo";

export default async function Analysis({ params }: { params: Promise<{ id: string }> }) {
  const { t, intlLocale } = await getPreferences();
  const { id } = await params;
  const fixture = fixtures.find((match) => match.id === id);
  if (!fixture) notFound();
  await connection();
  const date = kickoff(fixture);
  return <>
    <div className="heading"><div><h1>{t.matchAnalysis}</h1></div></div>
    <section className="panel detail-hero">
      <div className="fixture-meta"><span><Trophy size={16} /> {t.demoLeague}</span><Badge><FlaskConical size={13} />{" "}{t.demo}</Badge></div>
      <div className="fixture-teams">
        <div><Crest team={fixture.home} large /><Link href={"/komandalar/" + fixture.home.id}>{fixture.home.name}</Link></div>
        <time dateTime={date.toISOString()}><b>{fixture.time}</b><small><CalendarDays size={14} />{formatDate(date, intlLocale)}</small></time>
        <div><Crest team={fixture.away} large /><Link href={"/komandalar/" + fixture.away.id}>{fixture.away.name}</Link></div>
      </div>
    </section>
    <div className="detail-grid">
      <section className="panel detail"><h2>{t.outcomeProbabilities}</h2><OutcomeChart values={fixture.outcome} /><Probability fixture={fixture} /></section>
      <section className="panel detail"><h2>{t.goalProbabilities}</h2>
        <dl className="data-list">
          <div><dt>{fixture.home.name}{" "}{t.expectedGoals}</dt><dd>{formatDecimal(fixture.goals[0], intlLocale)}</dd></div>
          <div><dt>{fixture.away.name}{" "}{t.expectedGoals}</dt><dd>{formatDecimal(fixture.goals[1], intlLocale)}</dd></div>
          {fixture.over.map((value, index) => <div key={index}><dt>{new Intl.NumberFormat(intlLocale).format(index + 1.5)}{" "}{t.goalsOverUnder}</dt><dd>{value}% / {100 - value}%</dd></div>)}
          <div><dt>{t.bothTeamsToScore}</dt><dd>{fixture.btts}%</dd></div>
        </dl>
      </section>
      <section className="panel detail"><h2>{t.mostLikelyScores}</h2><dl className="data-list">
        {fixture.scores.map(([score, value]) => <div key={score}><dt>{score}</dt><dd>{value}%</dd></div>)}
      </dl></section>
      <section className="panel detail"><h2>{t.formOverTheLastFiveMatches}</h2><dl className="data-list">
        {[fixture.home, fixture.away].map((team) => <div key={team.id}><dt>{team.name}</dt><dd><Form team={team} /></dd></div>)}
      </dl></section>
    </div>
    <section className="panel detail source"><h2>{t.dataAndModel}</h2><dl className="data-list">
      <div><dt>{t.source}</dt><dd>{t.localDemoData}</dd></div>
      <div><dt>{t.dataLastUpdated}</dt><dd>{t.unavailable}</dd></div>
      <div><dt>{t.modelVersion}</dt><dd>{t.unavailable}</dd></div>
      <div><dt>{t.simulationsRun}</dt><dd>0</dd></div>
    </dl></section>
  </>;
}
