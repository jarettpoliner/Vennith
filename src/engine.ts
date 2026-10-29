export const choices = {
  values: [
    "curiosity",
    "kindness",
    "growth",
    "creativity",
    "stability",
    "adventure",
    "community",
    "independence",
  ],
  interests: [
    "art",
    "music",
    "technology",
    "reading",
    "cooking",
    "hiking",
    "running",
    "travel",
    "games",
    "gardening",
  ],
  communication: ["direct", "reflective", "expressive"],
  lifestyle: ["active", "balanced", "quiet"],
  intentions: ["long-term", "exploring", "friendship"],
  gender: ["woman", "man", "nonbinary"],
  contexts: ["romantic", "friendship", "professional", "general"],
} as const;
export type Context = (typeof choices.contexts)[number];
export type Profile = {
  approved: true;
  adult: true;
  age: number;
  gender: string;
  seeking: string[];
  minAge: number;
  maxAge: number;
  city: string;
  location: { lat: number; lon: number } | null;
  values: string[];
  interests: string[];
  communication: string;
  lifestyle: string;
  intention: string;
  dealbreakers: { sameIntention: boolean; sameLifestyle: boolean };
};
export const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "approved",
    "adult",
    "age",
    "gender",
    "seeking",
    "minAge",
    "maxAge",
    "city",
    "values",
    "interests",
    "communication",
    "lifestyle",
    "intention",
  ],
  properties: {
    approved: { const: true },
    adult: { const: true },
    age: { type: "integer", minimum: 18, maximum: 120 },
    gender: { enum: choices.gender },
    seeking: {
      type: "array",
      items: { enum: choices.gender },
      minItems: 1,
      maxItems: 3,
    },
    minAge: { type: "integer", minimum: 18, maximum: 120 },
    maxAge: { type: "integer", minimum: 18, maximum: 120 },
    city: { type: "string", minLength: 1, maxLength: 60 },
    location: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["lat", "lon"],
          properties: {
            lat: { type: "number", minimum: -90, maximum: 90 },
            lon: { type: "number", minimum: -180, maximum: 180 },
          },
        },
      ],
    },
    values: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { enum: choices.values },
    },
    interests: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: { enum: choices.interests },
    },
    communication: { enum: choices.communication },
    lifestyle: { enum: choices.lifestyle },
    intention: { enum: choices.intentions },
    dealbreakers: {
      type: "object",
      additionalProperties: false,
      properties: {
        sameIntention: { type: "boolean" },
        sameLifestyle: { type: "boolean" },
      },
    },
  },
};
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("Expected an object");
  return v as Record<string, unknown>;
};
function list(
  v: unknown,
  allowed: readonly string[],
  max = allowed.length,
): string[] {
  if (
    !Array.isArray(v) ||
    !v.length ||
    v.length > max ||
    v.some((x) => typeof x !== "string" || !allowed.includes(x)) ||
    new Set(v).size !== v.length
  )
    throw Error("Choose distinct supported attributes");
  return [...v];
}
function option(v: unknown, allowed: readonly string[]): string {
  if (typeof v !== "string" || !allowed.includes(v))
    throw Error("Unsupported preference");
  return v;
}
export function validate(input: unknown): Profile {
  const p = object(input);
  if (Object.keys(p).some((k) => !Object.keys(schema.properties).includes(k)))
    throw Error(
      "Unknown profile fields are not accepted; exclude private information",
    );
  if (p.approved !== true || p.adult !== true)
    throw Error(
      "Explicit profile approval and adult confirmation are required",
    );
  for (const k of ["age", "minAge", "maxAge"])
    if (!Number.isInteger(p[k]) || Number(p[k]) < 18 || Number(p[k]) > 120)
      throw Error("Age values must be integers from 18 to 120");
  if (Number(p.minAge) > Number(p.maxAge)) throw Error("Invalid age range");
  if (
    typeof p.city !== "string" ||
    p.city.trim().length < 1 ||
    p.city.length > 60 ||
    !/^[\p{L}\p{M} .,'-]+$/u.test(p.city)
  )
    throw Error("Enter a city name without private information");
  let location: Profile["location"] = null;
  if (p.location != null) {
    const l = object(p.location);
    if (
      Object.keys(l).some((k) => !["lat", "lon"].includes(k)) ||
      typeof l.lat !== "number" ||
      typeof l.lon !== "number" ||
      !Number.isFinite(l.lat) ||
      !Number.isFinite(l.lon) ||
      Math.abs(l.lat) > 90 ||
      Math.abs(l.lon) > 180
    )
      throw Error("Invalid coarse city coordinates");
    location = { lat: l.lat, lon: l.lon };
  }
  const d = p.dealbreakers === undefined ? {} : object(p.dealbreakers);
  if (
    Object.keys(d).some(
      (k) => !["sameIntention", "sameLifestyle"].includes(k),
    ) ||
    Object.values(d).some((v) => typeof v !== "boolean")
  )
    throw Error("Invalid dealbreakers");
  return {
    approved: true,
    adult: true,
    age: Number(p.age),
    minAge: Number(p.minAge),
    maxAge: Number(p.maxAge),
    gender: option(p.gender, choices.gender),
    seeking: list(p.seeking, choices.gender),
    city: p.city.trim(),
    location,
    values: list(p.values, choices.values),
    interests: list(p.interests, choices.interests),
    communication: option(p.communication, choices.communication),
    lifestyle: option(p.lifestyle, choices.lifestyle),
    intention: option(p.intention, choices.intentions),
    dealbreakers: {
      sameIntention: d.sameIntention === true,
      sameLifestyle: d.sameLifestyle === true,
    },
  };
}
export function context(v: unknown): Context {
  return option(v, choices.contexts) as Context;
}
const common = (a: string[], b: string[]) => a.filter((v) => b.includes(v));
const overlap = (a: string[], b: string[]) =>
  Math.round((100 * common(a, b).length) / Math.max(a.length, b.length));
export function archetype(p: Profile) {
  const types = [
    {
      name: "The Pathfinder",
      symbol: "↗",
      keys: ["adventure", "independence"],
      description: "You make room for possibility and self-direction.",
      complements: ["The Hearthkeeper", "The Maker"],
    },
    {
      name: "The Hearthkeeper",
      symbol: "☀",
      keys: ["kindness", "community", "stability"],
      description:
        "You bring care, belonging, and steadiness to your connections.",
      complements: ["The Pathfinder", "The Luminary"],
    },
    {
      name: "The Maker",
      symbol: "✳",
      keys: ["creativity", "growth"],
      description: "You turn imagination into things you can share.",
      complements: ["The Hearthkeeper", "The Luminary"],
    },
    {
      name: "The Luminary",
      symbol: "✧",
      keys: ["curiosity"],
      description: "You connect through questions, ideas, and discovery.",
      complements: ["The Maker", "The Pathfinder"],
    },
  ];
  const t = [...types].sort(
    (a, b) => common(p.values, b.keys).length - common(p.values, a.keys).length,
  )[0];
  return {
    ...t,
    keys: undefined,
    values: p.values,
    communication: `${p.communication} communication`,
    lifestyle: `${p.lifestyle} social pace`,
    disclaimer:
      "An original, playful Vennith interpretation, not a psychological assessment.",
  };
}
export function distance(a: Profile, b: Profile) {
  if (!a.location || !b.location) return null;
  const rad = (n: number) => (n * Math.PI) / 180;
  const x =
    Math.sin(rad(b.location.lat - a.location.lat) / 2) ** 2 +
    Math.cos(rad(a.location.lat)) *
      Math.cos(rad(b.location.lat)) *
      Math.sin(rad(b.location.lon - a.location.lon) / 2) ** 2;
  return Math.round(
    6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x))),
  );
}
export function constraints(a: Profile, b: Profile, c: Context): string[] {
  const r: string[] = [];
  if (c === "romantic") {
    if (!a.seeking.includes(b.gender) || !b.seeking.includes(a.gender))
      r.push("Mutual gender preferences do not align");
    if (
      b.age < a.minAge ||
      b.age > a.maxAge ||
      a.age < b.minAge ||
      a.age > b.maxAge
    )
      r.push("Mutual adult age preferences do not align");
    if (a.intention === "friendship" || b.intention === "friendship")
      r.push("A profile is seeking friendship only");
    if (
      (a.dealbreakers.sameIntention || b.dealbreakers.sameIntention) &&
      a.intention !== b.intention
    )
      r.push("Relationship intention dealbreaker");
  }
  if (
    (a.dealbreakers.sameLifestyle || b.dealbreakers.sameLifestyle) &&
    a.lifestyle !== b.lifestyle
  )
    r.push("Lifestyle dealbreaker");
  return r;
}
export function compare(a: Profile, b: Profile, c: Context) {
  const sharedValues = common(a.values, b.values),
    sharedInterests = common(a.interests, b.interests);
  const dimensions = {
    values: overlap(a.values, b.values),
    interests: overlap(a.interests, b.interests),
    communication: a.communication === b.communication ? 100 : 60,
    lifestyle:
      a.lifestyle === b.lifestyle
        ? 100
        : a.lifestyle === "balanced" || b.lifestyle === "balanced"
          ? 75
          : 35,
    intention: a.intention === b.intention ? 100 : 40,
  };
  const weights: Record<Context, number[]> = {
    romantic: [0.3, 0.1, 0.2, 0.2, 0.2],
    friendship: [0.25, 0.3, 0.2, 0.2, 0.05],
    professional: [0.3, 0.1, 0.4, 0.15, 0.05],
    general: [0.3, 0.2, 0.25, 0.2, 0.05],
  };
  const blocked = constraints(a, b, c);
  const score = Math.round(
    Object.values(dimensions).reduce((s, v, i) => s + v * weights[c][i], 0),
  );
  const friction = [
    ...(a.communication !== b.communication
      ? ["Different communication styles: agree how to raise concerns."]
      : []),
    ...(a.lifestyle !== b.lifestyle
      ? ["Different social paces: discuss time together and time apart."]
      : []),
    ...(a.intention !== b.intention
      ? ["Different intentions: clarify expectations before proceeding."]
      : []),
  ];
  return {
    context: c,
    eligible: blocked.length === 0,
    blocked,
    score: blocked.length ? null : score,
    dimensions,
    sharedValues,
    sharedInterests,
    complements:
      a.communication !== b.communication
        ? [
            "Different communication styles may offer fresh perspectives, if both people welcome them.",
          ]
        : [
            "A shared communication style may make expectations easier to discuss.",
          ],
    friction,
    activities: sharedInterests.length
      ? sharedInterests.map((x) => `Plan a low-pressure ${x} activity`)
      : ["Try a new activity you both choose"],
    conversationStarters: sharedValues.length
      ? sharedValues.map(
          (x) => `What does ${x} look like in your everyday life?`,
        )
      : ["What helps you feel understood?"],
    archetypes: [archetype(a), archetype(b)],
    interpretation:
      "Overlap measures approved attributes. Complementary strengths and friction are template-based possibilities, not predictions.",
    disclaimer:
      "Exploratory heuristic; not scientifically validated. Scores do not measure safety, attraction, or relationship outcomes.",
  };
}
export const sample: Profile = validate({
  approved: true,
  adult: true,
  age: 29,
  gender: "nonbinary",
  seeking: ["woman", "man", "nonbinary"],
  minAge: 24,
  maxAge: 40,
  city: "New York City",
  location: { lat: 40.71, lon: -74.01 },
  values: ["curiosity", "kindness", "growth"],
  interests: ["art", "hiking", "technology"],
  communication: "direct",
  lifestyle: "balanced",
  intention: "long-term",
});
export const people = [
  "Rowan",
  "Sage",
  "Alex",
  "Jules",
  "River",
  "Quinn",
  "Avery",
  "Morgan",
  "Sky",
  "Emery",
].map((name, i) => ({
  id: `demo-${i + 1}`,
  name,
  synthetic: true,
  profile: validate({
    ...sample,
    age: 26 + i,
    gender: choices.gender[i % 3],
    city: i < 5 ? "New York City" : i < 8 ? "London" : "Lisbon",
    location:
      i < 5
        ? { lat: 40.71, lon: -74.01 }
        : i < 8
          ? { lat: 51.51, lon: -0.13 }
          : { lat: 38.72, lon: -9.14 },
    values: [
      choices.values[i % 8],
      choices.values[(i + 1) % 8],
      choices.values[(i + 3) % 8],
    ],
    interests: [
      choices.interests[i % 10],
      choices.interests[(i + 2) % 10],
      choices.interests[(i + 4) % 10],
    ],
    communication: choices.communication[i % 3],
    lifestyle: choices.lifestyle[i % 3],
    intention: i % 4 === 0 ? "friendship" : "long-term",
  }),
}));
export function discover(
  p: Profile,
  c: Context,
  scope: unknown,
  radius: unknown = 50,
) {
  if (!["city", "radius", "worldwide"].includes(String(scope)))
    throw Error("Unsupported location scope");
  if (
    scope === "radius" &&
    (!p.location ||
      typeof radius !== "number" ||
      !Number.isFinite(radius) ||
      radius < 1 ||
      radius > 20000)
  )
    throw Error("Radius requires coarse city coordinates and 1–20000 km");
  return people
    .filter(
      (x) =>
        scope === "worldwide" ||
        (scope === "city" &&
          x.profile.city.toLowerCase() === p.city.toLowerCase()) ||
        (scope === "radius" &&
          (distance(p, x.profile) ?? Infinity) <= Number(radius)),
    )
    .map((x) => ({
      id: x.id,
      name: x.name,
      synthetic: true,
      city: x.profile.city,
      report: compare(p, x.profile, c),
    }))
    .filter((x) => x.report.eligible)
    .sort((a, b) => (b.report.score ?? 0) - (a.report.score ?? 0))
    .slice(0, 6);
}
// Export deliberately excludes age, gender, preferences, city, and coordinates.
export function card(p: Profile) {
  return {
    format: "vennith-card-v1",
    archetype: archetype(p),
    notice:
      "Only the approved traits shown on this card are exported. Files can be copied and cannot be revoked.",
  };
}
