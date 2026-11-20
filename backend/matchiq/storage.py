from typing import Protocol

import psycopg
from psycopg.types.json import Jsonb

from .domain import Snapshot


class Store(Protocol):
    async def initialize(self) -> None: ...
    async def load(self, season: int) -> dict[str, Snapshot]: ...
    async def save(self, snapshot: Snapshot) -> None: ...


class MemoryStore:
    def __init__(self):
        self.snapshots: dict[tuple[int, str], Snapshot] = {}

    async def initialize(self):
        pass

    async def load(self, season):
        return {code: item for (year, code), item in self.snapshots.items() if year == season}

    async def save(self, snapshot):
        self.snapshots[snapshot.season, snapshot.competition] = snapshot


class PostgresStore:
    def __init__(self, dsn):
        self.dsn = dsn

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

    async def load(self, season):
        async with await psycopg.AsyncConnection.connect(self.dsn, connect_timeout=5) as conn:
            cursor = await conn.execute(
                "SELECT competition, payload FROM fixture_snapshots WHERE season = %s", (season,)
            )
            return {code: Snapshot.model_validate(payload) async for code, payload in cursor}

    async def save(self, snapshot):
        async with await psycopg.AsyncConnection.connect(self.dsn, connect_timeout=5) as conn:
            await conn.execute("""
                INSERT INTO fixture_snapshots (season, competition, fetched_at, payload)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (season, competition) DO UPDATE
                SET fetched_at = EXCLUDED.fetched_at, payload = EXCLUDED.payload
                WHERE fixture_snapshots.fetched_at <= EXCLUDED.fetched_at
            """, (snapshot.season, snapshot.competition, snapshot.fetched_at,
                  Jsonb(snapshot.model_dump(mode="json"))))
