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

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "")
    .replaceAll("ı", "i").replaceAll("ø", "o").replaceAll("ł", "l")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function filterFixtureGroups(groups: FixtureGroup[], query: string): FixtureGroup[] {
  const normalized = normalize(query);
  if (!normalized) return groups;
  const terms = normalized.split(" ");
  const compact = normalized.replaceAll(" ", "");

  const indexed = groups.map((group) => ({
    group,
    leagues: [group.label, ...(leagueAliases[group.code] ?? [])].map(normalize),
  }));
  const exactLeagues = indexed.filter(({ leagues }) =>
    leagues.some((league) => league.replaceAll(" ", "") === compact));
  if (exactLeagues.length) return exactLeagues.map(({ group }) => group);

  return indexed.flatMap(({ group, leagues }) => {
    const choices = group.choices.filter(({ home, away }) => {
      const fields = [...leagues, normalize(home), normalize(away)];
      return fields.some((field) => field.replaceAll(" ", "").includes(compact))
        || terms.every((term) => fields.some((field) => field.includes(term)));
    });
    return choices.length ? [{ ...group, choices }] : [];
  });
}
