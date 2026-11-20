import asyncio
from dataclasses import dataclass
from datetime import UTC, date, datetime
from hashlib import sha256
from time import monotonic
from typing import Protocol
from zoneinfo import ZoneInfo

import httpx

from .domain import Match, Snapshot, Source, StandingRow, Standings, Team

BAKU = ZoneInfo("Asia/Baku")


@dataclass(frozen=True)
class Competition:
    code: str
    open_file: str | None = None


COMPETITIONS = (
    Competition("AZ"),
    Competition("PL", "en.1"),
    Competition("PD", "es.1"),
    Competition("SA", "it.1"),
    Competition("BL1", "de.1"),
    Competition("FL1", "fr.1"),
    Competition("CL"),
)


class ProviderError(Exception):
    pass


class Provider(Protocol):
    name: Source

    def supports(self, competition: Competition) -> bool: ...
    async def fetch(self, competition: Competition, season: int) -> Snapshot: ...


class ProviderHttp:
    def __init__(self, client: httpx.AsyncClient, spacing: float):
        self.client = client
        self.spacing = spacing
        self.next_request = 0.0
        self.retry_at = 0.0
        self.lock = asyncio.Lock()

    async def get(self, url: str, **kwargs) -> dict:
        async with self.lock:
            if monotonic() < self.retry_at:
                raise ProviderError("rate_limit_cooldown")
            await asyncio.sleep(max(0, self.next_request - monotonic()))
            self.next_request = monotonic() + self.spacing
            try:
                response = await self.client.get(url, **kwargs)
                response.raise_for_status()
                payload = response.json()
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429:
                    retry = exc.response.headers.get("Retry-After", "")
                    seconds = int(retry) if retry.isdecimal() and len(retry) < 10 else 60
                    self.retry_at = monotonic() + seconds
                raise ProviderError(f"http_{exc.response.status_code}") from None
            except (httpx.RequestError, ValueError):
                raise ProviderError("request_or_json") from None
        if not isinstance(payload, dict):
            raise ProviderError("invalid_envelope")
        return payload


def snapshot(competition, season, source, url, matches):
    return Snapshot(competition=competition.code, season=season, source=source, source_url=url,
                    fetched_at=datetime.now(UTC), matches=matches)


def fingerprint(*fields):
    return sha256("\x1f".join(fields).encode()).hexdigest()[:24]


def named_team(source, provider_id, name):
    if not isinstance(name, str) or not name.strip() or provider_id is None:
        raise ValueError("missing team identity")
    return Team(id=f"{source}:{provider_id}", name=name.strip())


def timed_match(source, competition, match_id, kickoff, home, away, score):
    start = datetime.fromisoformat(kickoff)
    if start.utcoffset() is None or type(match_id) is not int or match_id <= 0:
        raise ValueError("invalid kickoff or match ID")
    return Match(id=f"{source}:{match_id}", competition=competition.code, home=home, away=away,
                 date=start.astimezone(BAKU).date(), kickoff=start.astimezone(UTC),
                 status="finished" if score is not None else "scheduled", score=score, source=source)


class FootballData:
    name: Source = "football-data.org"

    def __init__(self, http, token):
        self.http = http
        self.token = token

    def supports(self, competition):
        return competition.code != "AZ"

    async def fetch(self, competition, season):
        url = f"https://api.football-data.org/v4/competitions/{competition.code}/matches"
        data = await self.http.get(url, params={"season": season}, headers={"X-Auth-Token": self.token})
        matches = []
        for row in data["matches"]:
            status = row["status"]
            if status not in {"FINISHED", "TIMED"}:
                continue
            home, away = row["homeTeam"], row["awayTeam"]
            score = None
            if status == "FINISHED":
                goals = row["score"]["fullTime"]
                score = (goals["home"], goals["away"])
            matches.append(timed_match(self.name, competition, row["id"], row["utcDate"],
                                       named_team(self.name, home["id"], home["name"]),
                                       named_team(self.name, away["id"], away["name"]), score))
        result = snapshot(competition, season, self.name, "https://www.football-data.org/", matches)
        if competition.open_file is not None:
            try:
                result.standings = await self.fetch_standings(competition, season)
            except (ProviderError, KeyError, ValueError, TypeError):
                # A standings outage must not discard a valid fixture feed.
                pass
        return result

    async def fetch_standings(self, competition, season):
        url = f"https://api.football-data.org/v4/competitions/{competition.code}/standings"
        data = await self.http.get(url, params={"season": season}, headers={"X-Auth-Token": self.token})
        if data["competition"]["code"] != competition.code or date.fromisoformat(data["season"]["startDate"]).year != season:
            raise ProviderError("standings_scope_mismatch")
        tables = [table for table in data["standings"] if table["type"] == "TOTAL" and not table.get("group")]
        if len(tables) != 1:
            raise ProviderError("standings_table_unavailable")
        rows = []
        for row in tables[0]["table"]:
            team = row["team"]
            rows.append(StandingRow(team=named_team(self.name, team["id"], team["name"]),
                                    position=row["position"], played=row["playedGames"],
                                    wins=row["won"], draws=row["draw"], losses=row["lost"],
                                    goal_difference=row["goalDifference"], points=row["points"]))
        return Standings(fetched_at=datetime.now(UTC), rows=sorted(rows, key=lambda row: row.position))


class OpenFootball:
    name: Source = "OpenFootball"

    def __init__(self, http):
        self.http = http

    def supports(self, competition):
        return competition.open_file is not None

    async def fetch(self, competition, season):
        folder = f"{season}-{(season + 1) % 100:02d}"
        path = f"{folder}/{competition.open_file}.json"
        data = await self.http.get(f"https://raw.githubusercontent.com/openfootball/football.json/master/{path}")
        matches = []
        for row in data["matches"]:
            if not row.get("date"):
                continue
            home, away = row["team1"], row["team2"]
            score = row.get("score")
            if isinstance(score, dict):
                score = score.get("ft")
            match_id = fingerprint(competition.code, str(season), row.get("round", ""), home, away)
            matches.append(Match(id=f"{self.name}:{match_id}", competition=competition.code,
                                 home=named_team(self.name, fingerprint(home), home),
                                 away=named_team(self.name, fingerprint(away), away),
                                 date=date.fromisoformat(row["date"]), source=self.name,
                                 status="finished" if score is not None else "date_only", score=score))
        return snapshot(competition, season, self.name,
                        f"https://github.com/openfootball/football.json/blob/master/{path}", matches)


class ApiFootball:
    name: Source = "API-Football"
    root = "https://v3.football.api-sports.io"

    def __init__(self, http, token):
        self.http = http
        self.token = token

    def supports(self, competition):
        return competition.code == "AZ"

    async def fetch(self, competition, season):
        headers = {"x-apisports-key": self.token}
        leagues = await self.http.get(self.root + "/leagues", headers=headers,
                                      params={"country": "Azerbaijan", "name": "Premyer Liqa", "season": season})
        if leagues.get("errors") or len(leagues["response"]) != 1:
            raise ProviderError("season_coverage_unavailable")
        entry = leagues["response"][0]
        if not any(item["year"] == season for item in entry["seasons"]):
            raise ProviderError("season_coverage_unavailable")
        data = await self.http.get(self.root + "/fixtures", headers=headers,
                                    params={"league": entry["league"]["id"], "season": season})
        if data.get("errors") or data["paging"]["total"] > 1 or not data["response"]:
            raise ProviderError("fixtures_unavailable_or_incomplete")
        matches = []
        for row in data["response"]:
            fixture = row["fixture"]
            status = fixture["status"]["short"]
            if status not in {"NS", "FT"}:
                continue
            home, away = row["teams"]["home"], row["teams"]["away"]
            score = (row["goals"]["home"], row["goals"]["away"]) if status == "FT" else None
            matches.append(timed_match(self.name, competition, fixture["id"], fixture["date"],
                                       named_team(self.name, home["id"], home["name"]),
                                       named_team(self.name, away["id"], away["name"]), score))
        return snapshot(competition, season, self.name, "https://www.api-football.com/", matches)
