import asyncio
import os
from datetime import UTC, datetime
from uuid import uuid4

import pytest

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
