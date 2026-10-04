import assert from "node:assert/strict";
import test from "node:test";

import {
  EARLY_ADOPTER_ANNOUNCEMENT_ID,
  EARLY_ADOPTER_BROADCAST_BODY,
  EARLY_ADOPTER_BROADCAST_TITLE,
} from "@/features/notifications/logic/announcements";
import {
  profileEngagement,
  profilePreferences,
  profileSeenAnnouncements,
  usagePreferencesJsonWithEngagement,
  usagePreferencesJsonWithPreferences,
  usagePreferencesJsonWithSeenAnnouncement,
} from "@/domain/profile-metadata";
import { emptyAppEngagement } from "@/features/engagement/logic/app-engagement";

test("the one-time push title matches the approved copy exactly", () => {
  assert.equal(EARLY_ADOPTER_BROADCAST_TITLE, "HAY ACTUALIZACIONES IMPORTANTES.");
  assert.equal(EARLY_ADOPTER_BROADCAST_BODY, "");
});

test("marking an announcement seen preserves preferences, streaks, and unrelated metadata", () => {
  const start = JSON.stringify({
    preferences: ["weekly", "quick"],
    avoraEngagement: { ...emptyAppEngagement(), totalUseDays: 23, currentStreak: 6, bestStreak: 9 },
    anotherFeature: { enabled: true },
  });
  const seen = usagePreferencesJsonWithSeenAnnouncement(start, EARLY_ADOPTER_ANNOUNCEMENT_ID);
  assert.deepEqual(profileSeenAnnouncements(seen), [EARLY_ADOPTER_ANNOUNCEMENT_ID]);
  assert.deepEqual(profilePreferences(seen), ["weekly", "quick"]);
  assert.equal(profileEngagement(seen).bestStreak, 9);
  assert.deepEqual(JSON.parse(seen).anotherFeature, { enabled: true });

  const changedPreferences = usagePreferencesJsonWithPreferences(seen, ["quick"]);
  assert.deepEqual(profileSeenAnnouncements(changedPreferences), [EARLY_ADOPTER_ANNOUNCEMENT_ID]);
  assert.equal(profileEngagement(changedPreferences).totalUseDays, 23);

  const changedStreak = usagePreferencesJsonWithEngagement(changedPreferences, { ...emptyAppEngagement(), totalUseDays: 24 });
  assert.deepEqual(profileSeenAnnouncements(changedStreak), [EARLY_ADOPTER_ANNOUNCEMENT_ID]);
  assert.deepEqual(JSON.parse(changedStreak).anotherFeature, { enabled: true });
});

test("marking an announcement seen upgrades legacy preferences without losing them", () => {
  const seen = usagePreferencesJsonWithSeenAnnouncement(JSON.stringify(["weekly"]), EARLY_ADOPTER_ANNOUNCEMENT_ID);
  assert.deepEqual(profilePreferences(seen), ["weekly"]);
  assert.deepEqual(profileSeenAnnouncements(seen), [EARLY_ADOPTER_ANNOUNCEMENT_ID]);
});
