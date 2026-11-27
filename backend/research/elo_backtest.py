"""Compare Sport Eden's prior month-end ratings with MatchIQ on the same fixtures.

Run from backend with: python -m research.elo_backtest RESULTS_JSON ELO_HISTORY_CSV
Sport Eden Elo, https://sporteden.com/rankings/elo/football/download (CC BY 4.0).
"""
import argparse
from pathlib import Path

import numpy as np

from matchiq.domain import Feed
from matchiq.evaluation import metrics, outcome, poisson_probabilities
from matchiq.providers import BAKU
from matchiq.simulation import InsufficientResults, rate_estimator
from matchiq.sport_eden import map_clubs, ratings_before, read_history

def compare(feed, identities, histories):
    today = feed.generated_at.astimezone(BAKU).date()
    all_scores = []
    for group in feed.competitions:
        completed = sorted((m for m in group.matches if m.score is not None and m.date < today),
                           key=lambda m: m.date)
        clubs = {t.id: t.name for m in completed for t in (m.home, m.away)}
        mapped = map_clubs(clubs, identities, histories)
        scores = []
        for fixture in completed:
            history = [match for match in completed if match.date < fixture.date]
            try:
                local = rate_estimator(history)(fixture.home.id, fixture.away.id)
                plain = rate_estimator(history, use_elo=False)(fixture.home.id, fixture.away.id)
            except InsufficientResults:
                continue
            ratings = ratings_before({team.id: mapped[team.id] for team in (fixture.home, fixture.away)
                                      if team.id in mapped}, histories, fixture.date)
            if len(ratings) != 2:
                continue
            factor = 10 ** (np.clip(ratings[fixture.home.id] - ratings[fixture.away.id], -300, 300) / 3200)
            external = tuple(np.clip([plain[0] * factor, plain[1] / factor], 0.05, 8))
            scores.append((outcome(fixture), poisson_probabilities(*local), poisson_probabilities(*external)))
        print(f"{group.competition}: {len(mapped)}/{len(clubs)} mapped, {len(scores)} evaluated")
        if len(mapped) < len(clubs):
            print("  Unmapped:", ", ".join(sorted(name for key, name in clubs.items() if key not in mapped)))
        print_metrics(scores)
        all_scores.extend(scores)
    print("All competitions:")
    print_metrics(all_scores)


def print_metrics(scores):
    if not scores:
        return
    actual = np.eye(3)[[row[0] for row in scores]]
    for label, column in [("MatchIQ Elo", 1), ("Sport Eden Elo", 2)]:
        values = metrics(np.asarray([row[column] for row in scores]), actual)
        print(f"  {label}: n={len(scores)} Brier={values.brier:.5f} log loss={values.log_loss:.5f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("results", type=Path)
    parser.add_argument("elo_history", type=Path)
    args = parser.parse_args()
    with args.elo_history.open(encoding="utf-8-sig", newline="") as lines:
        compare(Feed.model_validate_json(args.results.read_bytes()), *read_history(lines))
