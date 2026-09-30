import assert from "node:assert/strict";
import test from "node:test";

import { BADGE_DEFINITIONS, mergeBadgeIds, normalizeBadgeIds } from "../app/lib/badges";

test("reconoce solo las insignias definidas por la app", () => {
  assert.equal(BADGE_DEFINITIONS.length, 14);
  const groups = [...new Set(BADGE_DEFINITIONS.map((badge) => badge.group))];
  for (const group of groups) {
    const badges = BADGE_DEFINITIONS.filter((badge) => badge.group === group);
    assert.equal(new Set(badges.map((badge) => badge.symbol)).size, 1, `${group} conserva un solo diseño`);
    assert.equal(new Set(badges.map((badge) => badge.tier)).size, badges.length, `${group} avanza por metales distintos`);
  }
  assert.deepEqual(BADGE_DEFINITIONS.filter((badge) => badge.group === "Rachas").map((badge) => badge.tier), ["bronze", "silver", "gold"]);
  assert.deepEqual(BADGE_DEFINITIONS.filter((badge) => badge.group === "Días de uso total").map((badge) => badge.tier), ["bronze", "silver", "gold", "platinum", "diamond"]);
  assert.deepEqual(normalizeBadgeIds(["streak-50", "unknown", "use-100", "streak-50", 5]), ["streak-50", "use-100"]);
});

test("acumula insignias publicadas sin duplicarlas", () => {
  assert.deepEqual(mergeBadgeIds(["streak-50", "use-50"], ["use-50", "score-90-20"]), ["streak-50", "use-50", "score-90-20"]);
});
