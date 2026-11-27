from datetime import UTC, datetime
from functools import lru_cache
from hashlib import sha256
from itertools import groupby

import numpy as np
from pydantic import BaseModel

from .domain import Match, Snapshot

MODEL_VERSION = "poisson-elo-1"
MAX_TRIALS = 100_000
MIN_TEAM_RESULTS = 3


class Simulation(BaseModel):
    trials: int
    model_version: str
    calculated_at: datetime
    expected_home: float
    expected_away: float
    home_win: float
    draw: float
    away_win: float
    over: dict[str, float]
    both_score: float
    scores: list[tuple[int, int, float]]


class InsufficientResults(ValueError):
    pass


def estimate(snapshot: Snapshot, fixture: Match, now: datetime, today) -> tuple[float, float]:
    # Date-only results from the current day cannot be ordered against the request.
    history = [match for match in snapshot.matches if match.score is not None and match.date < fixture.date
               and (match.kickoff < now if match.kickoff else match.date < today)]
    return estimate_from_history(history, fixture)


def estimate_from_history(history: list[Match], fixture: Match) -> tuple[float, float]:
    return rate_estimator(history)(fixture.home.id, fixture.away.id)


def elo_ratings(history: list[Match]) -> dict[str, float]:
    ratings: dict[str, float] = {}
    played: dict[str, int] = {}
    finished = sorted((match for match in history if match.score is not None), key=lambda match: match.date)
    for _, fixtures in groupby(finished, key=lambda match: match.date):
        changes: dict[str, float] = {}
        for match in fixtures:
            home, away = match.home.id, match.away.id
            home_goals, away_goals = match.score
            expected = 1 / (1 + 10 ** ((ratings.get(away, 1500) - ratings.get(home, 1500) - 50) / 400))
            outcome = 0.5 if home_goals == away_goals else float(home_goals > away_goals)
            delta = 24 * (outcome - expected)
            changes[home] = changes.get(home, 0) + delta
            changes[away] = changes.get(away, 0) - delta
            for team in (home, away):
                played[team] = played.get(team, 0) + 1
        for team, delta in changes.items():
            ratings[team] = ratings.get(team, 1500) + delta
    return {team: rating for team, rating in ratings.items() if played[team] >= MIN_TEAM_RESULTS}


def rate_estimator(history: list[Match], *, minimum_matches=12, minimum_team_results=MIN_TEAM_RESULTS,
                   values: dict[str, tuple[float, float]] | None = None,
                   use_elo: bool = True, adjust_for_opponents: bool = False):
    if len(history) < minimum_matches:
        raise InsufficientResults
    history = sorted(history, key=lambda match: (match.date, match.id), reverse=True)
    goals = np.asarray([match.score if values is None else values[match.id] for match in history], dtype=float)
    league_home, league_away = np.maximum(goals.mean(axis=0), 0.1)
    ratings = elo_ratings(history) if use_elo else {}
    appearances_by_team: dict[str, list[tuple[int, bool, str]]] = {}
    for index, match in enumerate(history):
        appearances_by_team.setdefault(match.home.id, []).append((index, True, match.away.id))
        appearances_by_team.setdefault(match.away.id, []).append((index, False, match.home.id))

    @lru_cache(maxsize=None)
    def strength(team_id, home, adjust, require_history):
        appearances = appearances_by_team.get(team_id, [])
        preferred = [appearance for appearance in appearances if appearance[1] == home]
        selected = (preferred if len(preferred) >= MIN_TEAM_RESULTS else appearances)[:12]
        if require_history and len(selected) < minimum_team_results:
            raise InsufficientResults
        if not selected:
            return (1.0, 1.0)
        weights = 0.88 ** np.arange(len(selected))
        ratios = []
        for position, (index, at_home, opponent_id) in enumerate(selected):
            if at_home:
                ratio = goals[index] / [league_home, league_away]
            else:
                ratio = goals[index, ::-1] / [league_away, league_home]
            if adjust and len(appearances_by_team[opponent_id]) >= MIN_TEAM_RESULTS:
                opponent_attack, opponent_defense = strength(opponent_id, not at_home, False, False)
                # Limit the effect of noisy opponent estimates from short samples.
                ratio = ratio / np.sqrt(np.clip([opponent_defense, opponent_attack], 0.5, 2.0))
            ratios.append(ratio)
            if at_home != home:
                weights[position] *= 0.5
        return (np.asarray(ratios).T @ weights + 3) / (weights.sum() + 3)

    def rates(home_id, away_id):
        home_attack, home_defense = strength(home_id, True, adjust_for_opponents, True)
        away_attack, away_defense = strength(away_id, False, adjust_for_opponents, True)
        # Home advantage is already in the goal rates. Use the neutral Elo difference here.
        gap = ratings[home_id] - ratings[away_id] if home_id in ratings and away_id in ratings else 0
        multiplier = 10 ** (np.clip(gap, -300, 300) / 3200)
        return (float(np.clip(league_home * home_attack * away_defense * multiplier, 0.05, 8)),
                float(np.clip(league_away * away_attack * home_defense / multiplier, 0.05, 8)))

    return rates


@lru_cache(maxsize=512)
def sample(match_id: str, home_rate: float, away_rate: float, trials: int, *, cache_revision: str = "") -> Simulation:
    # The revision scopes the in-process cache without changing the deterministic random stream.
    if not 1 <= trials <= MAX_TRIALS:
        raise ValueError("trial count is outside the supported range")
    seed_material = f"{MODEL_VERSION}:{match_id}:{home_rate.hex()}:{away_rate.hex()}"
    seed = int.from_bytes(sha256(seed_material.encode()).digest()[:16], "big")
    rng = np.random.default_rng(seed)
    goals = rng.poisson([home_rate, away_rate], size=(trials, 2))
    home, away = goals.T
    total = home + away
    width = int(away.max()) + 1
    frequencies = np.bincount(home * width + away)
    ranked = sorted(np.flatnonzero(frequencies), key=lambda index: (-frequencies[index], index))[:5]
    return Simulation(
        trials=trials, model_version=MODEL_VERSION, calculated_at=datetime.now(UTC),
        expected_home=home_rate, expected_away=away_rate,
        home_win=float(np.mean(home > away)), draw=float(np.mean(home == away)),
        away_win=float(np.mean(away > home)), both_score=float(np.mean((home > 0) & (away > 0))),
        over={str(line): float(np.mean(total > line)) for line in (1.5, 2.5, 3.5)},
        scores=[(int(index // width), int(index % width), float(frequencies[index] / trials)) for index in ranked],
    )
