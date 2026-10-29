# Eros / Kinmesh — AI matchmaking prototype

An open-source, privacy-conscious **prototype** for AI-assisted human connection. It provides a responsive web app and a stateless Model Context Protocol (MCP) endpoint usable by compatible AI assistants.

**This is a demonstration, not a live dating service.** All ten sample people are fictional. There are no real user accounts, chat imports, messaging, date scheduling, or persistent profiles. Matching scores use a deterministic heuristic and have not been validated against actual relationship outcomes.

## Features

- User-reviewed compatibility cards for dating or friendship.
- Search within a city or across the fictional worldwide cohort.
- Import JSON cards drafted by any AI assistant.
- Match explanations based on values, interests and preferences.
- Stateless MCP endpoint; no AI API key or database required.

## MCP integration

The deployed app exposes its MCP endpoint at `https://YOUR-DEPLOYMENT/mcp`. Clients supporting custom remote MCP servers can register this address. Some providers impose additional permissions or installation steps.

| Tool | Purpose |
| --- | --- |
| `profile_template` | Fetch schema and accepted values. |
| `normalize_profile` | Remove unknown fields from a consented card. |
| `match_demo_people` | Rank fictional candidates. |
| `compare_profiles` | Explain shared features and potential tensions. |

Suggested assistant instruction:

> Get the Kinmesh profile schema through `profile_template`. Draft a minimal compatibility card from only information I approve. Show me every attribute and wait for consent before calling `match_demo_people`. Never send raw conversations, medical/financial information, confidential work data, or information about third parties. Explain that candidates are fictional and scores unvalidated.

Example test:

```sh
curl -s https://YOUR-DEPLOYMENT/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"match_demo_people","arguments":{"profile":{"mode":"friends","city":"New York City","values":["curiosity","growth"],"interests":["technology","running"],"pace":"active","communication":"direct","goal":"friendship"},"scope":"city"}}}'
```

## Run checks

The entrypoint is `worker/index.js` and uses standard Web APIs. Requires Node 20+ for tests.

```sh
npm test
npm run build
npm run validate
```

HTTP routes: `GET /` (web app), `GET /health`, `GET /api/template`, `POST /api/matches`, `POST /mcp`.

## Privacy and limitations

The demo does not request conversation histories, access AI accounts, or write profile data to a database. Requests are processed transiently by application code. Hosting infrastructure may still retain access logs: **do not submit sensitive information**.

Before a real-user launch, add user authentication, profile encryption, revocation and deletion, consented sharing, identity and age controls, reporting/blocking, abuse safeguards, bilateral approval before introductions, and independent privacy/security review.

## Roadmap

1. Define a versioned schema with field visibility, provenance and consent.
2. Implement local profile extraction from exported conversations and native assistant integrations.
3. Add authenticated, explicitly opted-in real people and double-consent introductions.
4. Validate against real outcomes relative to questionnaire-based matching.
5. Add constrained AI-to-AI conversations after adversarial and privacy review.

MIT licensed; see `LICENSE`.
