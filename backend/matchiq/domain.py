from datetime import date, datetime
from typing import Literal

from pydantic import AwareDatetime, BaseModel, Field, NonNegativeInt, model_validator

Source = Literal["football-data.org", "OpenFootball", "API-Football"]


class Team(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)


class Match(BaseModel):
    id: str = Field(min_length=1)
    competition: str
    home: Team
    away: Team
    date: date
    kickoff: AwareDatetime | None = None
    status: Literal["scheduled", "date_only", "finished"]
    score: tuple[NonNegativeInt, NonNegativeInt] | None = None
    source: Source

    @model_validator(mode="after")
    def validate_match(self):
        if self.home.id == self.away.id:
            raise ValueError("teams must differ")
        if (self.status == "finished") != (self.score is not None):
            raise ValueError("finished matches require a score")
        if self.status == "scheduled" and self.kickoff is None:
            raise ValueError("confirmed schedules require a kickoff")
        return self


class StandingRow(BaseModel):
    team: Team
    position: int = Field(ge=1)
    played: NonNegativeInt
    wins: NonNegativeInt
    draws: NonNegativeInt
    losses: NonNegativeInt
    goal_difference: int
    points: int


class Standings(BaseModel):
    fetched_at: AwareDatetime
    rows: list[StandingRow] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_rows(self):
        if sorted(row.position for row in self.rows) != list(range(1, len(self.rows) + 1)):
            raise ValueError("invalid standings positions")
        if len({row.team.id for row in self.rows}) != len(self.rows):
            raise ValueError("duplicate standings teams")
        if any(row.played != row.wins + row.draws + row.losses for row in self.rows):
            raise ValueError("inconsistent standings totals")
        return self


class Snapshot(BaseModel):
    competition: str
    season: int
    source: Source
    source_url: str
    fetched_at: AwareDatetime
    matches: list[Match]
    standings: Standings | None = None

    @model_validator(mode="after")
    def validate_matches(self):
        ids = {match.id for match in self.matches}
        if len(ids) != len(self.matches):
            raise ValueError("duplicate matches")
        if any(match.source != self.source or match.competition != self.competition for match in self.matches):
            raise ValueError("inconsistent snapshot provenance")
        return self


class CompetitionFeed(BaseModel):
    competition: str
    source: Source
    source_url: str
    fetched_at: AwareDatetime
    stale: bool
    matches: list[Match]
    standings: Standings | None = None


class Feed(BaseModel):
    generated_at: datetime
    season: int
    unavailable: list[str]
    competitions: list[CompetitionFeed]
