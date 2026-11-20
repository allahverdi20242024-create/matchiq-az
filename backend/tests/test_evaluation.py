from datetime import UTC, date, datetime, timedelta
from math import isclose, log

import numpy as np

from matchiq.domain import Match, Snapshot, Team
from matchiq.evaluation import metrics, poisson_probabilities, replay, summarize
from matchiq.learning import forecast, train


def sample_snapshot(n):
    teams = [Team(id=team, name=team) for team in ("A", "B", "C", "D")]
    start = date(2026, 8, 1)
    matches = [Match(id=f"match-{index}", competition="PL",
                     home=teams[index % 4], away=teams[(index + 1) % 4],
                     date=start + timedelta(days=index // 2), status="finished",
                     score=(index % 3, 1), source="OpenFootball")
               for index in range(n)]
    return Snapshot(competition="PL", season=2026, source="OpenFootball",
                    source_url="https://example.com", fetched_at=datetime(2026, 11, 20, tzinfo=UTC),
                    matches=matches)


def test_future_and_same_day_results_do_not_change_an_earlier_prediction():
    original = sample_snapshot(100)
    as_of = date(2026, 11, 20)
    target = replay(original.model_dump_json(), as_of)[0]
    modified = [match.model_copy(update={"score": (9, 0)}) if match.date >= target.date else match
                for match in original.matches]
    updated = original.model_copy(update={"matches": modified})
    replayed = next(row for row in replay(updated.model_dump_json(), as_of)
                    if row.fixture_id == target.fixture_id)
    assert target.probabilities == replayed.probabilities
    assert target.baseline == replayed.baseline
    assert target.outcome != replayed.outcome
    assert replayed.cutoff.date() == target.date


def test_outcome_probabilities_and_scoring_rules():
    home, draw, away = poisson_probabilities(1.2, 1.2)
    assert isclose(home + draw + away, 1)
    assert isclose(home, away)
    result = metrics(np.array([[0.7, 0.2, 0.1]]), np.array([[1, 0, 0]]))
    assert isclose(result.brier, 0.14)
    assert isclose(result.log_loss, -log(0.7))


def test_summary_gates_scores_and_calibrates_all_outcomes():
    today = date(2026, 11, 20)
    sparse = summarize([sample_snapshot(20)], today, 2026)
    assert sparse.count < sparse.minimum
    assert sparse.model is None and sparse.baseline is None
    assert not sparse.recent and not sparse.calibration
    enough = summarize([sample_snapshot(100)], today, 2026)
    assert enough.count >= enough.minimum
    assert enough.model and enough.baseline
    assert sum(bucket.count for bucket in enough.calibration) == 3 * enough.count
    assert len(enough.recent) == 10


def test_learned_model_uses_earlier_results_and_scores_the_same_holdout():
    snapshot = sample_snapshot(240)
    now = datetime(2026, 11, 20, tzinfo=UTC)
    fixture = snapshot.matches[-1].model_copy(update={
        "id": "future", "date": date(2026, 12, 1), "status": "date_only", "score": None,
    })
    assert train((sample_snapshot(100).model_dump_json(),), now.date()) is None
    trained = forecast({"PL": snapshot}, snapshot, fixture, now)
    assert trained.comparison.count >= 50
    assert trained.comparison.end < now.date()
    assert isclose(sum(trained.learned), 1)
    assert isclose(sum(trained.poisson), 1)
    future_result = fixture.model_copy(update={"score": (9, 0), "status": "finished"})
    updated = snapshot.model_copy(update={"matches": snapshot.matches + [future_result]})
    assert forecast({"PL": updated}, updated, fixture, now) == trained
