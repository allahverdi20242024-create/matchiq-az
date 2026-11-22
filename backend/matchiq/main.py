import asyncio
import logging
import sqlite3
import os
from contextlib import asynccontextmanager, suppress
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

import httpx
import psycopg
from fastapi import FastAPI, HTTPException, Query
from starlette.concurrency import run_in_threadpool

from .domain import Feed
from .evaluation import Evaluation, summarize
from .fixture_detail import FixtureDetail, build_fixture_detail
from .learning import LearnedForecast, forecast as learned_forecast
from .prediction_history import LiveHistory, history
from .providers import BAKU, ApiFootball, FootballData, OpenFootball, ProviderHttp
from .season import TEAM_COUNTS, forecast_at
from .service import FixtureService, current_season, is_upcoming
from .simulation import MAX_TRIALS, InsufficientResults, Simulation, estimate, sample
from .simulation_cache import PostgresSimulationCache, SQLiteSimulationCache, simulation_cache_key
from .storage import MemoryStore, PostgresStore
from .team_stats import Statistics, summarize_teams


logger = logging.getLogger("uvicorn.error")
DEFAULT_CACHE_PATH = Path(__file__).resolve().parents[1] / ".matchiq-cache" / "simulations.sqlite3"


def create_app(*, service=None, synchronize=True, simulation_cache=None):
    @asynccontextmanager
    async def lifespan(app):
        async with httpx.AsyncClient(timeout=12) as client:
            app.state.simulation_cache = simulation_cache
            app.state.season_slot = asyncio.Semaphore(1)
            if service is None:
                dsn = os.getenv("DATABASE_URL")
                if app.state.simulation_cache is None:
                    cache_path = Path(os.getenv("SIMULATION_CACHE_PATH") or DEFAULT_CACHE_PATH)
                    app.state.simulation_cache = PostgresSimulationCache(dsn) if dsn else SQLiteSimulationCache(cache_path)
                providers = []
                if token := os.getenv("FOOTBALL_DATA_TOKEN"):
                    providers.append(FootballData(ProviderHttp(client, 6.1), token))
                if token := os.getenv("API_FOOTBALL_TOKEN"):
                    providers.append(ApiFootball(ProviderHttp(client, 6.1), token))
                providers.append(OpenFootball(ProviderHttp(client, 1)))
                interval = max(3600, int(os.getenv("SYNC_INTERVAL_SECONDS", "14400")))
                app.state.service = FixtureService(PostgresStore(dsn) if dsn else MemoryStore(),
                                                   providers, interval)
            else:
                app.state.service = service
            await app.state.service.store.initialize()
            if app.state.simulation_cache is not None:
                try:
                    await app.state.simulation_cache.initialize()
                except (OSError, sqlite3.Error, psycopg.Error):
                    logger.warning("event=simulation_cache_unavailable stage=initialize")
                    app.state.simulation_cache = None
            task = asyncio.create_task(app.state.service.run()) if synchronize else None
            try:
                yield
            finally:
                if task:
                    task.cancel()
                    with suppress(asyncio.CancelledError):
                        await task

    app = FastAPI(title="MatchIQ AZ", lifespan=lifespan)

    @app.get("/healthz")
    async def health():
        return {"status": "ok"}

    @app.get("/v1/fixtures", response_model=Feed)
    async def fixtures(view: Literal["upcoming", "results", "today", "tomorrow"] = "upcoming"):
        now = datetime.now(UTC)
        try:
            return await app.state.service.feed(current_season(now), now, view)
        except psycopg.Error:
            raise HTTPException(503, "Məlumat bazası müvəqqəti əlçatan deyil.") from None

    @app.get("/v1/fixtures/{fixture_id}", response_model=FixtureDetail)
    async def fixture_detail(fixture_id: str):
        now = datetime.now(UTC)
        try:
            snapshots = await app.state.service.store.load(current_season(now))
        except psycopg.Error:
            raise HTTPException(503, "Məlumat bazası müvəqqəti əlçatan deyil.") from None
        for snapshot in snapshots.values():
            fixture = next((match for match in snapshot.matches if match.id == fixture_id), None)
            if fixture is not None:
                return build_fixture_detail(snapshot, fixture, now)
        raise HTTPException(404, "Oyun tapılmadı.")

    @app.get("/v1/simulations/{fixture_id}", response_model=Simulation)
    async def simulation(fixture_id: str, trials: int = Query(100_000, ge=1, le=MAX_TRIALS)):
        now = datetime.now(UTC)
        try:
            snapshots = await app.state.service.store.load(current_season(now))
        except psycopg.Error:
            raise HTTPException(503, "Məlumat bazası müvəqqəti əlçatan deyil.") from None
        for snapshot in snapshots.values():
            fixture = next((match for match in snapshot.matches
                            if match.id == fixture_id and is_upcoming(match, now)), None)
            if fixture is None:
                continue
            try:
                rates = estimate(snapshot, fixture, now, now.astimezone(BAKU).date())
            except InsufficientResults:
                raise HTTPException(409, "Bu oyun üçün kifayət qədər real nəticə yoxdur.") from None
            key = simulation_cache_key(fixture, rates, trials)

            def calculate():
                return sample(fixture.id, *rates, trials, cache_revision=key)

            cache = app.state.simulation_cache
            if cache is not None:
                try:
                    return await cache.get_or_create(key, calculate)
                except (sqlite3.Error, psycopg.Error):
                    logger.warning("event=simulation_cache_unavailable stage=request")
            return await asyncio.to_thread(calculate)
        raise HTTPException(404, "Qarşıdakı oyun tapılmadı.")

    @app.get("/v1/evaluation", response_model=Evaluation)
    async def evaluation():
        now = datetime.now(UTC)
        season = current_season(now)
        try:
            snapshots = await app.state.service.store.load(season)
        except psycopg.Error:
            raise HTTPException(503, "Məlumat bazası müvəqqəti əlçatan deyil.") from None
        return await asyncio.to_thread(summarize, list(snapshots.values()), now.astimezone(BAKU).date(), season)

    @app.get("/v1/prediction-history", response_model=LiveHistory)
    async def prediction_history():
        try:
            rows = await app.state.service.store.load_predictions()
        except psycopg.Error:
            raise HTTPException(503, "Prediction history is temporarily unavailable.") from None
        return await run_in_threadpool(history, rows)

    @app.get("/v1/ai-forecast/{fixture_id}", response_model=LearnedForecast | None)
    async def ai_forecast(fixture_id: str):
        now = datetime.now(UTC)
        try:
            snapshots = await app.state.service.store.load(current_season(now))
        except psycopg.Error:
            raise HTTPException(503, "Məlumat bazası müvəqqəti əlçatan deyil.") from None
        for snapshot in snapshots.values():
            fixture = next((match for match in snapshot.matches
                            if match.id == fixture_id and is_upcoming(match, now)), None)
            if fixture is not None:
                try:
                    archived = await app.state.service.store.load_predictions()
                    return await run_in_threadpool(learned_forecast, snapshots, snapshot, fixture, now, archived)
                except psycopg.Error:
                    raise HTTPException(503, "Forecast is temporarily unavailable.") from None
                except InsufficientResults:
                    return None
        raise HTTPException(404, "Qarşıdakı oyun tapılmadı.")

    @app.get("/v1/season-forecast/{competition}")
    async def season_forecast(competition: str, matchday: int = Query(0, ge=0, le=38),
                              trials: int | None = Query(None, ge=1, le=MAX_TRIALS)):
        if competition not in TEAM_COUNTS:
            raise HTTPException(404, "Turnir tapılmadı.")
        now = datetime.now(UTC)
        try:
            snapshots = await app.state.service.store.load(current_season(now))
        except psycopg.Error:
            raise HTTPException(503, "Məlumat bazası müvəqqəti əlçatan deyil.") from None
        snapshot = snapshots.get(competition)
        if snapshot is None:
            pending = competition in app.state.service.pending_competitions
            return {"status": "syncing" if pending else "calendar_unavailable", "matchdays": []}
        async with app.state.season_slot:
            return await run_in_threadpool(forecast_at, snapshot, matchday, now, trials)

    @app.get("/v1/team-stats", response_model=Statistics)
    async def team_stats():
        now = datetime.now(UTC)
        try:
            feed = await app.state.service.feed(current_season(now), now, "results")
        except psycopg.Error:
            raise HTTPException(503, "Məlumat bazası müvəqqəti əlçatan deyil.") from None
        return summarize_teams(feed)

    return app


app = create_app()
