import { getPreferences } from "@/lib/preferences";
import Link from "next/link";

export default async function NotFound() {
  const { t } = await getPreferences();
  return <section className="panel empty"><h1>{t.pageNotFound}</h1><p>{t.thereIsNoPageAtThisAddress}</p><Link className="primary" href="/">{t.returnToDashboard}</Link></section>;
}
