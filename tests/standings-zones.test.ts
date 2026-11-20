import assert from "node:assert/strict";
import { test } from "node:test";
import { standingsRules, standingsZone } from "../src/lib/standings-zones.ts";

test("2026/27 league positions show the correct baseline zones", () => {
  for (const [code, teams] of [["PL", 20], ["PD", 20], ["SA", 20], ["BL1", 18], ["FL1", 18]] as const) {
    const rules = standingsRules(code, 2026, teams);
    assert.ok(rules);
    assert.equal(standingsZone(rules, 4, false), code === "FL1" ? "championsQualifying" : "championsLeague");
    assert.equal(standingsZone(rules, 5, false), "europaLeague");
    assert.equal(standingsZone(rules, 6, false), "conferenceLeague");
    assert.equal(standingsZone(rules, 7, false), null);
    assert.equal(standingsZone(rules, teams - 2, false), teams === 18 ? "relegationPlayoff" : "relegationZone");
    assert.equal(standingsZone(rules, teams - 1, false), "relegationZone");
    assert.equal(standingsZone(rules, teams, false), "relegationZone");
  }
  const italy = standingsRules("SA", 2026, 20);
  assert.ok(italy);
  assert.equal(standingsZone(italy, 17, true), "relegationPlayoff");
  assert.equal(standingsZone(italy, 18, true), "relegationPlayoff");
  assert.equal(standingsRules("CL", 2026, 36), null);
  assert.equal(standingsRules("PL", 2027, 20), null);
  assert.equal(standingsRules("PL", 2026, 19), null);
});
