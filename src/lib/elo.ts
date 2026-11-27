import type { RealMatch } from "./real-fixtures";

type ClubRating = RealMatch["home"] & { rating: number; played: number };

export function rankClubs(matches: RealMatch[]): ClubRating[] {
  const clubs = new Map<string, ClubRating>();
  const byDay = new Map<string, RealMatch[]>();
  for (const match of matches) {
    if (!match.score) continue;
    const fixtures = byDay.get(match.date) ?? [];
    fixtures.push(match);
    byDay.set(match.date, fixtures);
  }

  for (const day of [...byDay.keys()].sort()) {
    const changes = new Map<string, number>();
    for (const { home, away, score } of byDay.get(day) ?? []) {
      if (!score) continue;
      for (const team of [home, away]) {
        if (!clubs.has(team.id)) clubs.set(team.id, { ...team, rating: 1500, played: 0 });
      }
      const host = clubs.get(home.id)!;
      const visitor = clubs.get(away.id)!;
      const expected = 1 / (1 + 10 ** ((visitor.rating - host.rating - 50) / 400));
      const outcome = score[0] === score[1] ? 0.5 : Number(score[0] > score[1]);
      const delta = 24 * (outcome - expected);
      changes.set(home.id, (changes.get(home.id) ?? 0) + delta);
      changes.set(away.id, (changes.get(away.id) ?? 0) - delta);
      host.played++;
      visitor.played++;
    }
    for (const [id, delta] of changes) clubs.get(id)!.rating += delta;
  }

  return [...clubs.values()].filter(club => club.played >= 3)
    .sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id));
}
