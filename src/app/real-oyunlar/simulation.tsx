import Form from "next/form";
import { OutcomeChart } from "@/components/outcome-chart";
import { fixtureDateTime } from "@/lib/real-fixtures";
import { ClubLabel, LeagueLabel } from "@/components/club-crest";

export const maxTrials = 100_000;

type Choice = { id: string; home: string; away: string };
type Group = { code: string; label: string; choices: Choice[] };
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

const countFormatter = new Intl.NumberFormat("az-AZ");
const percentFormatter = new Intl.NumberFormat("az-AZ", { style: "percent", maximumFractionDigits: 2 });
const goalFormatter = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function simulate(matchId: string, trials: number): Promise<Result | string> {
  try {
    const apiUrl = process.env.MATCHIQ_API_URL || "http://127.0.0.1:8000";
    const url = new URL("/v1/simulations/" + encodeURIComponent(matchId), apiUrl);
    url.searchParams.set("trials", String(trials));
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (response.status === 409) return "Bu oyun üçün kifayət qədər real nəticə yoxdur. Başqa oyun seçin.";
    if (response.status === 404) return "Bu oyun artıq simulyasiya üçün əlçatan deyil.";
    if (response.ok) return await response.json() as Result;
  } catch {
    // The fixture list stays available when the simulation endpoint is offline.
  }
  return "Simulyasiya xidməti müvəqqəti əlçatan deyil. Bir qədər sonra yenidən cəhd edin.";
}

export async function SimulationPanel({ groups, matchId, rawTrials, action = "/real-oyunlar", showFixturePicker = true }: {
  groups: Group[];
  action?: string;
  showFixturePicker?: boolean;
  matchId?: string | string[];
  rawTrials?: string | string[];
}) {
  const group = groups.find((item) => item.choices.some((match) => match.id === matchId));
  const choice = group?.choices.find((match) => match.id === matchId);
  const trials = typeof rawTrials === "string" && /^\d{1,6}$/.test(rawTrials) ? Number(rawTrials) : 0;
  const validTrials = trials >= 1 && trials <= maxTrials;
  const submitted = rawTrials !== undefined;
  let result: Result | string | undefined;
  if (submitted) {
    if (!choice) result = "Simulyasiya üçün siyahıdan oyun seçin.";
    else if (!validTrials) result = "1-dən 100 000-ə qədər tam ədəd daxil edin.";
    else result = await simulate(choice.id, trials);
  }

  return <section className="panel detail source" aria-labelledby="simulation-title">
    <h2 id="simulation-title">Monte Karlo simulyasiyası</h2>
    <p className="muted">{showFixturePicker ? "Oyunu və sınaq sayını seçin." : "Sınaq sayını seçin."} Az sınaq sayı ehtimalları daha dəyişkən edir.</p>
    {groups.length === 0 ? <p className="muted">Hazırda seçim üçün qarşıdakı oyun yoxdur.</p> :
      <Form action={action} className={showFixturePicker ? "mt-4 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]" : "mt-4 flex flex-wrap items-end gap-3"}>
        {showFixturePicker && <label className="grid min-w-0 gap-1">Oyun
          <select required name="oyun" defaultValue={choice?.id ?? ""} className="min-w-0 rounded-lg border border-slate-600 bg-slate-950 p-2">
            <option value="" disabled>Oyun seçin</option>
            {groups.map((group) => <optgroup key={group.label} label={group.label}>
              {group.choices.map((item) => <option value={item.id} key={item.id}>{item.home} – {item.away}</option>)}
            </optgroup>)}
          </select>
        </label>}
        <label className="grid gap-1">Sınaq sayı
          <input type="number" name="sinaq" min={1} max={maxTrials} step={1} required defaultValue={validTrials ? trials : maxTrials} className="min-w-0 rounded-lg border border-slate-600 bg-slate-950 p-2" />
        </label>
        <button type="submit" className="primary justify-center">Simulyasiyanı başlat</button>
      </Form>}
    {typeof result === "string" && <p className="mt-4 text-amber-200" role="alert">{result}</p>}
    {result && typeof result !== "string" && <div className="mt-5" aria-live="polite">
      {showFixturePicker && group && choice && <div className="simulation-match">
        <LeagueLabel code={group.code} />
        <h3 className="text-lg font-bold"><ClubLabel name={choice.home} /> <span aria-hidden="true">–</span> <ClubLabel name={choice.away} /></h3>
      </div>}
      <p className="muted">{countFormatter.format(result.trials)} sınaq · Model {result.model_version} · <time dateTime={result.calculated_at}>{fixtureDateTime.format(new Date(result.calculated_at))}</time></p>
      <OutcomeChart values={[result.home_win * 100, result.draw * 100, result.away_win * 100]} />
      <div className="detail-grid mt-3">
        <dl className="data-list">
          {[
            ["Ev sahibinin qələbəsi", result.home_win],
            ["Heç-heçə", result.draw],
            ["Qonağın qələbəsi", result.away_win],
            ["Hər iki komanda qol vurur", result.both_score],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{percentFormatter.format(Number(value))}</dd></div>)}
          <div><dt>Gözlənilən qollar (ev / səfər)</dt><dd>{goalFormatter.format(result.expected_home)} / {goalFormatter.format(result.expected_away)}</dd></div>
        </dl>
        <dl className="data-list">
          {Object.entries(result.over).map(([limit, value]) => <div key={limit}><dt>{limit.replace(".", ",")} qoldan çox / az</dt><dd>{percentFormatter.format(value)} / {percentFormatter.format(1 - value)}</dd></div>)}
          {result.scores.map(([home, away, probability]) => <div key={home + ":" + away}><dt>Hesab {home}:{away}</dt><dd>{percentFormatter.format(probability)}</dd></div>)}
        </dl>
      </div>
    </div>}
  </section>;
}
