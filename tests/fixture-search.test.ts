import assert from "node:assert/strict";
import { test } from "node:test";
import { filterFixtureGroups } from "../src/lib/fixture-search.ts";

const groups = [
  { code: "PD", label: "La Liqa", choices: [
    { id: "barca", home: "FC Barcelona", away: "Real Madrid CF" },
    { id: "atleti", home: "Club Atlético de Madrid", away: "Valencia CF" },
  ] },
  { code: "CL", label: "UEFA Çempionlar Liqası", choices: [
    { id: "bodo", home: "FK Bodø/Glimt", away: "Fenerbahçe SK" },
  ] },
];

test("match search handles partial names, aliases, spacing and accents", () => {
  const ids = (query: string) => filterFixtureGroups(groups, query).flatMap(({ choices }) => choices.map(({ id }) => id));
  assert.deepEqual(ids("L"), ["barca", "atleti", "bodo"]);
  assert.deepEqual(ids("Laliga"), ["barca", "atleti"]);
  assert.deepEqual(ids("La Liqa"), ["barca", "atleti"]);
  assert.deepEqual(ids("Atl"), ["atleti"]);
  assert.deepEqual(ids("Atletico Valencia"), ["atleti"]);
  assert.deepEqual(ids("RealMadrid"), ["barca"]);
  assert.deepEqual(ids("Bodo"), ["bodo"]);
  assert.deepEqual(ids("Fenerbahce"), ["bodo"]);
  assert.deepEqual(ids("UCL"), ["bodo"]);
  assert.deepEqual(ids("no match"), []);
  assert.deepEqual(ids(""), ["barca", "atleti", "bodo"]);
});
