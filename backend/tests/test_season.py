from datetime import UTC, date, datetime, timedelta

import pytest

from matchiq.domain import Match, Snapshot, Team
from matchiq.season import forecast_at


@pytest.fixture(params=["PL", "CL"])
def season(request):
    code = request.param
    count = 36 if code == "CL" else 20
    teams = [Team(id=str(i), name=f"Test club {i}") for i in range(count)]
    first = date(2026, 8, 8)
    rounds = []
    if code == "CL":
        for turn in range(8):
            pairs = [(teams[i], teams[18 + (i + turn) % 18]) for i in range(18)]
            rounds.append(pairs if turn % 2 == 0 else [(away, home) for home, away in pairs])
    else:
        seeded = teams.copy()
        for _ in range(count - 1):
            rounds.append(list(zip(seeded[:count // 2], reversed(seeded[count // 2:]))))
            seeded = [seeded[0], seeded[-1], *seeded[1:-1]]
        rounds += [[(away, home) for home, away in pairs] for pairs in rounds]
    matches = []
    for turn, pairs in enumerate(rounds, 1):
        for home, away in pairs:
            matches.append(Match(id=str(len(matches)), competition=code, home=home, away=away,
                                 date=first + timedelta(weeks=turn), matchday=turn,
                                 stage="LEAGUE_STAGE" if code == "CL" else "REGULAR_SEASON",
                                 status="finished" if turn <= 5 else "date_only",
                                 score=(int(home.id) % 3, int(away.id) % 2) if turn <= 5 else None,
                                 source="football-data.org"))
    return Snapshot(competition=code, season=2026, source="football-data.org",
                    source_url="https://www.football-data.org", matches=matches,
                    fetched_at=datetime(2026, 9, 18, tzinfo=UTC))


def test_complete_season_and_bracket(season):
    forecast = forecast_at(season, 0, season.fetched_at)
    assert forecast["status"] == "ok"
    assert forecast["matchdays"] == [1, 2, 3, 4, 5]
    assert sum(row["champion"] for row in forecast["teams"]) == pytest.approx(1)
    assert forecast == forecast_at(season, 0, season.fetched_at)
    assert forecast_at(season, 1, season.fetched_at)["status"] == "ok"
    if season.competition == "CL":
        assert list(map(len, forecast["bracket"])) == [8, 4, 2, 1]
        for previous, following in zip(forecast["bracket"], forecast["bracket"][1:]):
            for tie, (a, b) in zip(following, zip(previous[::2], previous[1::2])):
                assert [team.id for team in tie["teams"]] == [a["winner_id"], b["winner_id"]]
        assert forecast["scenario_champion"].id == forecast["bracket"][-1][0]["winner_id"]
        for stage in forecast["bracket"]:
            for tie in stage:
                a, b = tie["score"]
                assert min(a, b) >= 0
                if a != b:
                    assert tie["winner_id"] == tie["teams"][int(b > a)].id


def test_requested_trial_count_changes_probability_resolution(season):
    for trials in (1, 37):
        data = forecast_at(season, 0, season.fetched_at, trials)
        assert data["trials"] == trials
        probabilities = [row["champion"] for row in data["teams"]]
        assert sum(probabilities) == pytest.approx(1)
        assert all(value * trials == pytest.approx(round(value * trials)) for value in probabilities)


def test_historical_matchday_ignores_later_scores(season):
    before = forecast_at(season, 4, season.fetched_at)
    assert before["status"] == "ok"
    assert before["remaining"] > forecast_at(season, 0, season.fetched_at)["remaining"]
    for match in season.matches:
        if match.matchday == 5:
            match.score = (9, 9)
    after = forecast_at(season, 4, season.fetched_at)
    assert before == after


def test_incomplete_calendar_is_not_forecast(season):
    season.matches.pop()
    assert forecast_at(season, 0, season.fetched_at)["status"] == "calendar_unavailable"
