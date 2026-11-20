import Link from "next/link";
import { CalendarDays, ChevronRight, Trophy } from "lucide-react";
import type { Fixture, Period, Team } from "@/lib/demo";
import { formatDate, getFixtures, kickoff, outcomeColors, outcomeLabels, periods } from "@/lib/demo";
import { Badge } from "./ui/badge";

export function Crest({ team, large = false }: { team: Team; large?: boolean }) {
  return <span className={large ? "crest crest-large" : "crest"} style={{ color: team.color }} aria-hidden="true">{team.initials}</span>;
}

export function Probability({ fixture }: { fixture: Fixture }) {
  return <div>
    <div className="probability-track" aria-hidden="true">
      {fixture.outcome.map((value, index) => <div key={outcomeLabels[index]} style={{ flex: value, backgroundColor: outcomeColors[index] }} />)}
    </div>
    <div className="probability-labels">
      {fixture.outcome.map((value, index) => <span key={outcomeLabels[index]}><b style={{ color: outcomeColors[index] }}>{value}%</b> {outcomeLabels[index]}</span>)}
    </div>
  </div>;
}

export function FixtureCard({ fixture, now }: { fixture: Fixture; now: Date }) {
  const date = kickoff(fixture, now);
  return <article className="panel fixture">
    <div className="fixture-meta"><span><Trophy size={14} /> {fixture.competition}</span><Badge>Nümayiş</Badge></div>
    <div className="fixture-teams">
      <div><Crest team={fixture.home} /><strong>{fixture.home.name}</strong></div>
      <time dateTime={date.toISOString()}><b>{fixture.time}</b><small>{formatDate(date)}</small></time>
      <div><Crest team={fixture.away} /><strong>{fixture.away.name}</strong></div>
    </div>
    <Probability fixture={fixture} />
    <Link className="fixture-link" href={"/oyun/" + fixture.id} aria-label={fixture.home.name + " və " + fixture.away.name + " oyununu təhlil et"}>Oyun təhlili <ChevronRight size={16} aria-hidden="true" /></Link>
  </article>;
}

export function FixtureList({ period, now, title = "Oyun cədvəli", showTabs = true }: { period: Period; now: Date; title?: string; showTabs?: boolean }) {
  const matches = getFixtures(period);
  return <section aria-labelledby="match-list">
    <div className="section-heading"><h2 id="match-list"><CalendarDays size={23} aria-hidden="true" /> {title}</h2>
      {showTabs && <nav aria-label="Oyun tarixləri" className="tabs">
        {Object.entries(periods).map(([id, name]) => <Link key={id} href={"/oyunlar/" + id} aria-current={id === period ? "page" : undefined}>{name}</Link>)}
      </nav>}
    </div>
    <div className="match-grid">{matches.map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} now={now} />)}</div>
  </section>;
}

export function Form({ team }: { team: Team }) {
  const labels = { Q: "Qələbə", H: "Heç-heçə", M: "Məğlubiyyət" };
  return <ul className="form-row" aria-label={team.name + " komandasının son beş oyunu"}>
    {team.form.map((result, index) => <li key={index} data-result={result} aria-label={labels[result]} title={labels[result]}>{result}</li>)}
  </ul>;
}
