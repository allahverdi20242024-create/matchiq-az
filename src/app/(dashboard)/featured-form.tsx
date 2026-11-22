import { ChevronDown } from "lucide-react";
import { ClubLabel } from "@/components/club-crest";
import { MatchResult } from "@/components/match-result";
import { getPreferences } from "@/lib/preferences";
import { fixtureDateOnly, loadFixtureDetail, type RealMatch } from "@/lib/real-fixtures";
import styles from "./dashboard.module.css";

async function ClubForm({ team, matches }: { team: RealMatch["home"]; matches: RealMatch[] }) {
  const { t, locale, intlLocale } = await getPreferences();
  const results = matches.flatMap(match => {
    if (!match.score) return [];
    const home = match.home.id === team.id;
    const [scored, conceded] = home ? match.score : [match.score[1], match.score[0]];
    const outcome: "win" | "draw" | "loss" = scored > conceded ? "win" : scored < conceded ? "loss" : "draw";
    return [{ match, opponent: home ? match.away : match.home, outcome, scored, conceded }] as const;
  });
  const letters = locale === "en" ? { win: "W", draw: "D", loss: "L" } : { win: "Q", draw: "H", loss: "M" };
  const formatDate = fixtureDateOnly(intlLocale);

  if (!results.length) return <div className={styles.formEmpty}>
    <strong>{team.name}</strong><span>{t.noPreviousResults}</span>
  </div>;

  return <details className={styles.formTeam}>
    <summary>
      <span className={styles.formName}>{team.name}</span>
      <span className={styles.formResults}>
        {results.map(({ match, outcome }) => <span key={match.id} data-result={outcome}>
          <span aria-hidden="true">{letters[outcome]}</span><span className="sr-only">{t[outcome]}</span>
        </span>)}
      </span>
      <ChevronDown size={15} aria-hidden="true" />
    </summary>
    <dl className="data-list">
      {results.map(({ match, opponent, scored, conceded }) => <div key={match.id}>
        <dt><ClubLabel name={opponent.name} /><br />
          <time dateTime={match.date}>{formatDate.format(new Date(match.date))}</time>
        </dt>
        <MatchResult scored={scored} conceded={conceded} />
      </div>)}
    </dl>
  </details>;
}

export async function FeaturedForm({ fixtureId }: { fixtureId: string }) {
  const { t } = await getPreferences();
  const detail = await loadFixtureDetail(fixtureId);

  return <section className={styles.formSection} aria-labelledby="featured-form-title">
    <h3 id="featured-form-title">{t.formOverTheLastFiveMatches}</h3>
    {detail && detail !== "missing" ? <div className={styles.formGrid}>
      <ClubForm team={detail.match.home} matches={detail.recent_home} />
      <ClubForm team={detail.match.away} matches={detail.recent_away} />
    </div> : <p className="muted text-sm">{t.dataServiceUnavailable}</p>}
  </section>;
}
