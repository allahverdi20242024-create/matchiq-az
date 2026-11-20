import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CalendarDays, FlaskConical, Trophy } from "lucide-react";
import { Crest, Form, Probability } from "@/components/matches";
import { OutcomeChart } from "@/components/outcome-chart";
import { Badge } from "@/components/ui/badge";
import { fixtures, formatDate, formatDecimal, kickoff } from "@/lib/demo";

export default async function Analysis({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fixture = fixtures.find((match) => match.id === id);
  if (!fixture) notFound();
  await connection();
  const date = kickoff(fixture);
  return <>
    <div className="heading"><div><h1>Oyun təhlili</h1><p>Statistik göstəricilərin nümayişi</p></div></div>
    <section className="panel detail-hero">
      <div className="fixture-meta"><span><Trophy size={16} /> {fixture.competition}</span><Badge><FlaskConical size={13} /> Nümayiş</Badge></div>
      <div className="fixture-teams">
        <div><Crest team={fixture.home} large /><Link href={"/komandalar/" + fixture.home.id}>{fixture.home.name}</Link></div>
        <time dateTime={date.toISOString()}><b>{fixture.time}</b><small><CalendarDays size={14} />{formatDate(date)}</small></time>
        <div><Crest team={fixture.away} large /><Link href={"/komandalar/" + fixture.away.id}>{fixture.away.name}</Link></div>
      </div>
    </section>
    <div className="detail-grid">
      <section className="panel detail"><h2>Nəticə ehtimalları</h2><OutcomeChart values={fixture.outcome} /><Probability fixture={fixture} /></section>
      <section className="panel detail"><h2>Qol göstəriciləri</h2>
        <dl className="data-list">
          <div><dt>{fixture.home.name} · gözlənilən qol</dt><dd>{formatDecimal(fixture.goals[0])}</dd></div>
          <div><dt>{fixture.away.name} · gözlənilən qol</dt><dd>{formatDecimal(fixture.goals[1])}</dd></div>
          {fixture.over.map((value, index) => <div key={index}><dt>{index + 1},5 qoldan çox / az</dt><dd>{value}% / {100 - value}%</dd></div>)}
          <div><dt>Hər iki komanda qol vurur</dt><dd>{fixture.btts}%</dd></div>
        </dl>
      </section>
      <section className="panel detail"><h2>Ən ehtimallı hesablar</h2><dl className="data-list">
        {fixture.scores.map(([score, value]) => <div key={score}><dt>{score}</dt><dd>{value}%</dd></div>)}
      </dl></section>
      <section className="panel detail"><h2>Son beş oyunun forması</h2><dl className="data-list">
        {[fixture.home, fixture.away].map((team) => <div key={team.id}><dt>{team.name}</dt><dd><Form team={team} /></dd></div>)}
      </dl><p className="muted">Q — qələbə · H — heç-heçə · M — məğlubiyyət</p></section>
    </div>
    <section className="panel detail source"><h2>Məlumat və model</h2><dl className="data-list">
      <div><dt>Mənbə</dt><dd>Yerli nümayiş məlumatları</dd></div>
      <div><dt>Məlumatın yenilənmə vaxtı</dt><dd>Mövcud deyil</dd></div>
      <div><dt>Model versiyası</dt><dd>Mövcud deyil</dd></div>
      <div><dt>İcra edilmiş simulyasiyalar</dt><dd>0</dd></div>
    </dl></section>
  </>;
}
