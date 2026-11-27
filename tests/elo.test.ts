import assert from "node:assert/strict";
import { test } from "node:test";
import { rankClubs } from "../src/lib/elo.ts";
import type { RealMatch } from "../src/lib/real-fixtures.ts";

test("Elo ranks completed results chronologically and ignores upcoming fixtures", () => {
  const home = { id: "a", name: "Club A" };
  const away = { id: "b", name: "Club B" };
  const matches: RealMatch[] = [3, 1, 2, 4].map(day => ({
    id: String(day), competition: "CL", home, away, date: `2026-09-0${day}`,
    kickoff: null, score: day === 4 ? null : [2, 0],
  }));
  const rows = rankClubs(matches);
  assert.deepEqual(rows, rankClubs([...matches].reverse()));
  assert.equal(rows[0].id, home.id);
  assert.equal(rows[0].played, 3);
  assert.ok(rows[0].rating > 1500);
  assert.ok(rows[1].rating < 1500);
});
