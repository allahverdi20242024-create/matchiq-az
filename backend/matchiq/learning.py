from datetime import UTC, date, datetime, timedelta
from functools import lru_cache
from threading import Lock

import numpy as np
from pydantic import BaseModel

from .domain import Match, Snapshot
from .evaluation import Metrics, metrics, poisson_probabilities, replay
from .prediction_history import LivePrediction, settled_outcome
from .providers import BAKU
from .simulation import MODEL_VERSION, estimate

VERSION = "ml-calibration-1"
MIN_TRAIN = 100
MIN_TEST = 50
training_lock = Lock()


class Comparison(BaseModel):
    count: int
    training_count: int
    start: date
    end: date
    learned: Metrics
    poisson: Metrics
    source: str = "replay"


class LearnedForecast(BaseModel):
    version: str = VERSION
    calculated_at: datetime
    learned: tuple[float, float, float]
    poisson: tuple[float, float, float]
    comparison: Comparison


def design(probabilities):
    logs = np.log(np.maximum(probabilities, 1e-12))
    return logs, np.column_stack((np.ones(len(logs)), logs[:, :2] - logs[:, 2:]))


def softmax(logits):
    values = np.exp(logits - logits.max(axis=1, keepdims=True))
    return values / values.sum(axis=1, keepdims=True)


def fit(probabilities, actual):
    logs, features = design(probabilities)
    weights = np.zeros((features.shape[1], 3))
    for _ in range(240):
        predicted = softmax(logs + features @ weights)
        gradient = features.T @ (predicted - actual) / len(features) + 0.025 * weights
        weights -= 0.08 * gradient
    return weights


def predict(probabilities, weights):
    logs, features = design(probabilities)
    return softmax(logs + features @ weights)


@lru_cache(maxsize=4)
def train(snapshots: tuple[str, ...], cutoff: date):
    rows = sorted((row for snapshot in snapshots for row in replay(snapshot, cutoff)),
                  key=lambda row: (row.date, row.fixture_id))
    split = max(MIN_TRAIN, int(len(rows) * 0.7))
    while split < len(rows) and rows[split - 1].date == rows[split].date:
        split += 1
    if len(rows) - split < MIN_TEST:
        return None
    probabilities = np.asarray([row.probabilities for row in rows])
    actual = np.eye(3)[[row.outcome for row in rows]]
    weights = fit(probabilities[:split], actual[:split])
    held_out = probabilities[split:]
    comparison = Comparison(count=len(rows) - split, training_count=split,
                            start=rows[split].date, end=rows[-1].date,
                            learned=metrics(predict(held_out, weights), actual[split:]),
                            poisson=metrics(held_out, actual[split:]))
    return fit(probabilities, actual), comparison


@lru_cache(maxsize=4)
def train_live(serialized: tuple[str, ...]):
    rows = [LivePrediction.model_validate_json(row) for row in serialized]
    split = max(MIN_TRAIN, int(len(rows) * 0.7))
    if len(rows) - split < MIN_TEST:
        return None
    first_test = rows[split].recorded_at
    training = [row for row in rows[:split] if row.settled_at < first_test]
    if len(training) < MIN_TRAIN:
        return None
    testing = rows[split:]
    def dataset(group):
        return np.asarray([row.probabilities for row in group]), np.eye(3)[[settled_outcome(row) for row in group]]
    test_probabilities, test_actual = dataset(testing)
    learned = metrics(predict(test_probabilities, fit(*dataset(training))), test_actual)
    poisson = metrics(test_probabilities, test_actual)
    if learned.log_loss >= poisson.log_loss or learned.brier >= poisson.brier:
        return None
    comparison = Comparison(count=len(testing), training_count=len(training),
                            start=min(row.kickoff.date() for row in testing),
                            end=max(row.kickoff.date() for row in testing),
                            learned=learned, poisson=poisson, source="live")
    return fit(*dataset(rows)), comparison


def forecast(snapshots: dict[str, Snapshot], snapshot: Snapshot, fixture: Match, now: datetime,
             archived: list[LivePrediction] | None = None):
    today = now.astimezone(BAKU).date()
    base = poisson_probabilities(*estimate(snapshot, fixture, now, today))
    if archived:
        live = sorted((row for row in archived if row.model_version == MODEL_VERSION
                       and row.score is not None and row.settled_at is not None and row.settled_at < now),
                      key=lambda row: (row.recorded_at, row.fixture_id))
        with training_lock:
            trained = train_live(tuple(row.model_dump_json() for row in live))
        if trained is not None:
            weights, comparison = trained
            learned = tuple(float(value) for value in predict(np.asarray([base]), weights)[0])
            return LearnedForecast(calculated_at=now, learned=learned, poisson=base, comparison=comparison)
    cutoff = min(today, fixture.date)
    datasets = []
    for code in sorted(snapshots):
        current = snapshots[code]
        completed = sorted((match for match in current.matches if match.score is not None and match.date < cutoff),
                           key=lambda match: (match.date, match.id))
        if completed:
            datasets.append(current.model_copy(update={"matches": completed, "standings": None,
                                                       "fetched_at": datetime(1970, 1, 1, tzinfo=UTC)}))
    if not datasets:
        return None
    cutoff = max(dataset.matches[-1].date for dataset in datasets) + timedelta(days=1)
    with training_lock:
        trained = train(tuple(dataset.model_dump_json() for dataset in datasets), cutoff)
    if trained is None:
        return None
    weights, comparison = trained
    learned = tuple(float(value) for value in predict(np.asarray([base]), weights)[0])
    return LearnedForecast(calculated_at=now, learned=learned, poisson=base, comparison=comparison)
