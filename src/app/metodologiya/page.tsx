import { getPreferences } from "@/lib/preferences";
const steps = [
  ["dataPreparation", "dataPreparationDescription"],
  ["poissonModelAndMonteCarlo", "theModelUsesEachTeamSExpected"],
  ["historicalEvaluation", "backtestingDescription"],
] as const;

export default async function Methodology() {
  const { t } = await getPreferences();
  return <>
    <div className="heading"><div><h1>{t.modelMethodology}</h1></div></div>
    <div className="method-grid">{steps.map(([title, description]) => <section key={title} className="panel detail"><h2>{t[title]}</h2><p className="muted">{t[description]}</p></section>)}</div>
  </>;
}
