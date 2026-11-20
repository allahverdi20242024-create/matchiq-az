export function aiSummary(probabilities: readonly number[], home: string, away: string, locale: string) {
  const [homeWin, draw, awayWin] = probabilities;
  const en = locale.toLowerCase().startsWith("en");
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const [leader, runnerUp] = [...probabilities].sort((a, b) => b - a);
  const favorite = homeWin > awayWin ? home : away;
  let lead: string;
  if (leader - runnerUp < 0.05) {
    lead = en ? "The two most likely outcomes are close." : "Ən yüksək iki ehtimal bir-birinə yaxındır.";
  } else if (draw === leader) {
    lead = en ? "A draw is the most likely outcome." : "Ən ehtimallı nəticə heç-heçədir.";
  } else {
    lead = en ? `${favorite} has the highest chance of winning.` : `Model ${favorite} komandasını favorit göstərir.`;
  }
  const breakdown = en
    ? `Home win ${percent.format(homeWin)}, draw ${percent.format(draw)}, away win ${percent.format(awayWin)}.`
    : `Ev qələbəsi ${percent.format(homeWin)}, heç-heçə ${percent.format(draw)}, səfər qələbəsi ${percent.format(awayWin)}.`;
  return `${lead} ${breakdown}`;
}
