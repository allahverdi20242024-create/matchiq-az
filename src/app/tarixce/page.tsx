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

const labels = ["Ev sahibinin qələbəsi", "Heç-heçə", "Qonağın qələbəsi"];
const outcomeIndex: Record<string, number> = { home: 0, draw: 1, away: 2 };
const decimal = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const percent = new Intl.NumberFormat("az-AZ", { style: "percent", maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("az-AZ", { timeZone: "Asia/Baku", dateStyle: "medium", timeStyle: "short" });

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
  const data = await loadEvaluation();
  return <>
    <div className="heading"><div><h1>Proqnoz tarixçəsi</h1><p>Modelin tarixi sınağı</p></div></div>
    {!data || !data.model || !data.baseline ? <section className="panel empty">
      <span className="stat-icon"><History size={24} /></span>
      <h2>{data ? "Tarixi sınaq üçün oyun sayı azdır" : "Qiymətləndirmə xidməti əlçatan deyil"}</h2>
      {data && <p>{data.count} oyun sınaqdan keçirilib. Göstəricilər ən azı {data.minimum} real oyundan sonra göstərilir.</p>}
    </section> : <div className="method-grid">
      <section className="panel detail">
        <div className="fixture-meta"><h2>Model və baza proqnozu</h2><Badge>{data.model_version}</Badge></div>
        <p className="muted">{data.season}/{data.season + 1} mövsümü · {data.count} oyun · {data.sources.join(", ")}</p>
        <dl className="data-list">
          <div><dt>Brier göstəricisi · model / baza</dt><dd>{decimal.format(data.model.brier)} / {decimal.format(data.baseline.brier)}</dd></div>
          <div><dt>Loqarifmik itki · model / baza</dt><dd>{decimal.format(data.model.log_loss)} / {decimal.format(data.baseline.log_loss)}</dd></div>
        </dl>
        <p className="muted">Aşağı dəyər daha yaxşıdır. Baza proqnozu həmin liqanın əvvəlki oyunlarında qələbə və heç-heçə tezliyinə əsaslanır.</p>
      </section>
      <section className="panel detail">
        <h2>Ehtimalların kalibrlənməsi</h2>
        <p className="muted">Proqnoz ehtimalı ilə nəticənin faktiki başvermə tezliyi eyni oyun qrupunda müqayisə edilir.</p>
        <dl className="data-list">
          {data.calibration.map((bin, index) => <div key={bin.outcome + index}>
            <dt>{labels[outcomeIndex[bin.outcome]]} · {bin.count} oyun</dt>
            <dd>{percent.format(bin.expected)} proqnoz / {percent.format(bin.observed)} faktiki</dd>
          </div>)}
        </dl>
      </section>
      <section className="panel detail">
        <h2>Son tarixi sınaqlar</h2>
        <p className="muted">Nəticələr keçmiş oyunlar üzrə sonradan hesablanıb. Hər sınaq üçün yalnız göstərilən Bakı vaxtından əvvəlki oyun günləri istifadə olunur.</p>
        <dl className="data-list">
          {data.recent.map((match) => <div key={match.competition + match.fixture_id}>
            <dt className="history-match"><LeagueLabel code={match.competition} /><span className="history-teams"><ClubLabel name={match.home} /> <span aria-hidden="true">–</span> <ClubLabel name={match.away} /></span><time dateTime={match.cutoff}>{date.format(new Date(match.cutoff))}</time></dt>
            <dd>{labels[match.outcome]}<br />Bu nəticəyə verilən ehtimal {percent.format(match.probabilities[match.outcome])}</dd>
          </div>)}
        </dl>
      </section>
    </div>}
  </>;
}
