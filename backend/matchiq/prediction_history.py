from datetime import datetime, timedelta

import numpy as np
from pydantic import AwareDatetime, BaseModel

from .domain import Snapshot
from .evaluation import MIN_EVALUATED, Bin, Metrics, calibration_bins, metrics, poisson_probabilities
from .providers import BAKU
from .simulation import MODEL_VERSION, InsufficientResults, estimate


class LivePrediction(BaseModel):
    fixture_id: str
    competition: str
    home: str
    away: str
    kickoff: AwareDatetime
    recorded_at: AwareDatetime
    model_version: str = MODEL_VERSION
    probabilities: tuple[float, float, float]
    score: tuple[int, int] | None = None
    settled_at: AwareDatetime | None = None


def prepare(snapshot: Snapshot, now: datetime, existing: list[LivePrediction]):
    known = {row.fixture_id: row for row in existing}
    additions, results = [], []
    for match in snapshot.matches:
        old = known.get(match.id)
        if old and match.score is not None and old.kickoff < now:
            if match.kickoff is not None and match.kickoff <= old.recorded_at:
                continue
            if old.score != match.score:
                results.append(old.model_copy(update={"score": match.score, "settled_at": now}))
        elif not old and match.status == "scheduled" and now < match.kickoff <= now + timedelta(days=2):
            try:
                probabilities = poisson_probabilities(*estimate(snapshot, match, now, now.astimezone(BAKU).date()))
            except InsufficientResults:
                continue
            additions.append(LivePrediction(fixture_id=match.id, competition=match.competition,
                                            home=match.home.name, away=match.away.name,
                                            kickoff=match.kickoff, recorded_at=now, probabilities=probabilities))
    return additions, results


class LiveHistory(BaseModel):
    settled: int
    minimum: int = MIN_EVALUATED
    recent: list[LivePrediction]
    model: Metrics | None = None
    calibration: list[Bin] = []


def settled_outcome(row: LivePrediction) -> int:
    home, away = row.score
    return 0 if home > away else 1 if home == away else 2


def history(rows: list[LivePrediction]) -> LiveHistory:
    settled = [row for row in rows if row.score is not None and row.model_version == MODEL_VERSION]
    recent = sorted(rows, key=lambda row: (row.kickoff, row.fixture_id), reverse=True)[:20]
    report = LiveHistory(settled=len(settled), recent=recent)
    if len(settled) >= report.minimum:
        probabilities = np.asarray([row.probabilities for row in settled])
        actual = np.eye(3)[[settled_outcome(row) for row in settled]]
        report.model = metrics(probabilities, actual)
        report.calibration = calibration_bins(probabilities, actual)
    return report
