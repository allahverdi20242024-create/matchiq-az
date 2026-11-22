import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isDashboardUpcoming } from "../src/lib/fixture-date.ts";

test("dashboard shows only future fixtures even if the provider has not recorded a score", () => {
  const today = "2026-11-22";
  const now = new Date("2026-11-22T16:00:00Z");
  const future = { date: today, kickoff: "2026-11-22T17:00:00Z", score: null };
  assert.equal(isDashboardUpcoming(future, now, today), true);
  assert.equal(isDashboardUpcoming({ ...future, kickoff: now.toISOString() }, now, today), false);
  assert.equal(isDashboardUpcoming({ ...future, kickoff: "2026-11-22T11:30:00Z" }, now, today), false);
  assert.equal(isDashboardUpcoming({ ...future, score: [0, 0] }, now, today), false);
  assert.equal(isDashboardUpcoming({ ...future, kickoff: null }, now, today), false);
  assert.equal(isDashboardUpcoming({ ...future, kickoff: null, date: "2026-11-23" }, now, today), true);
});
