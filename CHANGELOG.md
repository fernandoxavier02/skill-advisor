# Changelog

All notable changes to the **skill-advisor** plugin are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.4.0]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.4.0
[0.3.5]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.5
[0.3.4]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.4
[0.3.3]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.3
[0.3.2]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.2
[0.3.1]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.1
[0.3.0]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.0
