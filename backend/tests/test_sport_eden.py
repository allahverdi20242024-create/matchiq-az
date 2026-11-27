from datetime import date

from matchiq.sport_eden import map_clubs, ratings_before, read_history


def test_external_elo_uses_provider_id_and_excludes_future_or_same_day_values():
    identities, histories = read_history([
        "# Sport Eden Elo",
        "date,team_id,team,elo",
        "2026-09-30,10094,Arsenal,2000",
        "2026-10-31,10094,Arsenal,2020",
        "2026-09-30,123,Arsenal,1500",
        "2026-09-30,124,Bodo/Glimt,1840",
    ])
    mapped = map_clubs({"a": "Arsenal FC", "b": "FK Bodø/Glimt"}, identities, histories)
    assert mapped == {"a": "10094", "b": "124"}
    assert ratings_before(mapped, histories, date(2026, 10, 31)) == {"a": 2000, "b": 1840}
    assert ratings_before(mapped, histories, date(2027, 2, 1)) == {}
