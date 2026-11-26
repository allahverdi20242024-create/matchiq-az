import { getPreferences } from "@/lib/preferences";

export default async function LoadingSeasonForecast() {
  const { t } = await getPreferences();
  return <>
    <h1>{t.seasonForecast}</h1>
    <div className="panel detail mt-4" role="status">
      <p>{t.loading}</p>
      <div className="skeleton mt-3 h-24" />
    </div>
  </>;
}
