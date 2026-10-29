# Vennith

**Know yourself. Find your people.**

Vennith is an open-source, privacy-conscious prototype for personality exploration and human connection. A TypeScript compatibility engine powers a responsive web app and a remote MCP server, independently of any AI provider.

- **Vennith Type:** Discover one of four original archetypes (Pathfinder, Hearthkeeper, Maker, Luminary), understand approved traits, and export a minimal visual SVG personality card.
- **Vennith Sync:** Compare two independently approved adult profiles in romantic, friendship, professional, or general contexts. Explore dimensions, shared attributes, possible complementary strengths, friction, activities, and conversation starters.
- **Vennith Discover:** Rank ten clearly fictional adults for dating or friendship with city, city-center radius, or worldwide discovery.

This is a functional **synthetic, stateless demonstration**, not a live dating service. There are no accounts, real-person discovery, introductions, messages, persistent profiles, AI-history imports, or autonomous AI-to-AI agents. Archetypes are entertainment; scores are deterministic, unvalidated heuristics rather than psychological measurements or predictions of outcomes.

## Run locally

Node 22+ and npm are required (verified with Node 24.19.0). No paid APIs, database, or secrets are needed.

```sh
npm ci
npm run build
npm start
```

Open the local server on port 3000. `PORT` and `PUBLIC_ORIGIN` are optional; `.env.example` documents them. Node does not load `.env` automatically: export variables or use Node's `--env-file` option. For hosted use, set `PUBLIC_ORIGIN` to the exact external HTTPS origin, without a trailing slash. Preserve the platform's proxy and CA settings.

Profiles begin as editable fictional examples. Review fields in Sync and independently check approval for each profile. Type generates and exports your card; Sync compares both; Discover uses the first approved profile. Changes reset consent and clear previous reports. Nothing is saved to local storage or a database. You can discard the page to discard the in-memory profile.

The web editor supports New York City, London, and Lisbon, using coarse city centers. The API and MCP schema accept other city names and optional city-center coordinates. Radius discovery requires valid coordinates. A downloaded SVG personality card is a minimal display artifact, not a full matchmaking profile; voluntarily shared full structured profiles can be imported into Sync and must be reviewed and approved again.

## Tests

```sh
npm test
npm run validate
```

The test suite includes engine, API, input-validation, privacy-boundary, MCP protocol, official MCP SDK interoperability, and browser tests. The browser test uses `/usr/bin/chromium`; install Chromium through your operating system package manager or set `CHROMIUM_PATH` to a trusted installed executable. Tests start a separate local service on port 3017 and require permission to bind ports and launch a browser. No tests are intentionally skipped. Development dependencies include the official MCP SDK and Playwright solely for verification; the runtime has no package dependencies.

## Compatibility model

Hard constraints precede soft ranking. Dating checks both people's gender and adult age preferences, friendship-only intentions, and explicit intention dealbreakers. Explicit lifestyle dealbreakers apply across contexts. Geography filters discovery separately. Failed hard constraints yield no overall score and exclude discovery candidates.

Soft dimensions measure selected value/interest overlap, communication alignment, lifestyle alignment, and intentions. Context weights (values, interests, communication, lifestyle, intention) are:

| Context      | Values | Interests | Communication | Lifestyle | Intention |
| ------------ | -----: | --------: | ------------: | --------: | --------: |
| Romantic     |    30% |       10% |           20% |       20% |       20% |
| Friendship   |    25% |       30% |           20% |       20% |        5% |
| Professional |    30% |       10% |           40% |       15% |        5% |
| General      |    30% |       20% |           25% |       20% |        5% |

Selected overlap is distinct from speculative complementarity: differences are not automatically rewarded, and template suggestions describe possibilities to discuss. The model has no clinical or empirical validation. Symmetric overlap divides shared items by the larger selected set; it does not infer missing traits. Archetype ties use a stable documented-in-code ordering, so minor changes can change a playful label.

## Connect an AI assistant through MCP

After deploying this source to an authorized HTTPS host, the remote endpoint is `https://YOUR-HOST/mcp`. **No public Vennith endpoint has been verified in this session.** Do not treat an earlier deployment of another revision as this build.

1. **ChatGPT:** If custom MCP apps and developer mode are available for your plan/workspace, open Settings → Apps, enable developer mode where offered, and create a custom app with the HTTPS `/mcp` URL. Your administrator may need to permit it.
2. **Claude:** If your plan/workspace supports custom remote connectors, open Settings → Connectors → add a custom connector and enter the HTTPS `/mcp` URL.
3. Menu labels and availability vary by client. Select the app/connector in a conversation and ask it to use the profile schema. Remote clients must reach an HTTPS host; localhost requires a compatible local client or an explicitly authorized tunnel.

No AI-provider account passwords, OAuth conversation access, or API keys are required. This is a generic MCP connector, not an installed native integration with each provider.

Suggested instruction:

> Use Vennith to prepare a compatibility profile from only information I explicitly authorize. First call get_profile_schema. Show me every field and wait for my explicit approval before sending any profile to a tool. Never send raw conversations, medical/financial details, confidential work data, or information about third parties. For Sync, require the other adult's independently approved profile. Explain that discovery people are fictional and types and scores are unvalidated.

MCP uses stateless Streamable HTTP with JSON responses, negotiates protocol versions `2025-11-25`, `2025-06-18`, and `2025-03-26`, accepts initialized notifications, and supports ping, discovery, and tool calls. It does not provide sessions, standalone SSE streams, OAuth, or persistent user operations. Clients must send `Accept: application/json, text/event-stream`; GET `/mcp` returns 405 as permitted for a server without an SSE stream.

| Tools                                                                                                                                | Function                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `get_profile_schema`                                                                                                                 | Schema, supported options, and fictional example                             |
| `create_compatibility_profile`, `validate_compatibility_profile`, `update_compatibility_profile`                                     | Validate a complete approved profile; no persistence or automatic extraction |
| `get_personality_archetype`                                                                                                          | Original playful personality interpretation                                  |
| `find_compatible_matches`                                                                                                            | Synthetic discovery with mutual constraints and location filters             |
| `evaluate_compatibility`, `get_match_explanation`, `compare_compatibility`, `explain_compatibility`, `generate_compatibility_report` | Same explainable two-profile report                                          |
| `export_personality_card`                                                                                                            | Minimal personality JSON (the browser renders an SVG export)                 |

Updates require the complete replacement profile with renewed approval. An approval flag is an attestation by the caller, not independently verified human consent. Assistants must enforce the review interaction; this public stateless server cannot prove it occurred.

## HTTP API and boundaries

- `GET /health`: service readiness and synthetic-stateless mode.
- `GET /api/template`: schema, options, and fictional profiles.
- `POST /api/archetype` and `/api/card`: `{ "profile": APPROVED_PROFILE }`.
- `POST /api/compare`: `{ "first": APPROVED_PROFILE, "second": APPROVED_PROFILE, "context": "friendship" }`.
- `POST /api/matches`: `{ "profile": APPROVED_PROFILE, "context": "friendship", "scope": "city" }`. Radius adds `"radiusKm": 100` and requires coarse profile coordinates.
- `POST /mcp`: MCP JSON-RPC.

The schema requires adulthood and explicit approval, controlled-vocabulary attributes, age and preference ranges, and bounded city names. Unknown fields and prompt-like trait values are rejected. Profiles are data, never executed instructions. Responses are rendered with DOM text nodes, never user-controlled HTML. Input bodies are limited to 32 KiB. Cross-origin browser requests are rejected; the server uses strict CSP and privacy/security headers and performs no request-body logging. MCP and HTTP tools share the same engine and validator.

The app stores no profiles or reports. Hosting infrastructure can still retain request/access logs; **do not submit sensitive information**. Exported cards intentionally omit age, gender, city, coordinates, and dating preferences but reveal selected values, communication and lifestyle, and the archetype interpretation. Export only if you approve those visible traits. Downloaded files can be copied and cannot be revoked. Delete unwanted files yourself; there is no server-held data to delete or revoke. No E2E encryption or anonymity is claimed.

Approval controls demonstrate bilateral consent boundaries: fictional candidates cannot approve an introduction, so the demo never reveals an identity or enables messaging. True independently verified consent, age assurance, authentication, authorization, encryption at rest, revocable invitations, deletion, moderation, abuse prevention, durable bilateral approval, and messaging require production infrastructure. The public stateless interface has no application-level rate limiter; configure hosting limits before wider exposure. Do not accept real-person dating accounts on this prototype.

## Deployment

Two deployment targets are included; neither requires changes to application logic:

### Node host

Run `npm ci && npm run build` during preparation and `npm start` at runtime, with Node 22+, `PORT`, and `PUBLIC_ORIGIN=https://YOUR-HOST`. Serve behind the hosting provider's HTTPS termination, enforce request limits, avoid logging bodies, and health-check `/health`.

### Cloudflare Workers

`wrangler.jsonc` defines a module Worker and static assets binding. After explicitly authorizing a Cloudflare account, use a trusted Wrangler installation to run:

```sh
npx wrangler deploy
```

The Worker routes static files and API/MCP requests through the same shared implementation. Use TLS and configure hosting abuse/rate limits. No Cloudflare account or token was available to validate a public deployment here. This repository does not silently create new deployments or reuse unknown project IDs.

Verify the actual published host with `/health`, the page, and an MCP initialize/list/call sequence before claiming it works. The previous Sites project could not be inspected or updated because no Sites management tools were exposed and the prior host was denied by network policy. Repository renaming is a separate step, after implementation/deployment verification; the existing repository URL remains authoritative until that operation succeeds.

## Code map

`src/engine.ts`: validation, archetypes, constraints, scores, synthetic cohort, exports. `src/app.ts`: API and MCP transport/tools. `src/server.ts`: Node HTTP adapter. `src/worker.ts`: Cloudflare adapter. `public/`: accessible, responsive Type/Sync/Discover interface. `test/`: unit, integration, protocol, and real-browser coverage.

MIT licensed. See [LICENSE](LICENSE).
