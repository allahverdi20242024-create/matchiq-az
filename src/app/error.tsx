"use client";

import { usePreferences } from "@/components/preferences-context";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = usePreferences();
  return <section className="panel empty"><h1>{t.pageFailedToLoad}</h1><button className="primary" type="button" onClick={reset}>{t.tryAgain}</button></section>;
}
