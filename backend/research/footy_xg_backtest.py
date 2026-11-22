"""Chronological Premier League xG validation on a released 11footy SQLite dataset."""

import argparse
from contextlib import closing
from datetime import date
import json
from pathlib import Path
import sqlite3

from matchiq.domain import Match, Team
from xg_backtest import compare


def evaluate_release(path: Path, seasons: list[int]):
    with closing(sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)) as connection:
        version, dataset, scope, built_at = connection.execute(
            "SELECT version, dataset, scope, built_at FROM format_version"
        ).fetchone()
        if (version, dataset, scope) != ("VDF 1", "11footy", "PL"):
            raise ValueError("Use the VDF 1 11footy Premier League database.")
        reports = [evaluate_season(connection, season) for season in seasons]
    return {"source": dataset, "built_at": built_at, "seasons": reports}


def evaluate_season(connection, season: int):
    records = connection.execute("""
        WITH totals AS (
            SELECT match_id, team_id, SUM(xg) AS xg
            FROM shots WHERE layer = 'tracked' AND xg IS NOT NULL
            GROUP BY match_id, team_id
        )
        SELECT m.match_id, m.local_date, h.team_id, h.name, a.team_id, a.name,
               m.home_goals, m.away_goals, hx.xg, ax.xg, m.matchday
        FROM matches m
        JOIN seasons s USING (season_id)
        JOIN teams h ON h.team_id = m.home_team_id
        JOIN teams a ON a.team_id = m.away_team_id
        LEFT JOIN totals hx ON hx.match_id = m.match_id AND hx.team_id = h.team_id
        LEFT JOIN totals ax ON ax.match_id = m.match_id AND ax.team_id = a.team_id
        WHERE s.season = ? AND m.competition_code = 'PL' AND m.status = 'played'
        ORDER BY m.local_date, m.match_id
    """, (season,)).fetchall()
    eligible = []
    for mid, day, home_id, home_name, away_id, away_name, home_goals, away_goals, home_xg, away_xg, week in records:
        if home_xg is None or away_xg is None:
            continue
        match = Match(
            id=str(mid), competition="PL", date=date.fromisoformat(day),
            home=Team(id=str(home_id), name=home_name), away=Team(id=str(away_id), name=away_name),
            status="finished", score=(home_goals, away_goals), source="11footy",
        )
        eligible.append((match, (home_xg, away_xg), week))
    return {
        "season": season,
        "played": len(records),
        "complete_xg": len(eligible),
        "latest_played_date": records[-1][1] if records else None,
        "latest_complete_date": eligible[-1][0].date.isoformat() if eligible else None,
        "missing_xg_in_last_10": sum(row[8] is None or row[9] is None for row in records[-10:]),
        "scores": compare(eligible),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path, help="Unpacked england.premier-league.db")
    parser.add_argument("seasons", type=int, nargs="+", help="Season starting years")
    args = parser.parse_args()
    print(json.dumps(evaluate_release(args.database, args.seasons), indent=2))
