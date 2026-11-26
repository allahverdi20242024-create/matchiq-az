import { strict as assert } from "node:assert";
import { test } from "node:test";
import { bakuDate, fixtures, getFixtures, kickoff, teams } from "../src/lib/demo.ts";

test("period routes receive the intended demonstration fixtures", () => {
  assert.deepEqual(getFixtures("bu-gun").map(({ day }) => day), [0, 0]);
  assert.deepEqual(getFixtures("sabah").map(({ day }) => day), [1]);
  assert.deepEqual(getFixtures("gelecek").map(({ day }) => day), [1, 3]);
});

test("fixtures use Baku calendar dates when UTC is still on the previous date", () => {
  const now = new Date("2026-12-31T21:00:00Z");
  assert.equal(bakuDate(now).toISOString().slice(0, 10), "2027-01-01");
  assert.equal(kickoff(fixtures[0], now).toISOString(), "2027-01-01T16:00:00.000Z");
});

test("sample presentation values are bounded and links reference known teams", () => {
  assert.equal(new Set(fixtures.map(({ id }) => id)).size, fixtures.length);
  for (const fixture of fixtures) {
    assert.equal(fixture.outcome.reduce<number>((sum, probability) => sum + probability, 0), 100);
    for (const value of [...fixture.outcome, ...fixture.over, fixture.btts, ...fixture.scores.map(([, value]) => value)]) {
      assert.ok(value >= 0 && value <= 100);
    }
    assert.equal(fixture.scores.length, 5);
    assert.ok(teams.includes(fixture.home) && teams.includes(fixture.away));
  }
  for (const team of teams) {
    assert.deepEqual(["Q", "H", "M"].map((result) => team.form.filter((entry) => entry === result).length), [...team.record]);
  }
});
