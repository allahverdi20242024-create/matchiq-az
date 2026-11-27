"""Sport Eden Elo ratings (CC BY 4.0), https://sporteden.com/rankings/elo/football/download."""
import asyncio
import csv
import logging
import re
import unicodedata
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from time import monotonic

import httpx

from .domain import Snapshot

SOURCE_URL = "https://sporteden.com/rankings/elo/football/download"
HISTORY_URL = "https://api.sporteden.com/v1/sport/common/elo/football/download/history/"
logger = logging.getLogger("uvicorn.error")

ALIASES = {
    "Club Atlético de Madrid": "Atlético Madrid",
    "Feyenoord Rotterdam": "Feyenoord",
    "Lille OSC": "Lille",
    "PAE AEK": "AEK Athens",
    "Racing Club de Lens": "Lens",
    "Real Betis Balompié": "Real Betis",
    "Sporting Clube de Portugal": "Sporting CP",
}

# Verified against the provider's club name and country where normalized names
# are ambiguous or differ from the football-data.org labels.
CLUB_IDS = {
    "Arsenal FC": "10094", "Aston Villa FC": "10117", "Brighton & Hove Albion FC": "10102",
    "Coventry City FC": "10143", "Ipswich Town FC": "10108", "Leeds United FC": "10114",
    "Newcastle United FC": "10086", "Tottenham Hotspur FC": "10098",
    "Athletic Club": "21984", "CA Osasuna": "22019", "Deportivo Alavés": "21995",
    "Levante UD": "21992", "RC Celta de Vigo": "21991", "RC Deportivo La Coruña": "21997",
    "RCD Espanyol de Barcelona": "21993", "Rayo Vallecano de Madrid": "22020",
    "Real Racing Club de Santander": "22052", "Real Sociedad de Fútbol": "22001",
    "ACF Fiorentina": "7111", "Atalanta BC": "7108", "Bologna FC 1909": "7109",
    "Cagliari Calcio": "7099", "Como 1907": "7175", "FC Internazionale Milano": "7114",
    "Frosinone Calcio": "7121", "Genoa CFC": "7104", "Juventus FC": "7105",
    "Parma Calcio 1913": "7132", "SS Lazio": "7096", "US Lecce": "7147",
    "US Sassuolo Calcio": "7097", "Udinese Calcio": "7103",
    "1. FC Köln": "12284", "1. FC Union Berlin": "12274", "1. FSV Mainz 05": "12256",
    "Bayer 04 Leverkusen": "12260", "SV 07 Elversberg": "12352",
    "SV Werder Bremen": "12254", "TSG 1899 Hoffenheim": "12259",
    "AJ Auxerre": "17624", "Angers SCO": "17594", "ES Troyes AC": "17626",
    "OGC Nice": "17601", "Olympique Lyonnais": "17597", "Olympique de Marseille": "17598",
    "RC Strasbourg Alsace": "17611", "Stade Rennais FC 1901": "17610",
    "FC Porto": "8039", "PSV": "11965", "Sabah FK": "25816",
}


def normalize(name):
    text = unicodedata.normalize("NFKD", name.casefold().replace("ø", "o").replace("ł", "l"))
    words = re.findall(r"[a-z0-9]+", "".join(ch for ch in text if not unicodedata.combining(ch)))
    return "".join(word for word in words if word not in {"fc", "cf", "fk", "sk", "ssc", "vfb", "kv", "afc", "ac", "as"})


def read_history(lines):
    identities = defaultdict(set)
    histories = defaultdict(dict)
    for row in csv.DictReader(line for line in lines if not line.startswith("#") and line.strip()):
        identity = row["team_id"]
        rating = float(row["elo"])
        if not identity or not 0 < rating < 4000:
            continue
        identities[normalize(row["team"])].add(identity)
        histories[identity][date.fromisoformat(row["date"])] = rating
    return identities, histories



def map_clubs(clubs, identities, histories):
    candidates = {team: {CLUB_IDS[name]} if name in CLUB_IDS else
                  identities.get(normalize(ALIASES.get(name, name)), set())
                  for team, name in clubs.items()}
    mapped = {team: identity for team, ids in candidates.items() if len(ids) == 1
              for identity in ids if identity in histories}
    reverse = defaultdict(list)
    for team, identity in mapped.items():
        reverse[identity].append(team)
    return {team: identity for team, identity in mapped.items() if len(reverse[identity]) == 1}


def ratings_before(mapped, histories, cutoff):
    oldest = cutoff - timedelta(days=62)
    ratings = {}
    for team, identity in mapped.items():
        prior = [(day, rating) for day, rating in histories.get(identity, {}).items()
                 if oldest <= day < cutoff]
        if prior:
            ratings[team] = max(prior)[1]
    return ratings


def bundled_history(year):
    path = Path(__file__).with_name("data") / f"sport-eden-{year}.csv"
    if not path.is_file():
        return {}, {}
    with path.open(encoding="utf-8-sig", newline="") as lines:
        return read_history(lines)


class SportEden:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client
        self.cached = {}
        self.lock = asyncio.Lock()

    async def history(self, year):
        async with self.lock:
            now = monotonic()
            expires, previous = self.cached.get(year, (0, None))
            if now < expires:
                return previous
            try:
                response = await self.client.get(
                    f"{HISTORY_URL}{year}.csv", params={"type": "normal"}, timeout=5,
                    headers={"Accept": "text/csv", "User-Agent": "MatchIQ-AZ/1.0 (+https://matchiq-az.vercel.app/)"},
                )
                response.raise_for_status()
                if len(response.content) > 20_000_000:
                    raise ValueError("Unexpected Elo file size")
                parsed = await asyncio.to_thread(read_history, response.content.decode("utf-8-sig").splitlines())
                if not parsed[1]:
                    raise ValueError("Empty Elo file")
            except (httpx.HTTPError, KeyError, TypeError, ValueError):
                logger.warning("event=sport_eden_elo_unavailable year=%s", year)
                if previous is None:
                    previous = await asyncio.to_thread(bundled_history, year)
                self.cached[year] = (now + 900, previous)
                return previous
            self.cached[year] = (now + 6 * 3600, parsed)
            return parsed

    async def ratings(self, snapshot: Snapshot, cutoff: date) -> dict[str, float]:
        # Before the first month-end of the year the previous year holds the latest rating.
        year = (cutoff - timedelta(days=cutoff.day)).year
        identities, histories = await self.history(year)
        clubs = {team.id: team.name for match in snapshot.matches for team in (match.home, match.away)}
        return ratings_before(map_clubs(clubs, identities, histories), histories, cutoff)
