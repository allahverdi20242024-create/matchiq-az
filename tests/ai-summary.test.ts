import assert from "node:assert/strict";
import { test } from "node:test";
import { aiSummary } from "../src/lib/ai-summary.ts";

test("AI summary identifies only the outcome supported by its probabilities", () => {
  assert.match(aiSummary([0.2, 0.2, 0.6], "Home Club", "Away Club", "az-AZ"), /Away Club komandasını favorit/);
  assert.match(aiSummary([0.3, 0.5, 0.2], "Home Club", "Away Club", "en"), /A draw is the most likely outcome/);
  assert.match(aiSummary([0.38, 0.35, 0.27], "Home Club", "Away Club", "az-AZ"), /bir-birinə yaxındır/);
});
