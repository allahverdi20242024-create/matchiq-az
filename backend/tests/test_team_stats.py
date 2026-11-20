from datetime import UTC, date, datetime

from matchiq.domain import CompetitionFeed, Match, Team
from matchiq.team_stats import summarize_competition


def test_table_and_venue_totals_use_completed_results():
    now = datetime(2026, 11, 20, tzinfo=UTC)
    a, b, c = [Team(id=name, name=name) for name in ("A", "B", "C")]

    def match(index, home, away, score):
        return Match(id=str(index), competition="PL", home=home, away=away,
                     date=date(2026, 11, index), status="finished" if score else "date_only",
                     score=score, source="OpenFootball")

    feed = CompetitionFeed(competition="PL", source="OpenFootball",
                           source_url="https://example.com", fetched_at=now, stale=True,
                           matches=[match(4, b, a, None), match(3, c, a, (1, 1)),
                                    match(2, a, b, (2, 0)), match(1, b, c, (1, 0))])
    summary = summarize_competition(feed)
    assert summary.completed_matches == 3
    assert summary.stale and summary.provisional_table
    assert [row.team.id for row in summary.teams] == ["A", "B", "C"]
    row = summary.teams[0]
    assert row.points == 4 and row.total.played == 2
    assert row.home.wins == 1 and row.away.draws == 1
    assert row.home.goals_for == 2 and row.away.goals_against == 1
    assert [result.match_id for result in row.recent] == ["3", "2"]


def test_cup_has_stats_but_no_combined_league_table():
    feed = CompetitionFeed(competition="CL", source="football-data.org",
                           source_url="https://example.com", fetched_at=datetime.now(UTC),
                           stale=False, matches=[])
    summary = summarize_competition(feed)
    assert not summary.provisional_table
    assert not summary.teams
