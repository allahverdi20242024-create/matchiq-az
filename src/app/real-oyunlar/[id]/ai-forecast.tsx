import { getPreferences } from "@/lib/preferences";
import { aiSummary } from "@/lib/ai-summary";

type Metrics = { brier: number; log_loss: number };
type Forecast = {
  version: string;
  learned: number[];
  poisson: number[];
  comparison: { count: number; start: string; end: string; learned: Metrics; poisson: Metrics };
};

export async function AiForecast({ id, home, away }: { id: string; home: string; away: string }) {
  const { intlLocale, t } = await getPreferences();
  const en = intlLocale.toLowerCase().startsWith("en");
  let forecast: Forecast | null = null;
  let unavailable = false;
  try {
    const base = process.env.MATCHIQ_API_URL || "http://127.0.0.1:8000";
    const response = await fetch(new URL("/v1/ai-forecast/" + encodeURIComponent(id), base), {
      cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) forecast = await response.json();
    else unavailable = true;
  } catch {
    unavailable = true;
  }

  const percent = new Intl.NumberFormat(intlLocale, { style: "percent", maximumFractionDigits: 1 });
  const number = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 3 });
  const date = new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeZone: "UTC" });
  return <section className="panel detail" aria-labelledby="ai-forecast">
    <h2 id="ai-forecast">{en ? "Statistical forecast" : "Statistik proqnoz"}</h2>
    {forecast ? <>
      <details className="forecast-note">
        <summary>{en ? "Match summary" : "Oyunun xülasəsi"}</summary>
        <p>{aiSummary(forecast.learned, home, away, intlLocale)}</p>
      </details>
      <dl className="data-list">
        <div><dt>{en ? "Outcome" : "Nəticə"}</dt><dd>AI / {en ? "Poisson" : "Puasson"}</dd></div>
        {[t.home, t.draw, t.away].map((label, index) => <div key={label}>
          <dt>{label}</dt>
          <dd><strong>{percent.format(forecast.learned[index])}</strong> / {percent.format(forecast.poisson[index])}</dd>
        </div>)}
      </dl>
      <details className="mt-3">
        <summary>{en ? "Historical comparison" : "Tarixi müqayisə"}</summary>
        <p className="muted text-sm">{number.format(forecast.comparison.count)} {en ? "matches" : "oyun"}
          {" · "}{date.format(new Date(forecast.comparison.start))} – {date.format(new Date(forecast.comparison.end))}</p>
        <dl className="data-list">
          <div><dt>{en ? "Brier score" : "Brier göstəricisi"}</dt><dd>{number.format(forecast.comparison.learned.brier)} / {number.format(forecast.comparison.poisson.brier)}</dd></div>
          <div><dt>{en ? "Log loss" : "Loqarifmik itki"}</dt><dd>{number.format(forecast.comparison.learned.log_loss)} / {number.format(forecast.comparison.poisson.log_loss)}</dd></div>
        </dl>
        <small className="muted">{forecast.version}</small>
      </details>
    </> : <p className="muted">{unavailable
      ? (en ? "Temporarily unavailable." : "Müvəqqəti əlçatan deyil.")
      : (en ? "More match results are needed." : "Daha çox oyun nəticəsi lazımdır.")}</p>}
  </section>;
}
