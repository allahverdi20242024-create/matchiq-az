import { getPreferences } from "@/lib/preferences";
export default async function Loading() {
  const { t } = await getPreferences();
  return <div className="skeleton-layout" role="status"><span className="sr-only">{t.loading}</span><div className="skeleton skeleton-title" /><div className="match-grid"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div></div>;
}
