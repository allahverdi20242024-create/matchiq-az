import { getPreferences } from "@/lib/preferences";
import { History } from "lucide-react";
import { ClubLabel, LeagueLabel } from "@/components/club-crest";
import { Badge } from "@/components/ui/badge";

type Metrics = { brier: number; log_loss: number };
type CalibrationBin = { outcome: string; count: number; expected: number; observed: number };
type Prediction = {
  fixture_id: string;
  competition: string;
  home: string;
  away: string;
  cutoff: string;
  outcome: number;
  probabilities: [number, number, number];
};
type Evaluation = {
  model_version: string;
  season: number;
  count: number;
  minimum: number;
  sources: string[];
  model: Metrics | null;
  baseline: Metrics | null;
  calibration: CalibrationBin[];
  recent: Prediction[];
};

const outcomeIndex: Record<string, number> = { home: 0, draw: 1, away: 2 };
const decimal = (locale: string) => new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const percent = (locale: string) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
const date = (locale: string) => new Intl.DateTimeFormat(locale, { timeZone: "Asia/Baku", dateStyle: "medium", timeStyle: "short" });

async function loadEvaluation(): Promise<Evaluation | null> {
  try {
    const base = process.env.MATCHIQ_API_URL || "http://127.0.0.1:8000";
    const response = await fetch(new URL("/v1/evaluation", base), {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    return response.ok ? await response.json() as Evaluation : null;
  } catch {
    return null;
  }
}

export default async function HistoryPage() {
  const { t, intlLocale } = await getPreferences();
  const labels = [t.homeWin, t.draw, t.awayWin];
  const data = await loadEvaluation();
  return <>
    <div className="heading"><div><h1>{t.forecastHistory}</h1><p>{t.modelBacktesting}</p></div></div>
    {!data || !data.model || !data.baseline ? <section className="panel empty">
      <span className="stat-icon"><History size={24} /></span>
      <h2>{data ? t.tooFewMatchesForBacktesting : t.evaluationServiceUnavailable}</h2>
      {data && <p>{data.count}{" " + t.matchesEvaluatedMetricsAreShownAfterAt + " "}{data.minimum}{" "}{t.realMatches}</p>}
    </section> : <div className="method-grid">
      <section className="panel detail">
        <div className="fixture-meta"><h2>{t.modelAndBaselineForecast}</h2><Badge>{data.model_version}</Badge></div>
        <p className="muted">{data.season}/{data.season + 1}{" " + t.season + " "}{data.count}{" " + t.matchCountSuffix + " "}{data.sources.join(", ")}</p>
        <dl className="data-list">
          <div><dt>{t.brierScoreModelBaseline}</dt><dd>{decimal(intlLocale).format(data.model.brier)} / {decimal(intlLocale).format(data.baseline.brier)}</dd></div>
          <div><dt>{t.logLossModelBaseline}</dt><dd>{decimal(intlLocale).format(data.model.log_loss)} / {decimal(intlLocale).format(data.baseline.log_loss)}</dd></div>
        </dl>
        <p className="muted">{t.lowerIsBetterTheBaselineUsesWin}</p>
      </section>
      <section className="panel detail">
        <h2>{t.probabilityCalibration}</h2>
        <p className="muted">{t.forecastProbabilitiesAreComparedWithObservedFrequencies}</p>
        <dl className="data-list">
          {data.calibration.map((bin, index) => <div key={bin.outcome + index}>
            <dt>{labels[outcomeIndex[bin.outcome]]} · {bin.count}{" "}{t.matches}</dt>
            <dd>{percent(intlLocale).format(bin.expected)}{" " + t.forecast + " "}{percent(intlLocale).format(bin.observed)}{" "}{t.observed}</dd>
          </div>)}
        </dl>
      </section>
      <section className="panel detail">
        <h2>{t.latestBacktests}</h2>
        <p className="muted">{t.theseForecastsWereCalculatedRetrospectivelyEachBacktest}</p>
        <dl className="data-list">
          {data.recent.map((match) => <div key={match.competition + match.fixture_id}>
            <dt className="history-match"><LeagueLabel code={match.competition} /><span className="history-teams"><ClubLabel name={match.home} /> <span aria-hidden="true">–</span> <ClubLabel name={match.away} /></span><time dateTime={match.cutoff}>{date(intlLocale).format(new Date(match.cutoff))}</time></dt>
            <dd>{labels[match.outcome]}<br />{t.probabilityAssignedToThisOutcome}{" "}{percent(intlLocale).format(match.probabilities[match.outcome])}</dd>
          </div>)}
        </dl>
      </section>
    </div>}
  </>;
}
