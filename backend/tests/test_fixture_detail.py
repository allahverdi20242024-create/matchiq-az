from datetime import UTC, date, datetime, timedelta

from matchiq.domain import Match, Snapshot, Team
from matchiq.fixture_detail import build_fixture_detail


def test_detail_only_uses_available_results_from_earlier_match_days():
    now = datetime(2026, 11, 20, 13, tzinfo=UTC)
    home, away, other = [Team(id=name, name=name) for name in ("Home", "Away", "Other")]

    def result(match_id, day, host, visitor):
        return Match(id=match_id, competition="PL", home=host, away=visitor,
                     date=date(2026, 11, day), status="finished", score=(0, 0), source="OpenFootball")

    fixture = Match(id="fixture", competition="PL", home=home, away=away,
                    date=date(2026, 11, 21), status="date_only", source="OpenFootball")
    matches = [result("earlier-home", 18, home, other), result("earlier-away", 19, other, away),
               result("unconfirmed-today", 20, other, away), result("same-day", 21, home, other),
               result("later", 22, away, other), fixture]
    snapshot = Snapshot(competition="PL", season=2026, source="OpenFootball",
                        source_url="https://example.com", fetched_at=now - timedelta(hours=9), matches=matches)

    detail = build_fixture_detail(snapshot, fixture, now)
    assert detail.can_simulate and detail.stale
    assert [match.id for match in detail.recent_home] == ["earlier-home"]
    assert [match.id for match in detail.recent_away] == ["earlier-away"]

    finished = build_fixture_detail(snapshot, matches[0], now)
    assert not finished.can_simulate
