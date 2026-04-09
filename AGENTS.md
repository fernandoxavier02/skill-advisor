# Project Guidelines

## Project Overview

Skill Advisor is a local-first Node.js/CommonJS plugin that recommends skills, plugins, MCP servers, and pipelines for a task. Keep the split between the fast hook path and the heavier command/build path intact.

## Build and Test

- Use Node.js 18 or newer.
- Run `npm test` for the full test suite. Tests use the built-in `node:test` runner.
- Run `npm run index` after changing skill/plugin scanning or index generation.
- Run the relevant builder directly when changing derived data pipelines: `node lib/build-embeddings.js`, `node lib/build-graph.js`, `node lib/build-affinity.js`, `node lib/build-collisions.js`, `node lib/build-combos.js`, `node lib/build-discovery.js`, `node lib/build-replay.js`, `node lib/build-hook-data.js`.

## Architecture

- Keep `hooks/advisor-nudge.cjs` synchronous, single-file, and under the hook budget. No network calls, no model loading, no persistent process state.
- Treat `commands/advisor.md` as the command entry point and `agents/advisor-router.md` as the task-classification/loadout subagent.
- Keep shared scoring, text, schema, and path logic in `lib/`. Put tunable constants in `lib/constants.js` and path rules in `lib/paths.js`.
- The shipped indexes and embeddings live in `lib/`. User data and caches live under `~/.claude/advisor/` through `lib/paths.js` helpers.

## Conventions

- Use CommonJS (`require` and `module.exports`) across runtime modules. The only existing exception is dynamic `import()` inside `lib/build-embeddings.js`.
- Preserve bilingual PT-BR and EN behavior when changing tokenization, stopwords, synonyms, ranking terms, or examples.
- Follow the repo's precomputed JSON pattern: heavy work belongs in `build-*.js` modules, not in runtime hook logic.
- Keep builder and runtime behavior defensive around malformed data. Reuse the patterns in `lib/jsonl.js`, `lib/errors.js`, and `lib/schemas.js`.
- Use fixtures in `tests/fixtures/` and add or update `node:test` coverage for behavior changes.

## Repo-Specific Gotchas

- Rebuild both lite and full indexes together when scanning or categorization logic changes.
- Keep category and branch-mapping changes aligned with `lib/constants.js`, `lib/context.js`, and any builders that derive category data.
- If you change frontmatter parsing behavior, check every consumer carefully. Parsing behavior is easy to desynchronize across build steps.
- Prefer cross-platform Node logic inside source files. Shell-specific behavior belongs in command docs or helper scripts, not core runtime code.

## Reference Docs

- See `README.md` for onboarding, command intent, and the high-level product walkthrough.
- See `docs/SMART-ADVISOR-V2-HANDOFF.md` for architecture decisions, cache layout, feature sequencing, and v2 implementation details.
- Use `hooks/advisor-nudge.cjs`, `lib/constants.js`, `lib/paths.js`, `lib/build-index.js`, and `tests/advisor-nudge.test.js` as reference files for the main code paths and testing style.
