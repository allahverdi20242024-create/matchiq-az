import asyncio
import sqlite3
from datetime import UTC, date, datetime, timedelta

from matchiq.domain import Match, Team
from matchiq.simulation import sample
from matchiq.simulation_cache import SQLiteSimulationCache, simulation_cache_key


def test_reopened_cache_reuses_result_and_first_calculation_timestamp(tmp_path):
    path = tmp_path / "simulations.sqlite3"

    async def check():
        first_cache = SQLiteSimulationCache(path)
        await first_cache.initialize()
        result = await first_cache.get_or_create("same-model-inputs", lambda: sample("a", 1.2, 0.9, 100))

        def unexpected():
            raise AssertionError("cached simulation was recomputed")

        reopened = SQLiteSimulationCache(path)
        await reopened.initialize()
        assert await reopened.get_or_create("same-model-inputs", unexpected) == result
        assert await reopened.get_or_create("different-trials", lambda: sample("a", 1.2, 0.9, 1)) != result

    asyncio.run(check())


def test_concurrent_miss_computes_once_and_expired_rows_can_be_replaced(tmp_path):
    path = tmp_path / "simulations.sqlite3"
    calls = 0

    def calculate():
        nonlocal calls
        calls += 1
        return sample("concurrent", 1.2, 0.9, 50_000).model_copy(
            update={"calculated_at": datetime.now(UTC)})

    async def check():
        caches = [SQLiteSimulationCache(path), SQLiteSimulationCache(path)]
        await caches[0].initialize()
        results = await asyncio.gather(*(caches[index % 2].get_or_create("shared", calculate)
                                         for index in range(8)))
        assert calls == 1 and all(result == results[0] for result in results)

        conn = sqlite3.connect(path)
        try:
            with conn:
                conn.execute("UPDATE simulation_cache SET stored_at = 0 WHERE cache_key = ?", ("shared",))
        finally:
            conn.close()
        replacement = await caches[0].get_or_create("shared", calculate)
        assert calls == 2 and replacement.calculated_at > results[0].calculated_at

    asyncio.run(check())


def test_key_changes_with_relevant_inputs():
    start = datetime(2026, 11, 20, 17, tzinfo=UTC)
    fixture = Match(id="m", competition="PL", home=Team(id="a", name="A"),
                    away=Team(id="b", name="B"), date=date(2026, 11, 20),
                    kickoff=start, status="scheduled", source="football-data.org")
    rates = (1.2, 0.9)
    key = simulation_cache_key(fixture, rates, 100)
    assert key == simulation_cache_key(fixture, rates, 100)
    rescheduled = fixture.model_copy(update={"kickoff": start + timedelta(hours=1)})
    assert key != simulation_cache_key(rescheduled, rates, 100)
    assert key != simulation_cache_key(fixture, (1.3, 0.9), 100)
    assert key != simulation_cache_key(fixture, rates, 101)
