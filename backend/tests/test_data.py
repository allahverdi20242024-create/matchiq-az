import asyncio
from datetime import UTC, datetime, timedelta

import httpx
from fastapi.testclient import TestClient

from matchiq.main import create_app
from matchiq.providers import ApiFootball, COMPETITIONS, FootballData, OpenFootball, ProviderHttp
from matchiq.service import FixtureService, current_season
from matchiq.storage import MemoryStore

PL = COMPETITIONS[1]
AZ = COMPETITIONS[0]

# Synthetic provider-shaped records for tests only.
OPEN_FIXTURES = {"matches": [
    {"round": "Matchday 1", "date": "2026-08-21", "time": "20:00", "team1": "Arsenal FC",
     "team2": "Coventry City FC", "score": {"ft": [3, 0]}},
    {"round": "Matchday 2", "date": "2026-08-28", "team1": "Coventry City FC", "team2": "Arsenal FC"},
]}


def test_openfootball_preserves_unqualified_dates_without_inventing_timestamps():
    async def run():
        transport = httpx.MockTransport(lambda request: httpx.Response(200, json=OPEN_FIXTURES))
        async with httpx.AsyncClient(transport=transport) as client:
            result = await OpenFootball(ProviderHttp(client, 0)).fetch(PL, 2026)
        finished, upcoming = result.matches
        assert finished.score == (3, 0)
        assert upcoming.status == "date_only"
        assert upcoming.kickoff is None
        assert finished.away.id == upcoming.home.id
    asyncio.run(run())


def test_authenticated_provider_normalizes_kickoff_in_baku():
    def handler(request):
        assert request.headers["X-Auth-Token"] == "test-key"
        assert request.url.params["season"] == "2026"
        return httpx.Response(200, json={"matches": [{
            "id": 42, "utcDate": "2026-08-21T21:00:00Z", "status": "TIMED",
            "homeTeam": {"id": 1, "name": "Home"}, "awayTeam": {"id": 2, "name": "Away"},
        }]})

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            result = await FootballData(ProviderHttp(client, 0), "test-key").fetch(PL, 2026)
        assert result.matches[0].date.isoformat() == "2026-08-22"
        assert result.matches[0].status == "scheduled"
    asyncio.run(run())


def test_azerbaijan_uses_entitlement_and_fixtures_responses():
    requests = []

    def handler(request):
        requests.append(request.url.path)
        assert request.headers["x-apisports-key"] == "test-key"
        if request.url.path == "/leagues":
            assert request.url.params["country"] == "Azerbaijan"
            return httpx.Response(200, json={"errors": [], "response": [
                {"league": {"id": 99}, "seasons": [{"year": 2026}]},
            ]})
        assert request.url.params["league"] == "99"
        return httpx.Response(200, json={"errors": [], "paging": {"total": 1}, "response": [{
            "fixture": {"id": 8, "date": "2026-11-21T16:00:00+00:00", "status": {"short": "NS"}},
            "teams": {"home": {"id": 1, "name": "Home"}, "away": {"id": 2, "name": "Away"}},
        }]})

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            result = await ApiFootball(ProviderHttp(client, 0), "test-key").fetch(AZ, 2026)
        assert result.matches[0].competition == "AZ"
    asyncio.run(run())
    assert requests == ["/leagues", "/fixtures"]


def test_fallback_cache_freshness_and_failed_refresh():
    requests = []
    offline = False

    def handler(request):
        requests.append((request.url.host, request.url.path))
        if offline or request.url.host == "api.football-data.org":
            return httpx.Response(429, headers={"Retry-After": "0"})
        if request.url.path.endswith("en.1.json"):
            return httpx.Response(200, json=OPEN_FIXTURES)
        return httpx.Response(404)

    async def run():
        nonlocal offline
        store = MemoryStore()
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            service = FixtureService(store, [FootballData(ProviderHttp(client, 0), "test-key"),
                                             OpenFootball(ProviderHttp(client, 0))], 3600)
            await service.sync(2026)
            saved = (await store.load(2026))["PL"]
            assert saved.source == "OpenFootball"
            assert [host for host, _ in requests[:2]] == ["api.football-data.org", "raw.githubusercontent.com"]
            requests.clear()
            await service.sync(2026)
            assert not any("/PL/" in path or path.endswith("/en.1.json") for _, path in requests)
            saved = saved.model_copy(update={"fetched_at": datetime.now(UTC) - timedelta(hours=9)})
            await store.save(saved)
            offline = True
            await service.sync(2026)
            assert (await store.load(2026))["PL"] == saved
            results = await service.feed(2026, datetime(2026, 9, 1, tzinfo=UTC), "results")
            assert results.competitions[0].matches[0].score == (3, 0)
            assert "AZ" in results.unavailable
            stale = await service.feed(2026, datetime.now(UTC), "upcoming")
            assert stale.competitions[0].stale

    asyncio.run(run())


def test_empty_api_and_bad_query():
    service = FixtureService(MemoryStore(), [], 3600)
    with TestClient(create_app(service=service, synchronize=False)) as client:
        assert client.get("/healthz").json() == {"status": "ok"}
        response = client.get("/v1/fixtures")
        assert response.status_code == 200
        assert response.json()["competitions"] == []
        assert "AZ" in response.json()["unavailable"]
        assert client.get("/v1/fixtures?view=demo").status_code == 422


def test_season_rollover_uses_baku_clock():
    assert current_season(datetime(2026, 6, 30, 19, 59, tzinfo=UTC)) == 2025
    assert current_season(datetime(2026, 6, 30, 20, 0, tzinfo=UTC)) == 2026


def test_today_and_tomorrow_include_date_only_matches_across_baku_midnight():
    from datetime import date

    from matchiq.domain import Match, Snapshot, Team

    async def run():
        now = datetime(2026, 11, 19, 21, tzinfo=UTC)
        home = Team(id="home", name="Home")
        away = Team(id="away", name="Away")
        fixtures = [Match(id=str(day), competition="PL", home=home, away=away,
                          date=date(2026, 11, day), status="date_only", source="OpenFootball")
                    for day in (19, 20, 21)]
        store = MemoryStore()
        await store.save(Snapshot(competition="PL", season=2026, source="OpenFootball",
                                  source_url="https://example.com", fetched_at=now, matches=fixtures))
        service = FixtureService(store, [], 3600)
        for period, expected in (("today", "20"), ("tomorrow", "21"), ("upcoming", "21")):
            feed = await service.feed(2026, now, period)
            assert [fixture.id for fixture in feed.competitions[0].matches] == [expected]

    asyncio.run(run())
