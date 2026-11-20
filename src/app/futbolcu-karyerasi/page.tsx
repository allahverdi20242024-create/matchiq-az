import { getPreferences } from "@/lib/preferences";
import { CareerGame } from "./career-game";

export async function generateMetadata() {
  const { t } = await getPreferences();
  return { title: t.careerGame };
}

export default async function CareerGamePage() {
  const { locale, t } = await getPreferences();
  return <>
    <h1>{t.careerGame}</h1>
    <CareerGame en={locale === "en"} />
  </>;
}
