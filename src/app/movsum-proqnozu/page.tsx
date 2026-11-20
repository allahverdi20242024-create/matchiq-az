import Link from "next/link";
import { Trophy } from "lucide-react";
import { ClubLabel, LeagueLabel } from "@/components/club-crest";
import { getPreferences } from "@/lib/preferences";
import { fixtureDateTime } from "@/lib/real-fixtures";
import styles from "./season.module.css";

const leagues = ["PL", "PD", "SA", "BL1", "FL1", "CL"];
type Team = { id: string; name: string };
type Tie = [Team, Team];
type Forecast = {
  status: string;
  season: number;
  source: string;
  fetched_at: string;
  trials: number;
  remaining: number;
  matchdays: number[];
  teams: { team: Team; champion: number; position: number; points: number }[];
  bracket: Tie[][];
  scenario_champion: Team;
};

async function loadForecast(code: string, day: number): Promise<Forecast | null> {
  try {
    const url = new URL("/v1/season-forecast/" + code, process.env.MATCHIQ_API_URL || "http://127.0.0.1:8000");
    url.searchParams.set("matchday", String(day));
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function Bracket({ forecast, en }: { forecast: Forecast; en: boolean }) {
  const columns = en ? ["Last 16", "Quarter-finals", "Semi-finals"] : ["1/8 final", "1/4 final", "Yarımfinal"];
  function stage(round: number, right = false) {
    const ties = forecast.bracket[round];
    const half = ties.length / 2;
    return <div key={round} className={styles.column}>
      <h3>{columns[round]}</h3>
      <div className={styles.ties}>
        {(right ? ties.slice(half) : ties.slice(0, half)).map(([a, b]) =>
          <div className={styles.tie} key={a.id + b.id}>
            <ClubLabel name={a.name} /><ClubLabel name={b.name} />
          </div>)}
      </div>
    </div>;
  }
  return <section className={styles.bracket} aria-labelledby="bracket-title">
    <h2 id="bracket-title">{en ? "Champions League bracket" : "Çempionlar Liqasının turnir ağacı"}</h2>
    <p>{en ? "One simulated scenario" : "Simulyasiyadan bir ssenari"}</p>
    <div className={styles.scroll} tabIndex={0} role="region" aria-label={en ? "Knockout bracket" : "Pley-off ağacı"}>
      <div className={styles.tree}>
        <div className={styles.side}>{[0, 1, 2].map(round => stage(round))}</div>
        <div className={styles.final}>
          <Trophy aria-hidden="true" />
          <h3>Final</h3>
          <div className={styles.tie}>{forecast.bracket[3][0].map(team => <ClubLabel key={team.id} name={team.name} />)}</div>
          <small>{en ? "Scenario winner" : "Ssenarinin qalibi"}</small>
          <ClubLabel name={forecast.scenario_champion.name} />
        </div>
        <div className={styles.side + " " + styles.right}>{[2, 1, 0].map(round => stage(round, true))}</div>
      </div>
    </div>
  </section>;
}

export default async function SeasonForecast({ searchParams }: { searchParams: Promise<{ liqa?: string; tur?: string }> }) {
  const { liqa, tur } = await searchParams;
  const code = leagues.find(item => item === liqa) ?? "PL";
  const day = typeof tur === "string" && /^(?:[1-9]|[1-3][0-9])$/.test(tur) ? Math.min(38, Number(tur)) : 0;
  const [{ t, intlLocale }, data] = await Promise.all([getPreferences(), loadForecast(code, day)]);
  const en = intlLocale.toLowerCase().startsWith("en");
  const percent = new Intl.NumberFormat(intlLocale, { style: "percent", maximumFractionDigits: 2 });
  const decimal = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 });
  const error = data?.status === "results_unavailable"
    ? (en ? "More completed matches are needed." : "Proqnoz üçün daha çox tamamlanmış oyun lazımdır.")
    : data?.status === "round_unavailable"
      ? (en ? "Select a completed matchday." : "Tamamlanmış tur seçin.")
      : data?.status === "draw_available"
        ? (en ? "Select a league-phase matchday to simulate the bracket from that point." : "Ağacı həmin tarixdən simulyasiya etmək üçün liqa mərhələsindən bir tur seçin.")
        : data ? (en ? "A complete fixture list is unavailable." : "Tam oyun təqvimi əlçatan deyil.")
          : (en ? "Forecasts are temporarily unavailable." : "Proqnozlar müvəqqəti əlçatan deyil.");

  return <div className={styles.page}>
    <h1>{t.seasonForecast}</h1>
    <nav className={styles.leagues} aria-label={en ? "Competitions" : "Turnirlər"}>
      {leagues.map(league => <Link href={`/movsum-proqnozu?liqa=${league}`} key={league} aria-current={code === league ? "page" : undefined}>
        <LeagueLabel code={league} />
      </Link>)}
    </nav>
    <form action="/movsum-proqnozu" className={styles.controls}>
      <input type="hidden" name="liqa" value={code} />
      <label htmlFor="matchday">{en ? "Matchday" : "Tur"}</label>
      <select id="matchday" name="tur" key={code + day} defaultValue={day}>
        <option value="0">{en ? "Latest results" : "Son nəticələr"}</option>
        {data?.matchdays.map(round => <option value={round} key={round}>{en ? `After matchday ${round}` : `${round}-ci turdan sonra`}</option>)}
      </select>
      <button className="button primary">{en ? "Simulate" : "Simulyasiya et"}</button>
    </form>
    {data?.status === "ok" ? <>
      {code === "CL" && <Bracket forecast={data} en={en} />}
      <section className="panel detail">
        <h2>{en ? "Title chances" : "Çempionluq ehtimalları"}</h2>
        <p className={styles.meta}>{data.season}/{data.season + 1} · {decimal.format(data.trials)} {en ? "simulations" : "simulyasiya"} · {data.remaining} {code === "CL" ? (en ? "league-phase fixtures left" : "qalan liqa mərhələsi oyunu") : (en ? "fixtures left" : "qalan oyun")}</p>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead><tr><th scope="col">{en ? "Club" : "Komanda"}</th><th scope="col">{en ? "Champion" : "Çempionluq"}</th><th scope="col">{en ? "Avg. points" : "Orta xal"}</th><th scope="col">{en ? "Avg. position" : "Orta mövqe"}</th></tr></thead>
            <tbody>{data.teams.map(row => <tr key={row.team.id}>
              <th scope="row"><ClubLabel name={row.team.name} /></th>
              <td><div className={styles.chance}><b>{percent.format(row.champion)}</b><progress value={row.champion} max={1} aria-label={en ? "Title chance" : "Çempionluq ehtimalı"} /></div></td>
              <td>{decimal.format(row.points)}</td><td>{decimal.format(row.position)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className={styles.meta}>{en ? "Tiebreakers are approximated." : "Bərabər xal qaydaları təqribi tətbiq olunur."}{code === "CL" && (en ? " Tied knockout scores are resolved randomly." : "Pley-offda bərabər hesabın qalibi təsadüfi seçilir.")}</p>
        <p className={styles.meta}>{data.source} · {fixtureDateTime(intlLocale).format(new Date(data.fetched_at))}</p>
      </section>
    </> : <p role="status" className="panel detail">{error}</p>}
  </div>;
}
