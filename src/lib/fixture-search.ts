import { normalizeSearch } from "./search-text.ts";

type FixtureChoice = { id: string; home: string; away: string };
export type FixtureGroup = { code: string; label: string; choices: FixtureChoice[] };

const leagueAliases: Record<string, string[]> = {
  PL: ["Premier League", "EPL"],
  PD: ["La Liga", "Primera División"],
  SA: ["Serie A"],
  BL1: ["Bundesliga"],
  FL1: ["Ligue 1", "Ligue One"],
  CL: ["Champions League", "UCL"],
  AZ: ["Azerbaijan Premier League"],
};

export function filterFixtureGroups(groups: FixtureGroup[], query: string): FixtureGroup[] {
  const normalized = normalizeSearch(query);
  if (!normalized) return groups;
  const terms = normalized.split(" ");
  const compact = normalized.replaceAll(" ", "");

  const indexed = groups.map((group) => ({
    group,
    leagues: [group.label, ...(leagueAliases[group.code] ?? [])].map(normalizeSearch),
  }));
  const exactLeagues = indexed.filter(({ leagues }) =>
    leagues.some((league) => league.replaceAll(" ", "") === compact));
  if (exactLeagues.length) return exactLeagues.map(({ group }) => group);

  return indexed.flatMap(({ group, leagues }) => {
    const choices = group.choices.filter(({ home, away }) => {
      const fields = [...leagues, normalizeSearch(home), normalizeSearch(away)];
      return fields.some((field) => field.replaceAll(" ", "").includes(compact))
        || terms.every((term) => fields.some((field) => field.includes(term)));
    });
    return choices.length ? [{ ...group, choices }] : [];
  });
}
