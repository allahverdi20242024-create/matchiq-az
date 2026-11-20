import { Calendar } from "./calendar";

export default async function FixturesCalendar({ searchParams }: {
  searchParams: Promise<{ tarix?: string | string[] }>;
}) {
  const { tarix } = await searchParams;
  return <Calendar date={tarix} />;
}
