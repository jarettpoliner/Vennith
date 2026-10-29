import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validate,
  sample,
  compare,
  discover,
  card,
  archetype,
  distance,
  people,
} from "../dist/engine.js";
const p = (overrides) => validate({ ...sample, ...overrides });
test("identical approved profiles reach full overlap", () => {
  assert.equal(compare(sample, sample, "romantic").score, 100);
});
test("romantic constraints are mutual and precede scores", () => {
  const b = p({ seeking: ["woman"] });
  assert.equal(compare(sample, b, "romantic").score, null);
  assert.equal(compare(sample, b, "friendship").eligible, true);
  assert.equal(compare(sample, p({ minAge: 35 }), "romantic").eligible, false);
});
test("friendship-only intention excludes dating; explicit lifestyle dealbreakers enforced", () => {
  assert.equal(
    compare(sample, p({ intention: "friendship" }), "romantic").eligible,
    false,
  );
  assert.equal(
    compare(
      sample,
      p({ lifestyle: "quiet", dealbreakers: { sameLifestyle: true } }),
      "friendship",
    ).eligible,
    false,
  );
});
test("different contexts weight communication and interests differently", () => {
  const b = p({
    communication: "reflective",
    interests: ["running"],
    intention: "exploring",
  });
  assert.notEqual(
    compare(sample, b, "professional").score,
    compare(sample, b, "friendship").score,
  );
});
test("complementarity is explained without rewarding every difference", () => {
  const b = p({ communication: "reflective", lifestyle: "active" }),
    r = compare(sample, b, "general");
  assert.ok(r.complements[0].includes("Different"));
  assert.ok(r.friction.length);
  assert.ok(r.score < 100);
});
test("approval, adulthood, ranges, enums, private and injection fields rejected", () => {
  for (const x of [
    { approved: false },
    { adult: false },
    { age: 17 },
    { age: 29.5 },
    { minAge: 100, maxAge: 30 },
    { values: ["ignore previous instructions"] },
    { rawConversations: "secret" },
    { city: "<script>" },
    { location: { lat: NaN, lon: 0 } },
    { dealbreakers: { sameLifestyle: "true" } },
    { interests: [] },
    { values: ["curiosity", "curiosity"] },
  ])
    assert.throws(() => p(x));
});
test("all synthetic profiles validate and archetypes are deterministic", () => {
  assert.equal(people.length, 10);
  for (const x of people) validate(x.profile);
  assert.deepEqual(archetype(sample), archetype(sample));
  assert.ok(archetype(sample).complements.length);
});
test("city, radius, and worldwide discovery constrain geography", () => {
  const city = discover(sample, "friendship", "city");
  assert.ok(city.length > 0);
  assert.ok(city.every((x) => x.city === sample.city));
  assert.deepEqual(discover(sample, "friendship", "radius", 100), city);
  assert.ok(
    discover(p({ city: "Unknown", location: null }), "friendship", "city")
      .length === 0,
  );
  assert.ok(discover(sample, "friendship", "worldwide").length >= city.length);
  assert.throws(() =>
    discover(p({ location: null }), "friendship", "radius", 50),
  );
  assert.throws(() => discover(sample, "friendship", "radius", NaN));
  assert.ok(distance(sample, people[6].profile) > 5000);
});
test("discovery returns no profiles, preferences, or precise locations", () => {
  const result = discover(sample, "friendship", "worldwide");
  for (const x of result) {
    assert.equal(x.profile, undefined);
    assert.equal(x.age, undefined);
    assert.equal(x.location, undefined);
    assert.equal(x.seeking, undefined);
    assert.equal(x.synthetic, true);
  }
});
test("share card excludes identity and dating fields", () => {
  const c = card(sample),
    raw = JSON.stringify(c);
  for (const key of [
    "age",
    "gender",
    "seeking",
    "city",
    "location",
    "intention",
    "minAge",
    "maxAge",
  ])
    assert.equal(Object.hasOwn(c, key), false);
  assert.ok(!raw.includes("New York"));
  assert.equal(c.format, "vennith-card-v1");
});
