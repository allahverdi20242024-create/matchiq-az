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
    <div className="method-list">
      {steps.map(([title, description]) => <details key={title} className="panel detail">
        <summary>{t[title]}</summary>
        <p className="muted">{t[description]}</p>
      </details>)}
    </div>
  </>;
}
