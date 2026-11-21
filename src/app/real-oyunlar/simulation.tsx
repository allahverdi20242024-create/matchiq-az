import { getPreferences } from "@/lib/preferences";
import Form from "next/form";
import { OutcomeChart } from "@/components/outcome-chart";
import { fixtureDateTime } from "@/lib/real-fixtures";
import { ClubLabel, LeagueLabel } from "@/components/club-crest";

import type { FixtureGroup } from "@/lib/fixture-search";
import { FixturePicker } from "./fixture-picker";

export const maxTrials = 100_000;

type Result = {
  trials: number;
  model_version: string;
  calculated_at: string;
  expected_home: number;
  expected_away: number;
  home_win: number;
  draw: number;
  away_win: number;
  both_score: number;
  over: Record<string, number>;
  scores: [number, number, number][];
};

const countFormatter = (locale: string) => new Intl.NumberFormat(locale);
const percentFormatter = (locale: string) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 });
const goalFormatter = (locale: string) => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function simulate(matchId: string, trials: number): Promise<Result | string> {
  const { t } = await getPreferences();
  try {
    const apiUrl = process.env.MATCHIQ_API_URL || "http://127.0.0.1:8000";
    const url = new URL("/v1/simulations/" + encodeURIComponent(matchId), apiUrl);
    url.searchParams.set("trials", String(trials));
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (response.status === 409) return t.simulationInsufficientResults;
    if (response.status === 404) return t.simulationUnavailableForMatch;
    if (response.ok) return await response.json() as Result;
  } catch {
    // The fixture list stays available when the simulation endpoint is offline.
  }
  return t.simulationServiceUnavailable;
}

export async function SimulationPanel({ groups, matchId, rawTrials, action = "/real-oyunlar", showFixturePicker = true }: {
  groups: FixtureGroup[];
  action?: string;
  showFixturePicker?: boolean;
  matchId?: string | string[];
  rawTrials?: string | string[];
}) {
  const { t, intlLocale } = await getPreferences();
  const group = groups.find((item) => item.choices.some((match) => match.id === matchId));
  const choice = group?.choices.find((match) => match.id === matchId);
  const trials = typeof rawTrials === "string" && /^\d{1,6}$/.test(rawTrials) ? Number(rawTrials) : 0;
  const validTrials = trials >= 1 && trials <= maxTrials;
  const submitted = rawTrials !== undefined;
  let result: Result | string | undefined;
  if (submitted) {
    if (!choice) result = t.simulationMatchRequired;
    else if (!validTrials) result = t.simulationInvalidTrialCount;
    else result = await simulate(choice.id, trials);
  }

  return <section className="panel detail source" aria-labelledby="simulation-title">
    <h2 id="simulation-title">{t.monteCarloSimulation}</h2>
    {groups.length === 0 ? <p className="muted">{t.simulationNoFixtures}</p> :
      <Form action={action} className={showFixturePicker ? "mt-4 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]" : "mt-4 flex flex-wrap items-end gap-3"}>
        {showFixturePicker && <FixturePicker key={choice?.id} groups={groups} initialChoice={choice?.id ?? ""} />}
        <label className="grid gap-1">{t.numberOfTrials}
          <input type="number" name="sinaq" min={1} max={maxTrials} step={1} required defaultValue={validTrials ? trials : maxTrials} className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--side)] p-2" />
        </label>
        <button type="submit" className="primary justify-center">{t.runSimulation}</button>
      </Form>}
    {typeof result === "string" && <p className="mt-4 text-[var(--warning)]" role="alert">{result}</p>}
    {result && typeof result !== "string" && <div className="mt-5" aria-live="polite">
      {showFixturePicker && group && choice && <div className="simulation-match">
        <LeagueLabel code={group.code} />
        <h3 className="text-lg font-bold"><ClubLabel name={choice.home} /> <span aria-hidden="true">–</span> <ClubLabel name={choice.away} /></h3>
      </div>}
      <p className="muted">{countFormatter(intlLocale).format(result.trials)}{" " + t.trialsModel + " "}{result.model_version} · <time dateTime={result.calculated_at}>{fixtureDateTime(intlLocale).format(new Date(result.calculated_at))}</time></p>
      <OutcomeChart values={[result.home_win * 100, result.draw * 100, result.away_win * 100]} />
      <div className="detail-grid mt-3">
        <dl className="data-list">
          {[
            [t.homeWin, result.home_win],
            [t.draw, result.draw],
            [t.awayWin, result.away_win],
            [t.bothTeamsToScore, result.both_score],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{percentFormatter(intlLocale).format(Number(value))}</dd></div>)}
          <div><dt>{t.expectedGoalsHomeAway}</dt><dd>{goalFormatter(intlLocale).format(result.expected_home)} / {goalFormatter(intlLocale).format(result.expected_away)}</dd></div>
        </dl>
        <dl className="data-list">
          {Object.entries(result.over).map(([limit, value]) => <div key={limit}><dt>{new Intl.NumberFormat(intlLocale).format(Number(limit))}{" "}{t.goalsOverUnder}</dt><dd>{percentFormatter(intlLocale).format(value)} / {percentFormatter(intlLocale).format(1 - value)}</dd></div>)}
          {result.scores.map(([home, away, probability]) => <div key={home + ":" + away}><dt>{t.score}{" "}{home}:{away}</dt><dd>{percentFormatter(intlLocale).format(probability)}</dd></div>)}
        </dl>
      </div>
    </div>}
  </section>;
}
