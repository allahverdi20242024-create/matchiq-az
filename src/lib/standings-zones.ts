export const qualificationSource = "https://editorial.uefa.com/resources/02a9-218cd2086a08-882d0ce02937-1000/20260909_circular_2026_54_en.zip";

const leagues = {
  PL: { teams: 20, direct: 4, playoff: false, source: "https://www.premierleague.com/en/news/4365156/new-to-the-premier-league-heres-all-you-need-to-know" },
  PD: { teams: 20, direct: 4, playoff: false, source: "https://www.laliga.com/en-ES/laliga-easports/standing" },
  SA: { teams: 20, direct: 4, playoff: false, source: "https://files.figc.it/version/c%3AZmUzYzk0MzUtMzU0Zi00%3AYTk3YzZiZGEtYmExYi00/244%20-%20Deroga%20art.%2051%20NOIF%20-%20Determinazione%20classifica%20Campionato%20Serie%20A%20ss%202026%20-%202027.pdf" },
  BL1: { teams: 18, direct: 4, playoff: true, source: "https://www.bundesliga.com/en/bundesliga/news/how-does-promotion-and-relegation-work-in-the-bundesliga-10645" },
  FL1: { teams: 18, direct: 3, playoff: true, source: "https://www.lfp.fr/article/publication-du-calendrier-general-de-la-ligue-1-mcdonald-s-pour-la-saison-2026-2027" },
} as const;

export function standingsRules(code: string, season: number | undefined, count: number) {
  if (season !== 2026 || !Object.hasOwn(leagues, code)) return null;
  const rule = leagues[code as keyof typeof leagues];
  return rule.teams === count ? rule : null;
}

export function standingsZone(
  rules: NonNullable<ReturnType<typeof standingsRules>>,
  position: number,
  serieATie: boolean,
) {
  if (position <= rules.direct) return "championsLeague";
  if (position === 4) return "championsQualifying";
  if (position === 5) return "europaLeague";
  if (position === 6) return "conferenceLeague";
  if (position >= rules.teams - 1) return "relegationZone";
  if (position === rules.teams - 2) {
    return rules.playoff || serieATie ? "relegationPlayoff" : "relegationZone";
  }
  if (position === 17 && serieATie) return "relegationPlayoff";
  return null;
}
