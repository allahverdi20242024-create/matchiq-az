import argparse
import json
import os
from datetime import UTC, datetime
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

from matchiq.prediction_history import LivePrediction

FORMAT_VERSION = 1


def export_archive(conn, destination: Path):
    records = conn.execute("""
        SELECT payload FROM public.prediction_history
        ORDER BY competition, fixture_id
    """).fetchall()
    predictions = [LivePrediction.model_validate(payload) for (payload,) in records]
    archive = {
        "version": FORMAT_VERSION,
        "exported_at": datetime.now(UTC).isoformat(),
        "predictions": [row.model_dump(mode="json") for row in predictions],
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("x", encoding="utf-8") as stream:
        json.dump(archive, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    if read_archive(destination) != predictions:
        raise ValueError("Backup verification failed.")
    return len(predictions)


def read_archive(path: Path):
    archive = json.loads(path.read_text(encoding="utf-8"))
    if archive["version"] != FORMAT_VERSION:
        raise ValueError("Unsupported archive version.")
    predictions = [LivePrediction.model_validate(row) for row in archive["predictions"]]
    if len({(row.competition, row.fixture_id) for row in predictions}) != len(predictions):
        raise ValueError("The archive contains duplicate fixtures.")
    return predictions


def restore_archive(conn, predictions):
    with conn.cursor() as cursor:
        cursor.executemany("""
            INSERT INTO public.prediction_history (competition, fixture_id, payload, settled_at)
            VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING
        """, [(row.competition, row.fixture_id, Jsonb(row.model_dump(mode="json")), row.settled_at)
              for row in predictions])
        return cursor.rowcount


def main():
    parser = argparse.ArgumentParser(description="Export or restore the MatchIQ forecast archive.")
    parser.add_argument("action", choices=("export", "verify", "restore"))
    parser.add_argument("file", type=Path)
    args = parser.parse_args()

    try:
        if args.action == "verify":
            print(f"Verified {len(read_archive(args.file))} forecasts.")
            return
        dsn = os.environ.get("DATABASE_URL")
        if not dsn:
            parser.exit(1, "DATABASE_URL is required for export and restore.\n")
        with psycopg.connect(dsn, connect_timeout=10) as conn:
            if args.action == "export":
                print(f"Exported and verified {export_archive(conn, args.file)} forecasts.")
            else:
                added = restore_archive(conn, read_archive(args.file))
                print(f"Restored {added} new forecasts.")
    except (psycopg.Error, OSError, UnicodeError, ValueError, KeyError, TypeError) as exc:
        # Connection and payload errors can include data that should stay out of logs.
        parser.exit(1, f"Archive operation failed ({type(exc).__name__}).\n")


if __name__ == "__main__":
    main()
