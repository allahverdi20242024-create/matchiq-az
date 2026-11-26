import { Calendar } from "./calendar";

export default async function FixturesCalendar({ searchParams }: {
  searchParams: Promise<{ tarix?: string | string[]; liqa?: string | string[] }>;
}) {
  const { tarix, liqa } = await searchParams;
  return <Calendar date={tarix} league={liqa} />;
}
