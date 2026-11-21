import { getPreferences } from "@/lib/preferences";
import Link from "next/link";
import { CalendarDays, ChevronRight, Trophy } from "lucide-react";
import type { Fixture, Period, Team } from "@/lib/demo";
import { formatDate, getFixtures, kickoff, outcomeColors } from "@/lib/demo";
import { Badge } from "./ui/badge";

export function Crest({ team, large = false }: { team: Team; large?: boolean }) {
  return <span className={large ? "crest crest-large" : "crest"} style={{ color: team.color }} aria-hidden="true">{team.initials}</span>;
}

export async function Probability({ fixture }: { fixture: Fixture }) {
  const { t } = await getPreferences();
  const labels = [t.home, t.draw, t.away];
  return <div>
    <div className="probability-track" aria-hidden="true">
      {fixture.outcome.map((value, index) => <div key={labels[index]} style={{ flex: value, backgroundColor: `var(--outcome-${index}, ${outcomeColors[index]})` }} />)}
    </div>
    <div className="probability-labels">
      {fixture.outcome.map((value, index) => <span key={labels[index]}><b style={{ color: `var(--outcome-${index}, ${outcomeColors[index]})` }}>{value}%</b> {labels[index]}</span>)}
    </div>
  </div>;
}

export async function FixtureCard({ fixture, now }: { fixture: Fixture; now: Date }) {
  const { t, intlLocale } = await getPreferences();
  const date = kickoff(fixture, now);
  return <article className="panel fixture">
    <div className="fixture-meta"><span><Trophy size={14} /> {t.demoLeague}</span><Badge>{t.demo}</Badge></div>
    <div className="fixture-teams">
      <div><Crest team={fixture.home} /><strong>{fixture.home.name}</strong></div>
      <time dateTime={date.toISOString()}><b>{fixture.time}</b><small>{formatDate(date, intlLocale)}</small></time>
      <div><Crest team={fixture.away} /><strong>{fixture.away.name}</strong></div>
    </div>
    <Probability fixture={fixture} />
    <Link className="fixture-link" href={"/oyun/" + fixture.id} aria-label={fixture.home.name + " " + t.and + " " + fixture.away.name + " " + t.demoAnalysisSuffix}>{t.matchAnalysis}{" "}<ChevronRight size={16} aria-hidden="true" /></Link>
  </article>;
}

export async function FixtureList({ period, now, title, showTabs = true }: { period: Period; now: Date; title?: string; showTabs?: boolean }) {
  const { t } = await getPreferences();
  const matches = getFixtures(period);
  return <section aria-labelledby="match-list">
    <div className="section-heading"><h2 id="match-list"><CalendarDays size={23} aria-hidden="true" /> {title ?? t.fixtureSchedule}</h2>
      {showTabs && <nav aria-label={t.fixtureDates} className="tabs">
        {Object.entries({ "bu-gun": t.today, sabah: t.tomorrow, gelecek: t.upcoming }).map(([id, name]) => <Link key={id} href={"/oyunlar/" + id} aria-current={id === period ? "page" : undefined}>{name}</Link>)}
      </nav>}
    </div>
    <div className="match-grid">{matches.map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} now={now} />)}</div>
  </section>;
}

export async function Form({ team }: { team: Team }) {
  const { t, locale } = await getPreferences();
  const formSymbols = locale === "en" ? { Q: "W", H: "D", M: "L" } : { Q: "Q", H: "H", M: "M" };
  const labels = { Q: t.win, H: t.draw, M: t.loss };
  return <ul className="form-row" aria-label={team.name + " " + t.lastFiveMatches}>
    {team.form.map((result, index) => <li key={index} data-result={result} aria-label={labels[result]} title={labels[result]}>{formSymbols[result]}</li>)}
  </ul>;
}
