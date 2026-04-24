# Changelog

All notable changes to the **skill-advisor** plugin are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.3.4]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.4
[0.3.3]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.3
[0.3.2]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.2
[0.3.1]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.1
[0.3.0]: https://github.com/fernandoxavier02/skill-advisor/releases/tag/v0.3.0
