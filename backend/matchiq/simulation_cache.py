import asyncio
import sqlite3
from collections.abc import Callable
from contextlib import closing
from hashlib import sha256
from pathlib import Path
from time import time

import psycopg
from psycopg.types.json import Jsonb

from .domain import Match
from .simulation import MODEL_VERSION, Simulation

MAX_ENTRIES = 4096
TTL_SECONDS = 14 * 24 * 60 * 60
POSTGRES_WRITE_LOCK = 0x4D415443484951
SimulationFactory = Callable[[], Simulation]


def simulation_cache_key(fixture: Match, rates: tuple[float, float], trials: int) -> str:
    fields = (MODEL_VERSION, fixture.id, fixture.home.id, fixture.away.id, fixture.date.isoformat(),
              fixture.kickoff.isoformat() if fixture.kickoff else "",
              rates[0].hex(), rates[1].hex(), str(trials))
    return sha256("\0".join(fields).encode()).hexdigest()


class SQLiteSimulationCache:
    def __init__(self, path: Path):
        self.path = path

    async def initialize(self):
        await asyncio.to_thread(self._initialize)

    def _initialize(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path, timeout=5)) as conn, conn:
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS simulation_cache (
                    cache_key TEXT PRIMARY KEY,
                    stored_at REAL NOT NULL,
                    payload TEXT NOT NULL
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS simulation_cache_age ON simulation_cache (stored_at, cache_key)")

    async def get_or_create(self, key: str, factory: SimulationFactory) -> Simulation:
        return await asyncio.to_thread(self._get_or_create, key, factory)

    def _get_or_create(self, key: str, factory: SimulationFactory) -> Simulation:
        cutoff = time() - TTL_SECONDS
        sql = "SELECT payload FROM simulation_cache WHERE cache_key = ? AND stored_at > ?"
        with closing(sqlite3.connect(self.path, timeout=5)) as conn, conn:
            row = conn.execute(sql, (key, cutoff)).fetchone()
            if row:
                return Simulation.model_validate_json(row[0])
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute(sql, (key, time() - TTL_SECONDS)).fetchone()
            if row:
                return Simulation.model_validate_json(row[0])
            result = factory()
            now = time()
            conn.execute("DELETE FROM simulation_cache WHERE stored_at <= ?", (now - TTL_SECONDS,))
            conn.execute("INSERT INTO simulation_cache VALUES (?, ?, ?)", (key, now, result.model_dump_json()))
            conn.execute("""
                DELETE FROM simulation_cache WHERE cache_key IN (
                    SELECT cache_key FROM simulation_cache
                    ORDER BY stored_at DESC, cache_key DESC LIMIT -1 OFFSET ?
                )
            """, (MAX_ENTRIES,))
            return result


class PostgresSimulationCache:
    def __init__(self, dsn: str):
        self.dsn = dsn

    async def initialize(self):
        async with await psycopg.AsyncConnection.connect(self.dsn, connect_timeout=5) as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS simulation_cache (
                    cache_key text PRIMARY KEY,
                    stored_at double precision NOT NULL,
                    payload jsonb NOT NULL
                )
            """)
            await conn.execute("CREATE INDEX IF NOT EXISTS simulation_cache_age ON simulation_cache (stored_at, cache_key)")

    async def get_or_create(self, key: str, factory: SimulationFactory) -> Simulation:
        sql = "SELECT payload FROM simulation_cache WHERE cache_key = %s AND stored_at > %s"
        async with await psycopg.AsyncConnection.connect(self.dsn, connect_timeout=5) as conn:
            cursor = await conn.execute(sql, (key, time() - TTL_SECONDS))
            row = await cursor.fetchone()
            if row:
                return Simulation.model_validate(row[0])
            await conn.execute("SELECT pg_advisory_xact_lock(%s)", (POSTGRES_WRITE_LOCK,))
            cursor = await conn.execute(sql, (key, time() - TTL_SECONDS))
            row = await cursor.fetchone()
            if row:
                return Simulation.model_validate(row[0])
            result = await asyncio.to_thread(factory)
            now = time()
            await conn.execute("DELETE FROM simulation_cache WHERE stored_at <= %s", (now - TTL_SECONDS,))
            await conn.execute("INSERT INTO simulation_cache VALUES (%s, %s, %s)",
                               (key, now, Jsonb(result.model_dump(mode="json"))))
            await conn.execute("""
                DELETE FROM simulation_cache WHERE cache_key IN (
                    SELECT cache_key FROM simulation_cache
                    ORDER BY stored_at DESC, cache_key DESC OFFSET %s
                )
            """, (MAX_ENTRIES,))
            return result
