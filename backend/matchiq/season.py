from collections import Counter
from datetime import datetime, timedelta
from functools import lru_cache
from itertools import permutations

import numpy as np

from .domain import Snapshot
from .providers import BAKU
from .simulation import InsufficientResults, rate_estimator

TEAM_COUNTS = {"PL": 20, "PD": 20, "SA": 20, "BL1": 18, "FL1": 18, "CL": 36}
PATHS = 10_000


def knockout(order, matrix, rng):
    """Follow the UEFA seeded paths, drawing the placement within each rank pair."""
    trials = order.shape[1]
    columns = np.arange(trials)
    pairs = []
    for rank in range(0, 24, 2):
        swap = rng.integers(0, 2, size=trials)
        pairs.append(order[rank + swap, columns])
        pairs.append(order[rank + 1 - swap, columns])

    def winners(home, away, neutral=False):
        h1, a1 = matrix[home, away].T
        a2, h2 = matrix[away, home].T
        factor = 0.5 if neutral else 1.0
        delta = rng.poisson((h1 + h2) * factor) - rng.poisson((a1 + a2) * factor)
        return np.where((delta > 0) | ((delta == 0) & (rng.random(trials) < 0.5)), home, away)

    playoff = [(pairs[a], pairs[b]) for a, b in
               [(14, 16), (15, 17), (12, 18), (13, 19), (10, 20), (11, 21), (8, 22), (9, 23)]]
    round16 = [(pairs[index], winners(*match)) for index, match in enumerate(playoff)]
    quarters = [(winners(*round16[a]), winners(*round16[b])) for a, b in [(0, 6), (2, 4), (1, 7), (3, 5)]]
    semis = [(winners(*quarters[a]), winners(*quarters[b])) for a, b in [(0, 1), (2, 3)]]
    final = [(winners(*semis[0]), winners(*semis[1]))]
    champion = winners(*final[0], neutral=True)
    ordered_16 = [round16[index] for index in (0, 6, 2, 4, 1, 7, 3, 5)]
    return champion, [ordered_16, quarters, semis, final]


@lru_cache(maxsize=24)
def forecast(serialized: str, day: int, as_of: datetime):
    snapshot = Snapshot.model_validate_json(serialized)
    code = snapshot.competition
    european = code == "CL"
    matches = [match for match in snapshot.matches if not european or match.stage == "LEAGUE_STAGE"]
    teams = {team.id: team for match in matches for team in (match.home, match.away)}
    count = TEAM_COUNTS[code]
    rounds = 8 if european else (count - 1) * 2
    today = as_of.astimezone(BAKU).date()
    known = [match for match in matches if match.score is not None and
             (match.kickoff <= as_of if match.kickoff else match.date < today)]
    groups = Counter(match.matchday for match in known)
    dates = {match.matchday: match.date for match in sorted(known, key=lambda match: match.date)}
    available_days = [number for number in range(1, rounds + 1) if groups[number] == count // 2]
    response = {"source": snapshot.source, "fetched_at": snapshot.fetched_at, "season": snapshot.season,
                "matchdays": available_days, "matchday": day, "trials": PATHS}

    if day and day not in available_days:
        return {**response, "status": "round_unavailable"}
    pairs = {(match.home.id, match.away.id) for match in matches}
    appearances = Counter(team.id for match in matches for team in (match.home, match.away))
    valid = len(teams) == count and len(matches) == len(pairs) and set(appearances.values()) == {rounds}
    if european:
        home_counts = Counter(match.home.id for match in matches)
        valid = valid and set(home_counts.values()) == {4} and len(home_counts) == count
        valid = valid and len({frozenset(pair) for pair in pairs}) == len(matches)
    if not valid:
        return {**response, "status": "calendar_unavailable"}
    if european and not day and any(
            match.stage in {"PLAYOFFS", "PLAY_OFFS", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"}
            for match in snapshot.matches):
        return {**response, "status": "draw_available"}

    history = [match for match in known if not day or match.date <= dates[day]]
    history_ids = {item.id for item in history}
    remaining = [match for match in matches if match.id not in history_ids]
    ids = sorted(teams)
    index = {team_id: position for position, team_id in enumerate(ids)}
    points = np.zeros((count, PATHS), dtype=np.int16)
    goals = np.zeros_like(points)
    conceded = np.zeros_like(points)
    away_goals = np.zeros_like(points)
    wins = np.zeros_like(points)
    away_wins = np.zeros_like(points)
    rng = np.random.default_rng(173 + day)
    try:
        rates = rate_estimator(history, minimum_matches=count // 2, minimum_team_results=0) if remaining or european else None
        for match in history + remaining:
            home, away = index[match.home.id], index[match.away.id]
            if match.id in history_ids:
                scored, allowed = match.score
                scored, allowed = np.asarray(scored), np.asarray(allowed)
            else:
                home_rate, away_rate = rates(ids[home], ids[away])
                scored = rng.poisson(home_rate, PATHS)
                allowed = rng.poisson(away_rate, PATHS)
            goals[home] += scored
            goals[away] += allowed
            conceded[home] += allowed
            conceded[away] += scored
            away_goals[away] += allowed
            wins[home] += scored > allowed
            wins[away] += allowed > scored
            away_wins[away] += allowed > scored
            points[home] += 3 * (scored > allowed) + (scored == allowed)
            points[away] += 3 * (allowed > scored) + (scored == allowed)

        if not day and snapshot.standings:
            played = Counter(team.id for match in history for team in (match.home, match.away))
            for row in snapshot.standings.rows:
                if row.team.id not in index or played[row.team.id] != row.played:
                    return {**response, "status": "calendar_unavailable"}
                points[index[row.team.id]] += row.points - (3 * row.wins + row.draws)
        keys = [rng.random(points.shape)]
        if european:
            keys.extend((-away_wins, -wins, -away_goals))
        keys.extend((-goals, conceded - goals, -points))
        order = np.lexsort(tuple(keys), axis=0)
        stages = []
        if european:
            matrix = np.zeros((count, count, 2))
            for home, away in permutations(range(count), 2):
                matrix[home, away] = rates(ids[home], ids[away])
            champion, stages = knockout(order, matrix, rng)
        else:
            champion = order[0]
    except InsufficientResults:
        return {**response, "status": "results_unavailable"}

    probabilities = np.bincount(champion, minlength=count) / PATHS
    rankings = np.argsort(order, axis=0).mean(axis=1) + 1
    rows = [{"team": teams[ids[i]], "champion": float(probabilities[i]), "position": float(rankings[i]),
             "points": float(points[i].mean())} for i in range(count)]
    rows.sort(key=lambda row: (-row["champion"], row["position"]))
    bracket = [[[teams[ids[a[0]]], teams[ids[b[0]]]] for a, b in stage] for stage in stages]
    return {**response, "status": "ok", "remaining": len(remaining), "teams": rows, "bracket": bracket,
            "scenario_champion": teams[ids[champion[0]]] if european else None}


def forecast_at(snapshot: Snapshot, day: int, now: datetime):
    # Completed results can only come from this snapshot. Reject impossible future kickoffs.
    return forecast(snapshot.model_dump_json(), day, min(now, snapshot.fetched_at + timedelta(seconds=1)))
