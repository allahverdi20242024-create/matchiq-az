import asyncio
import logging
from datetime import UTC, datetime, timedelta

import psycopg

from .domain import CompetitionFeed, Feed
from .providers import BAKU, COMPETITIONS, ProviderError

logger = logging.getLogger("uvicorn.error")
STALE_AFTER = timedelta(hours=8)


def current_season(now):
    local = now.astimezone(BAKU)
    return local.year if local.month >= 7 else local.year - 1


def is_upcoming(match, now):
    if match.status == "scheduled" and match.kickoff is not None:
        return match.kickoff > now
    return match.status == "date_only" and match.date > now.astimezone(BAKU).date()


class FixtureService:
    def __init__(self, store, providers, interval):
        self.store = store
        self.providers = providers
        self.interval = interval
        self.pending_competitions: set[str] = set()

    async def sync(self, season):
        eligible = {
            competition.code for competition in COMPETITIONS
            if any(provider.supports(competition) for provider in self.providers)
        }
        self.pending_competitions = eligible
        try:
            await self.sync_competitions(season)
        finally:
            self.pending_competitions.clear()

    async def sync_competitions(self, season):
        snapshots = await self.store.load(season)
        now = datetime.now(UTC)
        for competition in COMPETITIONS:
            await self.sync_competition(competition, snapshots, season, now)
            self.pending_competitions.discard(competition.code)

    async def sync_competition(self, competition, snapshots, season, now):
        previous = snapshots.get(competition.code)
        if previous and now - previous.fetched_at < timedelta(seconds=self.interval):
            return
        for provider in self.providers:
            if not provider.supports(competition):
                continue
            try:
                result = await provider.fetch(competition, season)
                if not result.matches:
                    raise ProviderError("empty_season")
            except (ProviderError, KeyError, TypeError, ValueError, AttributeError) as exc:
                reason = str(exc) if isinstance(exc, ProviderError) else "invalid_match_data"
                logger.warning("event=fixture_sync_failed competition=%s source=%s reason=%s",
                               competition.code, provider.name, reason)
                continue
            await self.store.save(result)
            logger.info("event=fixture_sync_success competition=%s source=%s matches=%d",
                        competition.code, provider.name, len(result.matches))
            break

    async def run(self):
        while True:
            try:
                await self.sync(current_season(datetime.now(UTC)))
            except psycopg.Error:
                logger.error("event=fixture_storage_failed")
            await asyncio.sleep(self.interval)

    async def feed(self, season, now, view):
        snapshots = await self.store.load(season)
        competitions = []
        unavailable = []
        syncing = []
        today = now.astimezone(BAKU).date()
        for competition in COMPETITIONS:
            item = snapshots.get(competition.code)
            if item is None:
                (syncing if competition.code in self.pending_competitions else unavailable).append(competition.code)
                continue
            if view == "upcoming":
                matches = [match for match in item.matches if is_upcoming(match, now)]
            elif view in {"today", "tomorrow"}:
                day = today + timedelta(days=int(view == "tomorrow"))
                matches = [match for match in item.matches if match.date == day]
            else:
                matches = [match for match in item.matches if match.status == "finished" and
                           (match.kickoff < now if match.kickoff else match.date < today)]
            matches.sort(key=lambda match: (match.date, match.kickoff or datetime.max.replace(tzinfo=UTC), match.id),
                         reverse=view == "results")
            competitions.append(CompetitionFeed(competition=item.competition, source=item.source,
                                                source_url=item.source_url, fetched_at=item.fetched_at,
                                                stale=now - item.fetched_at >= STALE_AFTER, matches=matches,
                                                standings=item.standings if view == "results" else None))
        return Feed(generated_at=now, season=season, unavailable=unavailable, syncing=syncing, competitions=competitions)
