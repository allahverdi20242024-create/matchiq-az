from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from .domain import CompetitionFeed, Feed, Source, Team


class Record(BaseModel):
    played: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    goals_for: int = 0
    goals_against: int = 0

    def add(self, scored: int, conceded: int):
        self.played += 1
        self.wins += int(scored > conceded)
        self.draws += int(scored == conceded)
        self.losses += int(scored < conceded)
        self.goals_for += scored
        self.goals_against += conceded


class Result(BaseModel):
    match_id: str
    date: date
    opponent: Team
    venue: Literal["home", "away"]
    scored: int
    conceded: int


class TeamStats(BaseModel):
    team: Team
    total: Record = Field(default_factory=Record)
    home: Record = Field(default_factory=Record)
    away: Record = Field(default_factory=Record)
    points: int = 0
    recent: list[Result] = Field(default_factory=list)

    def add(self, result: Result):
        self.total.add(result.scored, result.conceded)
        venue = self.home if result.venue == "home" else self.away
        venue.add(result.scored, result.conceded)
        self.points = self.total.wins * 3 + self.total.draws
        if len(self.recent) < 5:
            self.recent.append(result)


class CompetitionStats(BaseModel):
    competition: str
    source: Source
    source_url: str
    fetched_at: datetime
    stale: bool
    completed_matches: int
    provisional_table: bool
    teams: list[TeamStats]


class Statistics(BaseModel):
    season: int
    unavailable: list[str]
    competitions: list[CompetitionStats]


def summarize_competition(feed: CompetitionFeed) -> CompetitionStats:
    teams = {}
    completed = 0
    for match in feed.matches:
        if match.score is None:
            continue
        completed += 1
        home_goals, away_goals = match.score
        for team, opponent, venue, scored, conceded in (
            (match.home, match.away, "home", home_goals, away_goals),
            (match.away, match.home, "away", away_goals, home_goals),
        ):
            if team.id not in teams:
                teams[team.id] = TeamStats(team=team)
            teams[team.id].add(Result(match_id=match.id, date=match.date, opponent=opponent,
                                      venue=venue, scored=scored, conceded=conceded))

    provisional_table = feed.competition in {"AZ", "PL", "PD", "SA", "BL1", "FL1"}
    if provisional_table:
        sort_key = lambda row: (-row.points, row.total.goals_against - row.total.goals_for,
                                -row.total.goals_for, row.team.name.casefold(), row.team.id)
    else:
        sort_key = lambda row: (row.team.name.casefold(), row.team.id)

    return CompetitionStats(competition=feed.competition, source=feed.source, source_url=feed.source_url,
                            fetched_at=feed.fetched_at, stale=feed.stale, completed_matches=completed,
                            provisional_table=provisional_table, teams=sorted(teams.values(), key=sort_key))


def summarize_teams(feed: Feed) -> Statistics:
    return Statistics(season=feed.season, unavailable=feed.unavailable,
                      competitions=[summarize_competition(item) for item in feed.competitions])
