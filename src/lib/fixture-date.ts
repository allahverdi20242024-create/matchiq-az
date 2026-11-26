export const dateKey = (date: Date) => date.toISOString().slice(0, 10);

export function validDate(value: string | string[] | undefined): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && dateKey(date) === value;
}

export function fixtureView(date: string, today: string, tomorrow: string) {
  return date === today ? "today" : date === tomorrow ? "tomorrow" : date > today ? "upcoming" : "results";
}


export function isDashboardUpcoming(
  match: { date: string; kickoff: string | null; score: readonly [number, number] | null },
  now: Date,
  today: string,
) {
  return match.score === null && (match.kickoff ? Date.parse(match.kickoff) > now.getTime() : match.date > today);
}
