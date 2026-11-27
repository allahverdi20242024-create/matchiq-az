import math

from matchiq.simulation import sample


def test_one_trial_produces_one_observed_score_and_outcome():
    result = sample("fixture-one", 1.4, 0.8, 1)
    assert result.trials == 1
    assert sorted([result.home_win, result.draw, result.away_win]) == [0, 0, 1]
    assert len(result.scores) == 1
    assert result.scores[0][2] == 1


def test_custom_trial_count_is_used_and_reproducible():
    first = sample("fixture-custom", 1.4, 0.8, 50_000)
    assert sample("fixture-custom", 1.4, 0.8, 50_000) is first
    sample.cache_clear()
    second = sample("fixture-custom", 1.4, 0.8, 50_000)
    assert first.model_dump(exclude={"calculated_at"}) == second.model_dump(exclude={"calculated_at"})
    assert second.trials == 50_000
    assert math.isclose(second.home_win + second.draw + second.away_win, 1)
    assert second.over["1.5"] >= second.over["2.5"] >= second.over["3.5"]
    assert len(second.scores) == 5


def test_sparse_venue_uses_other_real_results_without_using_future_matches():
    from datetime import UTC, date, datetime, timedelta

    import pytest

    from matchiq.domain import Match, Snapshot, Team
    from matchiq.simulation import InsufficientResults, estimate

    now = datetime(2026, 11, 20, tzinfo=UTC)
    home, away, other = [Team(id=name, name=name) for name in ("Home", "Away", "Other")]

    def result(index, host, visitor):
        return Match(id=str(index), competition="PL", home=host, away=visitor,
                     date=now.date() - timedelta(days=index), status="finished",
                     score=(2, 1), source="OpenFootball")

    fixture = Match(id="upcoming", competition="PL", home=home, away=away,
                    date=date(2026, 11, 21), status="date_only", source="OpenFootball")
    history = [result(index, home, other) for index in range(1, 10)]
    history += [result(10, other, away), result(11, other, away), result(12, away, other)]
    snapshot = Snapshot(competition="PL", season=2026, source="OpenFootball",
                        source_url="https://example.com", fetched_at=now, matches=history)
    assert all(rate > 0 for rate in estimate(snapshot, fixture, now, now.date()))
    future = history[-1].model_copy(update={"date": date(2026, 11, 22)})
    with pytest.raises(InsufficientResults):
        estimate(snapshot.model_copy(update={"matches": history[:-1] + [future]}), fixture, now, now.date())


def test_equal_scores_against_different_opponents_produce_different_strengths():
    from datetime import date, timedelta

    from matchiq.domain import Match, Team
    from matchiq.simulation import rate_estimator

    first, second, strong, weak, reference = [
        Team(id=name, name=name) for name in ("First", "Second", "Strong", "Weak", "Reference")
    ]
    games = [(first, strong, (1, 1)), (second, weak, (1, 1)),
             (reference, strong, (0, 3)), (reference, weak, (3, 0))] * 4
    history = [
        Match(id=str(index), competition="PL", home=home, away=away, score=score,
              date=date(2026, 11, 1) - timedelta(days=index), status="finished", source="OpenFootball")
        for index, (home, away, score) in enumerate(games)
    ]
    rates = rate_estimator(history, use_elo=False, adjust_for_opponents=True)
    first_attack, goals_against_first = rates(first.id, reference.id)
    second_attack, goals_against_second = rates(second.id, reference.id)

    assert first_attack > second_attack
    assert goals_against_first < goals_against_second

    elo_rates = rate_estimator(history)
    baseline = rate_estimator(history, use_elo=False)
    assert elo_rates(strong.id, weak.id)[0] > baseline(strong.id, weak.id)[0]
    assert elo_rates(strong.id, weak.id)[1] < baseline(strong.id, weak.id)[1]
