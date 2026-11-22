from asyncio import Lock
from time import monotonic
from typing import Protocol

import psycopg
from psycopg.types.json import Jsonb

from .domain import Snapshot
from .prediction_history import LivePrediction


class Store(Protocol):
    async def initialize(self) -> None: ...
    async def load(self, season: int) -> dict[str, Snapshot]: ...
    async def save(self, snapshot: Snapshot) -> None: ...
    async def load_predictions(self, competition: str | None = None) -> list[LivePrediction]: ...
    async def save_predictions(self, additions: list[LivePrediction], results: list[LivePrediction]) -> None: ...


class MemoryStore:
    def __init__(self):
        self.predictions: dict[tuple[str, str], LivePrediction] = {}
        self.snapshots: dict[tuple[int, str], Snapshot] = {}

    async def initialize(self):
        pass

    async def load(self, season):
        return {code: item for (year, code), item in self.snapshots.items() if year == season}

    async def save(self, snapshot):
        self.snapshots[snapshot.season, snapshot.competition] = snapshot


    async def load_predictions(self, competition=None):
        return [row for (code, _), row in self.predictions.items() if competition is None or code == competition]

    async def save_predictions(self, additions, results):
        for row in additions:
            self.predictions.setdefault((row.competition, row.fixture_id), row)
        for row in results:
            key = row.competition, row.fixture_id
            current = self.predictions.get(key)
            if current and (current.settled_at is None or current.settled_at < row.settled_at):
                self.predictions[key] = current.model_copy(update={"score": row.score, "settled_at": row.settled_at})


class PostgresStore:
    SNAPSHOT_CACHE_SECONDS = 30

    def __init__(self, dsn):
        self.dsn = dsn
        self._snapshot_lock = Lock()
        self._snapshot_cache: tuple[int, float, dict[str, Snapshot]] | None = None

    async def initialize(self):
        async with await psycopg.AsyncConnection.connect(self.dsn, connect_timeout=5) as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS fixture_snapshots (
                    season integer NOT NULL,
                    competition text NOT NULL,
                    fetched_at timestamptz NOT NULL,
                    payload jsonb NOT NULL,
                    PRIMARY KEY (season, competition)
                )
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS prediction_history (
                    competition text NOT NULL,
                    fixture_id text NOT NULL,
                    payload jsonb NOT NULL,
                    settled_at timestamptz,
                    PRIMARY KEY (competition, fixture_id)
                )
            """)

    async def load(self, season):
        async with self._snapshot_lock:
            cached = self._snapshot_cache
            if cached is not None and cached[0] == season and cached[1] > monotonic():
                return cached[2].copy()
            snapshots = await self._read_snapshots(season)
            self._snapshot_cache = (season, monotonic() + self.SNAPSHOT_CACHE_SECONDS, snapshots)
            return snapshots.copy()

    async def _read_snapshots(self, season):
        async with await psycopg.AsyncConnection.connect(self.dsn, connect_timeout=5) as conn:
            cursor = await conn.execute(
                "SELECT competition, payload FROM fixture_snapshots WHERE season = %s", (season,)
            )
            return {code: Snapshot.model_validate(payload) async for code, payload in cursor}

    async def save(self, snapshot):
        async with self._snapshot_lock:
            await self._write_snapshot(snapshot)
            self._snapshot_cache = None

    async def _write_snapshot(self, snapshot):
        async with await psycopg.AsyncConnection.connect(self.dsn, connect_timeout=5) as conn:
            await conn.execute("""
                INSERT INTO fixture_snapshots (season, competition, fetched_at, payload)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (season, competition) DO UPDATE
                SET fetched_at = EXCLUDED.fetched_at, payload = EXCLUDED.payload
                WHERE fixture_snapshots.fetched_at <= EXCLUDED.fetched_at
            """, (snapshot.season, snapshot.competition, snapshot.fetched_at,
                  Jsonb(snapshot.model_dump(mode="json"))))

    async def load_predictions(self, competition=None):
        async with await psycopg.AsyncConnection.connect(self.dsn, connect_timeout=5) as conn:
            if competition is None:
                cursor = await conn.execute("SELECT payload FROM prediction_history")
            else:
                cursor = await conn.execute("SELECT payload FROM prediction_history WHERE competition = %s", (competition,))
            return [LivePrediction.model_validate(payload) async for (payload,) in cursor]

    async def save_predictions(self, additions, results):
        if not additions and not results:
            return
        async with await psycopg.AsyncConnection.connect(self.dsn, connect_timeout=5) as conn:
            async with conn.cursor() as cursor:
                if additions:
                    await cursor.executemany("""
                        INSERT INTO prediction_history (competition, fixture_id, payload)
                        VALUES (%s, %s, %s) ON CONFLICT DO NOTHING
                    """, [(row.competition, row.fixture_id, Jsonb(row.model_dump(mode="json"))) for row in additions])
                if results:
                    await cursor.executemany("""
                        UPDATE prediction_history
                        SET payload = payload || %s, settled_at = %s
                        WHERE competition = %s AND fixture_id = %s
                          AND (settled_at IS NULL OR settled_at < %s)
                    """, [(Jsonb(row.model_dump(mode="json", include={"score", "settled_at"})),
                           row.settled_at, row.competition, row.fixture_id, row.settled_at) for row in results])
