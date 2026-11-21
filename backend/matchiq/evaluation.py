from datetime import date, datetime, time
from functools import lru_cache
from math import exp

import numpy as np
from pydantic import BaseModel

from .domain import Match, Snapshot
from .providers import BAKU
from .simulation import MODEL_VERSION, InsufficientResults, estimate_from_history

MIN_EVALUATED = 50
OUTCOMES = ("home", "draw", "away")


class Prediction(BaseModel):
    fixture_id: str
    competition: str
    home: str
    away: str
    date: date
    cutoff: datetime
    model_version: str
    outcome: int
    probabilities: tuple[float, float, float]
    baseline: tuple[float, float, float]


class Metrics(BaseModel):
    brier: float
    log_loss: float


class Bin(BaseModel):
    outcome: str
    count: int
    expected: float
    observed: float


class Evaluation(BaseModel):
    model_version: str
    season: int
    count: int
    minimum: int
    match_count_by_competition: dict[str, int]
    sources: list[str]
    model: Metrics | None = None
    baseline: Metrics | None = None
    calibration: list[Bin] = []
    recent: list[Prediction] = []


def outcome(match: Match) -> int:
    home, away = match.score
    return 0 if home > away else 1 if home == away else 2


def poisson_probabilities(home_rate: float, away_rate: float) -> tuple[float, float, float]:
    def mass(rate):
        terms = [exp(-rate)]
        for goals in range(1, 41):
            terms.append(terms[-1] * rate / goals)
        return terms

    grid = np.outer(mass(home_rate), mass(away_rate))
    totals = np.array([np.tril(grid, -1).sum(), np.trace(grid), np.triu(grid, 1).sum()])
    home, draw, away = totals / totals.sum()
    return float(home), float(draw), float(away)


@lru_cache(maxsize=24)
def replay(serialized: str, today: date) -> tuple[Prediction, ...]:
    snapshot = Snapshot.model_validate_json(serialized)
    completed = sorted((match for match in snapshot.matches
                        if match.score is not None and match.date < today),
                       key=lambda match: (match.date, match.id))
    predictions = []
    for fixture in completed:
        cutoff = datetime.combine(fixture.date, time.min, tzinfo=BAKU)
        history = [match for match in completed if match.date < fixture.date
                   and (match.kickoff is None or match.kickoff < cutoff)]
        try:
            rates = estimate_from_history(history, fixture)
        except InsufficientResults:
            continue
        counts = np.bincount([outcome(match) for match in history], minlength=3) + 1
        baseline = tuple(float(frequency) for frequency in counts / counts.sum())
        predictions.append(Prediction(
            fixture_id=fixture.id, competition=fixture.competition,
            home=fixture.home.name, away=fixture.away.name, date=fixture.date,
            cutoff=cutoff, model_version=MODEL_VERSION, outcome=outcome(fixture),
            probabilities=poisson_probabilities(*rates), baseline=baseline,
        ))
    return tuple(predictions)


def metrics(probabilities, actual):
    assigned = probabilities[actual.astype(bool)]
    return Metrics(brier=float(np.square(probabilities - actual).sum(axis=1).mean()),
                   log_loss=float(-np.log(np.maximum(assigned, 1e-15)).mean()))


def summarize(snapshots: list[Snapshot], today: date, season: int) -> Evaluation:
    predictions = []
    sources = set()
    counts = {}
    for snapshot in snapshots:
        rows = replay(snapshot.model_dump_json(), today)
        if rows:
            predictions.extend(rows)
            sources.add(snapshot.source)
            counts[snapshot.competition] = len(rows)

    summary = Evaluation(model_version=MODEL_VERSION, season=season, count=len(predictions),
                         minimum=MIN_EVALUATED, match_count_by_competition=counts,
                         sources=sorted(sources))
    if len(predictions) < MIN_EVALUATED:
        return summary

    probabilities = np.asarray([row.probabilities for row in predictions])
    baseline = np.asarray([row.baseline for row in predictions])
    actual = np.eye(3)[[row.outcome for row in predictions]]
    summary.model = metrics(probabilities, actual)
    summary.baseline = metrics(baseline, actual)
    for index, name in enumerate(OUTCOMES):
        predicted = probabilities[:, index]
        realized = actual[:, index]
        bucket = np.minimum((predicted * 5).astype(int), 4)
        for bin_index in range(5):
            mask = bucket == bin_index
            if mask.any():
                summary.calibration.append(Bin(outcome=name, count=int(mask.sum()),
                                               expected=float(predicted[mask].mean()),
                                               observed=float(realized[mask].mean())))
    summary.recent = sorted(predictions, key=lambda row: (row.date, row.fixture_id), reverse=True)[:10]
    return summary
