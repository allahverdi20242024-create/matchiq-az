export const competitionNames: Readonly<Record<string, string>> = {
  AZ: "Azərbaycan Premyer Liqası",
  PL: "İngiltərə Premyer Liqası",
  PD: "La Liqa",
  SA: "A Seriyası",
  BL1: "Bundesliqa",
  FL1: "Liqa 1",
  CL: "UEFA Çempionlar Liqası",
};

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
};

type Feed = { competitions: CompetitionFeed[]; unavailable: string[] };

export async function loadFixtureFeed(view: "upcoming" | "results" | "today" | "tomorrow"): Promise<Feed | null> {
  try {
    const apiUrl = process.env.MATCHIQ_API_URL || "http://127.0.0.1:8000";
    const url = new URL("/v1/fixtures", apiUrl);
    url.searchParams.set("view", view);
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    return response.ok ? await response.json() as Feed : null;
  } catch {
    return null;
  }
}

export const fixtureDateTime = new Intl.DateTimeFormat("az-AZ", {
  timeZone: "Asia/Baku", dateStyle: "medium", timeStyle: "short",
});

export const fixtureDateOnly = new Intl.DateTimeFormat("az-AZ", { timeZone: "UTC", dateStyle: "medium" });

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

export async function loadFixtureDetail(id: string): Promise<FixtureDetail | "missing" | null> {
  try {
    const base = process.env.MATCHIQ_API_URL || "http://127.0.0.1:8000";
    const response = await fetch(new URL("/v1/fixtures/" + encodeURIComponent(id), base), {
      cache: "no-store", signal: AbortSignal.timeout(4000),
    });
    if (response.status === 404) return "missing";
    return response.ok ? await response.json() as FixtureDetail : null;
  } catch {
    return null;
  }
}
