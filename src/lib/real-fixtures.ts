import type { az, en } from "./translations";

const competitionNameKeys = { AZ: "azerbaijanPremierLeague", PL: "premierLeague", PD: "laLiga", SA: "serieA", BL1: "bundesliga", FL1: "ligue1", CL: "uefaChampionsLeague" } as const;

export function competitionName(code: string, t: typeof az | typeof en) {
  return Object.hasOwn(competitionNameKeys, code) ? t[competitionNameKeys[code as keyof typeof competitionNameKeys]] : code;
}

export type RealMatch = {
  id: string;
  competition: string;
  home: { id: string; name: string };
  away: { id: string; name: string };
  date: string;
  kickoff: string | null;
  score: [number, number] | null;
};

type CompetitionFeed = {
  competition: string;
  source: string;
  source_url: string;
  fetched_at: string;
  stale: boolean;
  matches: RealMatch[];
  standings?: { rows: { team: { id: string }; position: number; played: number }[] } | null;
};

type Feed = { competitions: CompetitionFeed[]; unavailable: string[] };

export async function loadFixtureFeed(view: "upcoming" | "results" | "today" | "tomorrow", cacheDay?: string): Promise<Feed | null> {
  try {
    const apiUrl = process.env.MATCHIQ_API_URL || "http://127.0.0.1:8000";
    const url = new URL("/v1/fixtures", apiUrl);
    url.searchParams.set("view", view);
    if (cacheDay) url.searchParams.set("cacheDay", cacheDay);
    const response = await fetch(url, {
      ...(cacheDay ? { next: { revalidate: 60 } } : { cache: "no-store" as const }),
      signal: AbortSignal.timeout(cacheDay ? 12_000 : 4_000),
    });
    return response.ok ? await response.json() as Feed : null;
  } catch {
    return null;
  }
}

export const fixtureDateTime = (locale: string) => new Intl.DateTimeFormat(locale, {
  timeZone: "Asia/Baku", dateStyle: "medium", timeStyle: "short", hour12: false,
});

export const fixtureDateOnly = (locale: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", dateStyle: "medium" });

type FixtureDetail = {
  match: RealMatch;
  source: string;
  source_url: string;
  fetched_at: string;
  stale: boolean;
  can_simulate: boolean;
  recent_home: RealMatch[];
  recent_away: RealMatch[];
};

export function realMatchPath(id: string) {
  return "/real-oyunlar/" + encodeURIComponent(id);
}

export async function loadFixtureDetail(id: string, revalidate = 0): Promise<FixtureDetail | "missing" | null> {
  try {
    const base = process.env.MATCHIQ_API_URL || "http://127.0.0.1:8000";
    const response = await fetch(new URL("/v1/fixtures/" + encodeURIComponent(id), base), {
      next: { revalidate }, signal: AbortSignal.timeout(4000),
    });
    if (response.status === 404) return "missing";
    return response.ok ? await response.json() as FixtureDetail : null;
  } catch {
    return null;
  }
}
