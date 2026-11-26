from datetime import datetime, timezone

from pydantic import AwareDatetime, BaseModel

from .domain import Match, Snapshot, Source
from .providers import BAKU
from .service import STALE_AFTER, is_upcoming
from .simulation import MODEL_VERSION


class FixtureDetail(BaseModel):
    match: Match
    source: Source
    source_url: str
    fetched_at: AwareDatetime
    stale: bool
    can_simulate: bool
    model_version: str
    recent_home: list[Match]
    recent_away: list[Match]


def build_fixture_detail(snapshot: Snapshot, fixture: Match, now: datetime) -> FixtureDetail:
    today = now.astimezone(BAKU).date()
    previous = sorted(
        (match for match in snapshot.matches
         if match.score is not None and match.date < fixture.date
         and (match.kickoff < now if match.kickoff else match.date < today)),
        key=lambda match: (match.date, match.kickoff or datetime.min.replace(tzinfo=timezone.utc), match.id),
        reverse=True,
    )

    def recent(team_id: str) -> list[Match]:
        return [match for match in previous if team_id in (match.home.id, match.away.id)][:5]

    return FixtureDetail(
        match=fixture, source=snapshot.source, source_url=snapshot.source_url,
        fetched_at=snapshot.fetched_at, stale=now - snapshot.fetched_at >= STALE_AFTER,
        can_simulate=is_upcoming(fixture, now), model_version=MODEL_VERSION,
        recent_home=recent(fixture.home.id), recent_away=recent(fixture.away.id),
    )
