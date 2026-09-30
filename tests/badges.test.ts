import assert from "node:assert/strict";
import test from "node:test";

import { BADGE_DEFINITIONS, mergeBadgeIds, normalizeBadgeIds } from "../app/lib/badges";

test("reconoce solo las insignias definidas por la app", () => {
  assert.equal(BADGE_DEFINITIONS.length, 14);
  assert.deepEqual(normalizeBadgeIds(["streak-50", "unknown", "use-100", "streak-50", 5]), ["streak-50", "use-100"]);
});

test("acumula insignias publicadas sin duplicarlas", () => {
  assert.deepEqual(mergeBadgeIds(["streak-50", "use-50"], ["use-50", "score-90-20"]), ["streak-50", "use-50", "score-90-20"]);
});
