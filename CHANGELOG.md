# Changelog

All notable changes to the **skill-advisor** plugin are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] — 2026-04-27

### Architectural refactor (10-finding audit response)

Closes the 10-finding architectural audit from 2026-04-26. Quality bar lifted from 7.5 → 9+/10 with zero functional regression. 31-task spec executed in 6 phases through 18 commits on `refactor/skill-advisor-0.5.0`.

### Added — Architectural guards (CI-enforced via `npm run validate`)

- **DI-1 (Module Load Purity).** `tests/pipeline-config.test.js` patches `fs.readFileSync/statSync/readdirSync` BEFORE requiring `lib/constants.js` and asserts zero invocations during module load. Catches any future regression that adds I/O to constants. _Req 2.1-2.5_.
- **DI-2 (Layered Dependency Direction).** `tests/dependency-edges.test.js` greps every `lib/<non-builder>.js` for `require('./build-*.js')`. Domain code may not import builders. Hardcoded zero exceptions. _Req 3.1-3.4_.
- **DI-3 (Manifest Version Coherence).** `tests/version-coherence.test.js` cross-references `package.json` and `.claude-plugin/plugin.json` SemVer fields and fails with both file paths + divergent values when they differ. _Req 1.1-1.4_.
- **DI-9 (Vault Env Single Source).** `tests/vault-env-single-source.test.js` greps `lib/paths.js` for direct env reads — must be zero (vault-config is the only authorized reader). _Req 7.1-7.3_.

### Added — Hot-path refactor (Phase 2)

- **`lib/advisor-nudge-core.js`** (~280 lines) — pure scoring/fusion/affinity/context/discovery/replay logic extracted from the hook. Determinism contract: same opts + fixed `now()` → deeply equal `SuggestionResult`. Loaders are injected (no I/O without explicit caller cooperation). Sanitization regex `/[^a-zA-Z0-9:/_-]/g` preserved bit-for-bit at all 3 call sites (main nudge + discovery nudge + replay sequence — last one hardened in Slice 2.3 review polish). _Req 4.1, 4.5, 4.6_.
- **`hooks/advisor-nudge.cjs`** reduced **387 → 85 lines** (-78%). Pure I/O shim: stdin parse → loader construction → `runNudge()` → stdout emission → exit 0. _Req 4.1_.
- **`lib/mtime-cache.js`** — module-scoped mtime+size keyed loader memoization. Defeats stale-cache class on coarse filesystems (FAT32, sub-ms CI rebuilds) by including `size` alongside `mtimeMs`. Test reset hook gated by `SKILL_ADVISOR_TEST=1`. _Req 4.4_.
- **Prompt-length env override** `ADVISOR_PROMPT_LENGTH=N`. Default raised 5 → 12 chars per spec contract. Threshold=0 honored as kill-switch (debug aid). _Req 4.3_.
- **Performance gate** (`tests/perf-assertions.test.js`) — ceiling absolute `p95 ≤ 250ms` + headroom relative `current ≤ baseline.p95 × 1.15` (skipped on platform mismatch — Linux CI must re-capture baseline on first green run; capture script writes `platform`/`nodeVersion`/`cpuModel` provenance). Split from `npm test` via `RUN_PERF=1` gate; runs as `npm run test:perf` (~60s). Default `npm test` stays at ~2s for TDD iteration. _Req 4.2_.

### Added — Consolidation (Phase 3)

- **`lib/walk.js`** — unified filesystem walker `walkDir(dir, {matcher, maxDepth, maxEntries, skipDirs, skipHidden})`. Returns deduped+sorted absolute paths. Replaces private walkers in build-index and build-catalog (-76 lines, +21 net). Exposed behavioral discovery: legacy build-index walker counted entries-visited, terminating early on big plugin trees. New walker counts only matches → index growth 163 → 546 entries (silently dropped skills now visible). Lite index size 45.6KB → 162.7KB (exceeds 100KB warning, informational). _Req 6.1-6.3_.
- **`lib/vault-config.js` cascade.** Canonical `SKILL_ADVISOR_VAULT_PATH` wins over legacy `SKILL_ADVISOR_VAULT`. Legacy alone emits one-time `console.warn` naming canonical + removal release **0.6.0**. `lib/paths.js` no longer reads either env directly. _Req 7.1-7.3_.

### Added — Coverage closure (Phase 5)

- **5 new test files** + features tier reactivated. Test count grew 654 → **808** (+154, +24%). Suite still <2s for default `npm test`.
- `tests/session-start.test.js` (8 scenarios) — covers all 4 SessionStart hook branches plus package.json missing/malformed fallback.
- `tests/build-graph.test.js` (10 scenarios) — synthetic vault fixture with concrete numeric assertions on node count, type breakdown, bidirectional concept-concept symmetry, alias_index PT-BR accent normalization, `extractWikilinks` pipe-form `[[name|alias]]` extraction.
- `tests/build-embeddings.test.js` (7 scenarios) — module load purity + VOCAB_WORDS bilingual invariants. Model-injection failure path deferred to 0.5.1 (dynamic import has no DI seam).
- `tests/loadout-direct.test.js` (16 scenarios) — every export of `lib/loadout.js` with typical + boundary, `swapAtPosition` 8 separate throw assertions + immutability check.
- `tests/perf-assertions.test.js` (5 scenarios, RUN_PERF=1) — perf gate lock.
- Features tier (`tests/features/*.feature.js`) reactivated in default `npm test` glob; 2 new BDD wrappers (`walker-confluence.feature.js`, `advisor-nudge-early-exit.feature.js`).

### Changed — Discoverability hygiene (Phase 4)

- **`skills/pipeline-suggest/SKILL.md` description rewritten.** Removed ambiguous positive trigger ("I don't know which skill to use"). Added specific positives ("which tool fits this task", "compose a quick stack for X") and front-loaded exclusions in plain form (`/skill-advisor:advisor`, `/advisor`, "interactive picker", "step-by-step", "walk me through", "pick skills one by one"). Embedding-similarity rationale: SUMS keywords, doesn't subtract negations — listing exclusions plain-text reduces semantic collision. _Req 5.1_.
- **`commands/advisor-setup.md`** — added missing `name: advisor-setup` frontmatter field. _Req 5.2_.
- **`commands/advisor-stats.md`** — description expanded with all 4 spec-required trigger phrases ("como tenho usado", "quais skills mais uso", "show usage trends", "session analytics"). _Req 5.3_.

### Deprecated

- **`SKILL_ADVISOR_VAULT` env var.** Legacy, replaced by `SKILL_ADVISOR_VAULT_PATH`. Emits one-time `console.warn` when set alone. **Removal target: 0.6.0**.
- **`require('./build-index').inferCategory`** re-export. Replaced by `lib/category.js inferCategory`. Emits one-time `console.warn` per process. **Removal target: 0.6.0**.

### BREAKING (behavioral)

- **Default prompt-length threshold raised 5 → 12.** Prompts of 5-11 characters that previously surfaced advisor nudges now early-exit silently. Restore old behavior with `ADVISOR_PROMPT_LENGTH=5` in your shell env. Spec rationale: hot-path performance (Req 4.3 specified default 12).

### Migration

No code-level migration required for typical users. If you have:
- A custom `SKILL_ADVISOR_VAULT=/path` in shell rc → rename to `SKILL_ADVISOR_VAULT_PATH`. Same value, no warning.
- Custom callers of `build-index.inferCategory` → switch to `require('./lib/category').inferCategory`. Same signature.
- Heavy reliance on advisor nudges for very short prompts (5-11 chars) → set `ADVISOR_PROMPT_LENGTH=5`.

### Tests

- 808 tests, 215 suites, suite time <2s (perf gate excluded; runs separately via `npm run test:perf`).
- 4 architectural guards (DI-1, DI-2, DI-3, vault env single source) all green simultaneously.
- Performance gate green: short80 p95 = 170.86ms (ceiling 250ms, baseline×1.15 = 188.7ms — both within); long500 p95 = 157.46ms (within both gates).

### Backward compatibility

The plugin name (`skill-advisor`), command (`/skill-advisor:advisor`), agents, and library APIs are untouched. The hook's external contract (UserPromptSubmit JSON stdin → stdout nudge → exit 0) is preserved bit-for-bit. Two deprecation warnings fire one-time per process for legacy env / legacy import; both have explicit 0.6.0 removal targets.

## [0.4.2] — 2026-04-26

### Changed (UX disambiguation)

- **Renamed skill `advisor-skill` → `pipeline-suggest`.** The lightweight
  auto-trigger skill is now invoked via `/skill-advisor:pipeline-suggest`.
  Rationale: users could not reliably distinguish the skill from the
  `/skill-advisor:advisor` command — both shared the "advisor" prefix and
  the previous name was generic ("advisor-skill"). The new name signals
  the actual function (a quick pipeline suggester) without colliding with
  pipeline-orchestrator's `/pipeline` command.
- **Updated SKILL.md description** with an explicit "When to use this vs
  `/skill-advisor:advisor`" comparison table so users can pick the right
  entry point without reading source.

### Added

- **Regression test `tests/skill-rename-pipeline-suggest.test.js`** (6 cases):
  asserts the new skill directory exists, frontmatter `name` matches the
  directory, description points to the heavier sibling command, the old
  directory was fully removed, and no tracked file references the old
  name (with CHANGELOG and the test file itself in an explicit allowlist).
  Test count: 648 → 654.

### Migration

If you previously referenced `/skill-advisor:advisor-skill` in scripts,
prompts, or documentation, replace with `/skill-advisor:pipeline-suggest`.
The `/skill-advisor:advisor` command is unchanged.

### Backward compatibility

Breaking only for callers that hardcoded the literal string
`/skill-advisor:advisor-skill`. The plugin name (`skill-advisor`), the
command (`/skill-advisor:advisor`), the agents (`advisor-router`,
`advisor-gate`), and all library APIs are untouched. Marketplace ref
bumped to `v0.4.2` so users get the rename through `claude plugin update`.

## [0.4.1] — 2026-04-25

### Changed
- **`/advisor-setup` wizard wired through to v0.4.0 libraries.** The
  command markdown now drives Vault opt-in (Step 1.5), Threshold preset
  picker (Step 3.5), and SmokeRunner (Step 4). Previous v0.4.0 release
  shipped the libraries but the wizard still ran the v0.3.5 ultra-light
  smoke; this completes the wiring.

### Added — wizard steps
- **Step 1.5 — Vault** prompts the user to bind an Obsidian vault
  (Sim com path / Pular). Validates the typed path via
  `lib/vault-config.js makeVaultConfig`, persists `vault_config` to
  `~/.claude/advisor/setup.json`. Up to 3 retry attempts on validation
  failure. Optional `node lib/build-graph.js` rebuild on success.
- **Step 3.5 — Threshold** offers `Balanced 0.5 (Recomendado)` /
  `Strict 0.7` / `Chatty 0.3` / `Manter default (0.20)`. Persists via
  `makeThresholdConfig(preset)`. Hook reads the cascade automatically.
- **Step 4 — Full smoke** replaces the v0.3.5 inline parse-only check
  with a single call to `lib/smoke-runner.js runSmoke()`. Reports
  per-check `ok` + reason; user can retry Step 1, abort, or finish
  degraded if a non-optional check fails.

### Notes
- No code changes — markdown only. Suite remains 662/662.
- KNOWN_STEPS now drives 6 steps end to end:
  `index → embeddings → owners → vault → threshold → smoke`.

## [0.4.0] — 2026-04-24

### Added — Approach B (Vault + Threshold + Smoke)

- **Vault bounded context** (`lib/vault-config.js`). DDD value object
  `VaultConfig { path, indexed_at, graph_edges_count }` with aggregate
  invariants: path non-empty, exists, is a directory, looks like a vault
  (`.obsidian/` OR at least one `.md`). Typed `VaultValidationError` with
  `reason` tag (`invalid_type | not_found | not_a_directory | not_a_vault`).
  Resolution cascade: `SKILL_ADVISOR_VAULT_PATH` env beats
  `setup.json vault_config.path`. 5 BDD scenarios.
- **Threshold bounded context** (`lib/threshold-config.js`). DDD value
  object `ThresholdConfig { value, preset }` with presets
  `strict=0.7 / balanced=0.5 / chatty=0.3`. Resolution cascade:
  `ADVISOR_THRESHOLD` env beats setup.json wizard-persisted value beats
  `THRESHOLDS.DEFAULT_SCORE`. Hook `advisor-nudge.cjs` updated to use
  the cascade via `resolveEffectiveThreshold`. 5 BDD scenarios.
- **SmokeTest bounded context** (`lib/smoke-runner.js`). Upgrade over
  v0.3.5's ultra-light smoke: parses full + lite indexes, validates
  embeddings if present (optional), loads `lib/constants.js` to exercise
  the user-config merge, traverses the lite index with canned task
  keywords. Returns typed `SmokeTestResult { passed, checks[],
  loadout_size, duration_ms, matched_fingerprint, reason }`. 4 BDD
  scenarios.
- **KNOWN_STEPS expanded** in `lib/setup-state.js` to include `vault`
  and `threshold` alongside the existing `index`, `embeddings`,
  `owners`, `smoke`.

### Tests
- +49 new tests across `tests/vault-config.test.js` (21),
  `tests/threshold-config.test.js` (20), `tests/smoke-runner.test.js`
  (14 — some nested).
- +14 BDD scenarios across `tests/features/vault-config.feature.js`,
  `tests/features/threshold-config.feature.js`,
  `tests/features/smoke-runner.feature.js`.
- Full suite: 662/662 passing (was 587). Zero regression.

### Notes
- The advisor-nudge hook change is **fail-soft**: if
  `lib/threshold-config.js` is missing (downgraded install), the hook
  falls back to the original env-or-default behavior.
- The `/advisor-setup` command markdown still describes the v0.3.5
  ultra-light smoke. Updating the wizard to drive the new vault /
  threshold / smoke steps is part of the v0.4.1 follow-up.

## [0.3.5] — 2026-04-24

### Added
- **First-run setup wizard** via new `/advisor-setup` slash command. Four steps: build keyword+lite index, download+build semantic embeddings (~23 MB on first run), detect orchestrated plugins and curate PIPELINE_OWNERS one-by-one, ultra-light smoke check. Idempotent on re-run — completed steps are skipped unless the advisor version changed. See `commands/advisor-setup.md`.
- **SessionStart hook** (`hooks/session-start.cjs`) that detects first install or version upgrade and emits a one-line nudge telling the user to run `/advisor-setup`. Fail-soft: any filesystem or parse error results in silent exit 0. Budget <80 ms cold.
- **Heuristic plugin detector** (`lib/detect-owners.js`) with 5 heuristics in order of signal strength: H1 explicit `pipeline: true` metadata (short-circuits to confidence 1.0), H2 sequential naming (3+ workflow tokens or `phase-N` pattern, weight 0.4), H3 spec+impl+validate triad (weight 0.3), H4 explicit `pipeline` or `orchestrator` skill name (weight 0.3), H5 shared-prefix cluster of 4+ skills (weight 0.3). Threshold to flag: 0.5.
- **Extensible pipeline-owners** via `~/.claude/advisor/pipeline-owners-user.json`. The wizard writes user confirmations here; `lib/constants.js` merges user additions with the hardcoded base at module-load time. Merge is append-only — user owners colliding with the base are filtered with a stderr warning.
- **Setup state helpers** (`lib/setup-state.js`) for read/write of `~/.claude/advisor/setup.json` with schema versioning, idempotent step marking, version-drift detection, and fail-soft reads.

### Changed
- **Refactor `lib/constants.js`** to split hardcoded base (`_BASE_PIPELINE_OWNERS`, `_BASE_CANONICAL_FLOWS`, `_BASE_PIPELINE_FINGERPRINTS`) from merged exports. Existing consumers see no behavior change when no user config file exists.

### Tests
- +33 new tests across `tests/user-config.test.js` (12), `tests/constants-merge.test.js` (11), `tests/detect-owners.test.js` (18), `tests/setup-state.test.js` (15). Full suite: 587 passing, zero regression.

## [0.3.4] — 2026-04-24

### Fixed
- **Manifest sync.** `.claude-plugin/plugin.json` was still declaring `0.3.1` after the code reached `0.3.4` across commits `8b963bb`, `0853657`, and `3c718d5`. The plugin UI showed a version inconsistent with the code on disk. Manifest now agrees with `package.json`.

## [0.3.3] — 2026-04-24

### Added
- **Prompt-injection sanitizer (`lib/escaping.js`).** Ports the Rule 12 escaping contract from `agents/advisor-gate.md` prose into executable JavaScript, with CLI wrapper wired into the advisor prompts (`3fef786`, `0853657`). Functions: backtick redaction (runs of ≥3), control-character strip, field length caps (`task_description` 2000, `codebase_context` 4000, per-skill 300, `loadout_json` 8000), BEGIN/END marker wrapping.
- **Loadout composition invariant test (`T7` in `tests/advisor-loadout-composition.test.js`).** Every skill tagged with a non-null `pipeline_owner` in the fixture index must have its owner in `PIPELINE_OWNERS` (`65f2180`). Catches drift when an owner is removed from the curated list but skills remain tagged.

### Changed
- **SSOT refactor for `COMPLEXITY_BOUNDS`.** Moved from scattered definitions in `lib/schemas.js` to a single canonical source in `lib/constants.js`; the `agents/advisor-router.md` prompt now references the constants file rather than repeating the numbers inline (`1d8420a`).

## [0.3.2] — 2026-04-24

### Added
- **Per-step loadout picker.** Users now pick the skill for each position of the proposed loadout via native `AskUserQuestion` arrow-key menus instead of approving a monolithic gate. The router emits up to 3 alternatives per position; the gate displays the top 2 plus the recommendation plus `Voltar`. Same-owner swap is a local positional substitution; cross-owner swap triggers immediate collapse to the new owner's canonical flow.
- **Pipeline-owner isolation.** Curated list `PIPELINE_OWNERS` in `lib/constants.js` (`superpowers`, `pipeline-orchestrator`, `kiro`, `sdd`, `compound-engineering`). A loadout can never mix skills from two different non-null pipeline owners. `build-index.js` tags each indexed skill with `pipeline_owner` (`8452d55`); `lib/schemas.js` rejects cross-owner loadouts (`8cfc5b4`); `lib/loadout.js` provides `collapseToCanonicalFlow` and `swapAtPosition` helpers (`d993e29`, `00a0cc2`).
- **Pipeline fingerprints.** `PIPELINE_FINGERPRINTS` in `lib/constants.js` gives each owner a functional signature (`best_for`, `typical_tasks`, `not_for`, `complexity_match`) so the router can recognize pipelined plugins end-to-end from the task description and recommend the canonical flow unprompted.
- **Task-complexity-aware loadout sizing.** Router emits `task_complexity` (`simple | medium | complex`). Standalone loadouts are sized 1-2, 3, or 4-5 skills respectively. Pipeline-owned loadouts inherit the canonical flow shape (`e279ac7` characterizes the bounds).
- **Fingerprint-match routing test (T10).** Three fixture task prompts map deterministically to kiro / superpowers / pipeline-orchestrator canonical flows with `matched_fingerprint` populated (`53b0d04`).
- **Regression test file `tests/advisor-loadout-composition.test.js`** with 10 tests (T1-T10) covering index tagging, router schema, no-mix invariant, collapse materialization, local swap, fixture canonical flow, parity invariants, and backward compatibility.

### Changed
- **Agent prompts updated (`36cfa8b`).** `agents/advisor-router.md` and `agents/advisor-gate.md` reflect the per-step picker contract, the collapse semantics, and the fingerprint-match path.

## [0.3.1] — 2026-04-24

### Fixed
- **`advisor-gate` bootstrap (`4a820d3`).** Added "Tool Loading (FIRST STEP — MANDATORY)" section. The `AskUserQuestion` tool is a deferred tool in recent Claude Code builds — schema not pre-loaded even when listed in frontmatter `tools`, direct invocation fails with `InputValidationError`. The agent now calls `ToolSearch("select:AskUserQuestion")` as its first tool call with explicit fallback contract (`error: "askuserquestion_unavailable"` + `decision: "cancel"`). Prose fallback (`digite 1/2/3/4`) and pseudo-XML wrappers (`<ask_user>`) are explicitly banned.
- **Regression test `tests/advisor-gate-toolloading.test.js`.** Four asserts lock in the contract: file exists, body references `ToolSearch` near `AskUserQuestion`, `ToolSearch` appears before the first "invoke AskUserQuestion" directive, and a "FIRST STEP" marker is present.

## [0.3.0] — earlier

Historical releases prior to the changelog initialization. Consult `git log --oneline` for the full commit history of pre-0.3.1 work.

---

[0.5.0]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.5.0
[0.4.2]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.4.2
[0.4.1]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.4.1
[0.4.0]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.4.0
[0.3.5]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.5
[0.3.4]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.4
[0.3.3]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.3
[0.3.2]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.2
[0.3.1]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.1
[0.3.0]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.0
