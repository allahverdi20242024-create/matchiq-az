import asyncio
import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import psycopg
import pytest

from matchiq.archive_backup import export_archive, read_archive, restore_archive
from matchiq.prediction_history import LivePrediction
from matchiq.domain import Snapshot
from matchiq.simulation import sample
from matchiq.simulation_cache import PostgresSimulationCache
from matchiq.storage import PostgresStore


@pytest.mark.skipif(not os.getenv("TEST_POSTGRES_DSN"), reason="a dedicated PostgreSQL test database is required")
def test_real_postgres_snapshot_and_concurrent_cache():
    dsn = os.environ["TEST_POSTGRES_DSN"]
    key = uuid4().hex
    now = datetime.now(UTC)
    snapshot = Snapshot(competition=key, season=2026, source="OpenFootball",
                        source_url="https://example.com", fetched_at=now, matches=[])

    async def verify():
        store = PostgresStore(dsn)
        await store.initialize()
        await store.save(snapshot)
        reopened_store = PostgresStore(dsn)
        assert (await reopened_store.load(2026))[key] == snapshot

        caches = [PostgresSimulationCache(dsn), PostgresSimulationCache(dsn)]
        await caches[0].initialize()
        calls = 0

        def calculate():
            nonlocal calls
            calls += 1
            return sample(key, 1.2, 0.9, 10)

        results = await asyncio.gather(*(cache.get_or_create(key, calculate) for cache in caches))
        assert calls == 1
        assert results[0] == results[1]
        assert await PostgresSimulationCache(dsn).get_or_create(key, calculate) == results[0]
        assert calls == 1

    asyncio.run(verify())


@pytest.mark.skipif(not os.getenv("TEST_POSTGRES_DSN"), reason="a dedicated PostgreSQL test database is required")
def test_archive_export_and_restore_preserve_settlement(tmp_path):
    dsn = os.environ["TEST_POSTGRES_DSN"]
    asyncio.run(PostgresStore(dsn).initialize())
    competition = uuid4().hex
    now = datetime.now(UTC)
    pending = LivePrediction(
        fixture_id="pending", competition=competition, home="Example A", away="Example B",
        kickoff=now + timedelta(days=1), recorded_at=now, probabilities=(0.55, 0.25, 0.20),
    )
    settled = pending.model_copy(update={
        "fixture_id": "settled", "kickoff": now - timedelta(days=1), "recorded_at": now - timedelta(days=2),
        "score": (2, 1), "settled_at": now,
    })
    backup = tmp_path / "prediction-history.json"

    with psycopg.connect(dsn, connect_timeout=5) as connection:
        try:
            assert restore_archive(connection, [pending, settled]) == 2
            assert export_archive(connection, backup) >= 2
            records = [row for row in read_archive(backup) if row.competition == competition]
            assert records == [pending, settled]
            connection.execute("DELETE FROM public.prediction_history WHERE competition = %s", (competition,))
            assert restore_archive(connection, records) == 2
            assert restore_archive(connection, [settled.model_copy(update={"score": (1, 2)})]) == 0
            payload, settled_at = connection.execute("""
                SELECT payload, settled_at FROM public.prediction_history
                WHERE competition = %s AND fixture_id = %s
            """, (competition, settled.fixture_id)).fetchone()
            assert LivePrediction.model_validate(payload) == settled
            assert settled_at == now
        finally:
            connection.rollback()


def test_snapshot_cache_coalesces_loads_and_invalidates_after_save(monkeypatch):
    store = PostgresStore("unused")
    calls = []

    async def read(season):
        calls.append(season)
        return {"PL": season}

    async def write(_snapshot):
        pass

    monkeypatch.setattr(store, "_read_snapshots", read)
    monkeypatch.setattr(store, "_write_snapshot", write)

    async def verify():
        first, second = await asyncio.gather(store.load(2026), store.load(2026))
        assert calls == [2026]
        first.clear()
        assert second == {"PL": 2026}
        await store.save(None)
        assert await store.load(2026) == second
        assert await store.load(2027) == {"PL": 2027}
        assert calls == [2026, 2026, 2027]

    asyncio.run(verify())
