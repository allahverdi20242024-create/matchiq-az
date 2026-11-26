"""Offline xG experiment using StatsBomb Open Data (Premier League 2015/16)."""

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
from urllib.request import urlopen

import numpy as np

from matchiq.domain import Match, Team
from matchiq.evaluation import metrics, outcome, poisson_probabilities
from matchiq.simulation import InsufficientResults, rate_estimator


def load_season(revision: str, cache: Path):
    base = f"https://raw.githubusercontent.com/hudl/open-data/{revision}/data/"
    cache = cache / revision
    cache.mkdir(parents=True, exist_ok=True)

    def download(relative):
        with urlopen(base + relative, timeout=30) as response:
            return json.load(response)

    def convert(row):
        match_id = str(row["match_id"])
        home = Team(id=str(row["home_team"]["home_team_id"]), name=row["home_team"]["home_team_name"])
        away = Team(id=str(row["away_team"]["away_team_id"]), name=row["away_team"]["away_team_name"])
        match = Match(
            id=match_id, competition="PL", home=home, away=away, date=row["match_date"],
            status="finished", score=(row["home_score"], row["away_score"]), source="StatsBomb",
        )
        path = cache / f"{match_id}.json"
        if path.exists():
            totals = json.loads(path.read_text(encoding="utf-8"))
        else:
            totals = {home.id: 0.0, away.id: 0.0}
            shot_teams = set()
            for event in download(f"events/{match_id}.json"):
                if "shot" in event:
                    team_id = str(event["team"]["id"])
                    totals[team_id] += event["shot"]["statsbomb_xg"]
                    shot_teams.add(team_id)
            if not shot_teams:
                raise ValueError(f"No shot data for {match_id}")
            path.write_text(json.dumps(totals), encoding="utf-8")
        return match, (totals[home.id], totals[away.id]), row["match_week"]

    rows = download("matches/2/27.json")
    if len({row["match_id"] for row in rows}) != 380:
        raise ValueError("A complete 380-match Premier League season is required.")
    if any(row["match_status"] != "available" for row in rows):
        raise ValueError("Some match events are unavailable.")
    with ThreadPoolExecutor(max_workers=12) as pool:
        return sorted(pool.map(convert, rows), key=lambda record: (record[0].date, record[0].id))


def compare(rows):
    blended = {match.id: tuple((goals + expected) / 2 for goals, expected in zip(match.score, xg, strict=True))
               for match, xg, _ in rows}
    observed, baseline, candidate, weeks = [], [], [], []
    for fixture, _, week in rows:
        prior = [match for match, _, _ in rows if match.date < fixture.date]
        try:
            base = rate_estimator(prior)(fixture.home.id, fixture.away.id)
            enhanced = rate_estimator(prior, values=blended)(fixture.home.id, fixture.away.id)
        except InsufficientResults:
            continue
        observed.append(outcome(fixture))
        baseline.append(poisson_probabilities(*base))
        candidate.append(poisson_probabilities(*enhanced))
        weeks.append(week)

    results = {}
    later = np.array([week is not None and week >= 20 for week in weeks], dtype=bool)
    for label, mask in (("all", np.ones(len(weeks), dtype=bool)), ("matchweeks_20_38", later)):
        if not mask.any():
            continue
        actual = np.eye(3)[np.asarray(observed)[mask]]
        results[label] = {"matches": len(actual),
                          "goals": metrics(np.asarray(baseline)[mask], actual).model_dump(),
                          "goals_plus_xg": metrics(np.asarray(candidate)[mask], actual).model_dump()}
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("revision")
    parser.add_argument("cache", type=Path)
    args = parser.parse_args()
    rows = load_season(args.revision, args.cache)
    print(json.dumps({"source": "StatsBomb Open Data", "revision": args.revision,
                      "season": "2015/16", "scores": compare(rows)}, indent=2))
