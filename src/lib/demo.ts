export const timeZone = "Asia/Baku";
export type Period = "bu-gun" | "sabah" | "gelecek";

export const periods = {
  "bu-gun": "Bu gün",
  sabah: "Sabah",
  gelecek: "Qarşıdakı",
} satisfies Record<Period, string>;

export const teams = [
  { id: "xezer", name: "Xəzər FK", initials: "XZ", color: "#53e5a4", form: ["Q", "Q", "H", "M", "Q"], record: [3, 1, 1] },
  { id: "zirve", name: "Zirvə SK", initials: "ZR", color: "#9a9cfd", form: ["H", "Q", "M", "Q", "H"], record: [2, 2, 1] },
  { id: "sahil", name: "Sahil İK", initials: "SH", color: "#65b9ff", form: ["M", "Q", "Q", "H", "Q"], record: [3, 1, 1] },
  { id: "ufuq", name: "Üfüq FK", initials: "ÜF", color: "#efb77a", form: ["H", "M", "Q", "H", "M"], record: [1, 2, 2] },
] as const;

export type Team = (typeof teams)[number];

const competition = "Nümayiş liqası";
export const fixtures = [
  { id: "xezer-zirve", home: teams[0], away: teams[1], day: 0, time: "20:00", competition, outcome: [52, 26, 22], goals: [1.64, 0.94], over: [73, 48, 26], btts: 49, scores: [["1:0", 12], ["1:1", 12], ["2:0", 10], ["2:1", 10], ["0:0", 8]] },
  { id: "sahil-ufuq", home: teams[2], away: teams[3], day: 0, time: "22:15", competition, outcome: [45, 29, 26], goals: [1.38, 0.98], over: [68, 42, 21], btts: 47, scores: [["1:0", 13], ["1:1", 13], ["0:0", 9], ["2:0", 9], ["0:1", 9]] },
  { id: "zirve-sahil", home: teams[1], away: teams[2], day: 1, time: "19:30", competition, outcome: [37, 30, 33], goals: [1.21, 1.13], over: [68, 41, 21], btts: 47, scores: [["1:1", 13], ["1:0", 12], ["0:1", 11], ["0:0", 10], ["2:1", 8]] },
  { id: "ufuq-xezer", home: teams[3], away: teams[0], day: 3, time: "18:00", competition, outcome: [24, 28, 48], goals: [0.93, 1.43], over: [68, 42, 21], btts: 46, scores: [["0:1", 14], ["1:1", 13], ["0:2", 10], ["0:0", 9], ["1:2", 9]] },
] as const;

export type Fixture = (typeof fixtures)[number];
export const outcomeLabels = ["Ev sahibi", "Heç-heçə", "Qonaq"] as const;
export const outcomeColors = ["#42df98", "#62748f", "#9188fd"] as const;

export function getFixtures(period: Period) {
  if (period === "gelecek") return fixtures.filter((fixture) => fixture.day > 0);
  return fixtures.filter((fixture) => fixture.day === (period === "bu-gun" ? 0 : 1));
}

export function bakuDate(now = new Date(), offset = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(Date.UTC(year, month - 1, day + offset));
}

export function kickoff(fixture: Fixture, now = new Date()) {
  return new Date(bakuDate(now, fixture.day).toISOString().slice(0, 10) + "T" + fixture.time + ":00+04:00");
}

export function formatDate(date: Date, locale = "az-AZ") {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone }).format(date);
}

export function formatDecimal(value: number, locale = "az-AZ") {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
