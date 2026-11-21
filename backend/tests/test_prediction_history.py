from datetime import UTC, date, datetime, timedelta

from matchiq.prediction_history import LivePrediction, history, prepare
from matchiq.storage import MemoryStore
from test_evaluation import sample_snapshot

import asyncio


def test_prediction_is_recorded_only_once_and_settled_from_real_score():
    now = datetime(2026, 11, 20, tzinfo=UTC)
    snapshot = sample_snapshot(100)
    upcoming = snapshot.matches[-1].model_copy(update={
        "id": "future", "date": date(2026, 11, 21), "kickoff": now + timedelta(days=1),
        "status": "scheduled", "score": None,
    })
    updated = snapshot.model_copy(update={"matches": snapshot.matches + [upcoming]})
    additions, results = prepare(updated, now, [])
    assert len(additions) == 1 and not results
    first = additions[0]
    assert first.recorded_at < first.kickoff
    assert prepare(updated, now + timedelta(hours=4), additions) == ([], [])
    completed = upcoming.model_copy(update={"status": "finished", "score": (2, 0)})
    updated = snapshot.model_copy(update={"matches": snapshot.matches + [completed]})
    assert prepare(updated, now, []) == ([], [])
    additions, results = prepare(updated, now + timedelta(days=2), [first])
    assert not additions and results[0].score == (2, 0)
    assert results[0].probabilities == first.probabilities
    assert history(results).model is None

    async def record_twice():
        store = MemoryStore()
        await store.save_predictions([first], [])
        await store.save_predictions([first], results)
        [settled] = await store.load_predictions()
        assert settled == results[0]

    asyncio.run(record_twice())


def test_live_calibration_waits_for_threshold():
    now = datetime(2026, 11, 20, tzinfo=UTC)
    row = LivePrediction(fixture_id="example", competition="PL", home="A", away="B",
                         kickoff=now + timedelta(days=1), recorded_at=now,
                         probabilities=(0.7, 0.2, 0.1), score=(1, 0), settled_at=now + timedelta(days=2))
    report = history([row.model_copy(update={"fixture_id": str(i)}) for i in range(50)])
    assert report.model is not None
    assert report.settled == 50
    assert sum(item.count for item in report.calibration) == 150


def test_live_training_requires_results_known_before_holdout():
    from matchiq.learning import train_live

    start = datetime(2025, 7, 1, tzinfo=UTC)
    rows = []
    for index in range(180):
        recorded = start + timedelta(days=index)
        score = ((2, 0), (1, 1), (0, 1))[0 if index % 10 < 8 else index % 2 + 1]
        rows.append(LivePrediction(
            fixture_id=str(index), competition="PL", home="A", away="B",
            kickoff=recorded + timedelta(hours=4), recorded_at=recorded,
            probabilities=(0.5, 0.25, 0.25), score=score, settled_at=recorded + timedelta(hours=7),
        ))
    trained = train_live(tuple(row.model_dump_json() for row in rows))
    assert trained is not None
    _, comparison = trained
    assert comparison.source == "live"
    assert comparison.learned.log_loss < comparison.poisson.log_loss
    late = start + timedelta(days=179)
    delayed = [row.model_copy(update={"settled_at": max(late, row.settled_at)}) for row in rows]
    assert train_live(tuple(row.model_dump_json() for row in delayed)) is None
