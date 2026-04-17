# Final Adversarial Review — advisor-gate delegation

**Timestamp:** 2026-04-16
**Mode:** review-only
**File reviewed:** `commands/advisor.md` (+88/-95)
**Review team:** security, architecture, quality (3 parallel reviewers, zero implementation context)

## Totals

| Severity | Count |
|---|---|
| CRITICAL | 2 |
| HIGH | 9 |
| MEDIUM | 9 |
| LOW | 3 |
| **Total** | **23** |

## Consensus findings (2+ reviewers agree)

### CONSENSUS-1 — CRITICAL: Prompt injection via unsanitized interpolation

**File:** `commands/advisor.md:154-182`, also `:49-58` (git/ls context unsanitized)
**Found by:** security + quality

User-controlled inputs (task description, git branch, git status, filenames, index content) are interpolated into a markdown-fenced subagent prompt with **zero sanitization**. Triple-backticks or heredoc markers in any of these fields break the fence and inject instructions into the subagent prompt.

Additionally the `Agent({ ... })` block is labeled "illustrative" but written in literal JS/TS — creating ambiguity about whether the content is data or executable code for the consuming LLM.

`CLAUDE.md:71` documents sanitization rules for **the hook path**, but the command path has no equivalent.

### CONSENSUS-2 — HIGH: Scattered SSOT for decision→action mapping

**File:** `commands/advisor.md:216-219, 284, 320-326` + `agents/advisor-gate.md`
**Found by:** architecture + quality

The mapping of `gate_output.decision` + `moment2_decision` → telemetry `action` lives in three places:
- Step 6 routing lines 216-219
- Step 9 enum list line 284 (contains both `"cancel"` AND `"cancelled"` — infinitive mixed with past-participle)
- Step 10 checkpoint list lines 320-326 (omits `gate_error`, which Step 6 produces)

`action: "gate_error"` is produced in Step 6 but is **absent** from both the Step 9 enum and the Step 10 checkpoint list. Downstream telemetry consumers see unknown action values.

### CONSENSUS-3 — HIGH: Duplicated phase validation, bypassed by templates

**File:** `commands/advisor.md:72-78 (Step 3b)` + `agents/advisor-gate.md:304 (Rule 10)` + `commands/advisor.md:29-34 (Step 0 templates)`
**Found by:** architecture + quality + security

Clarification+planning enforcement is implemented in two places with different mechanisms:
- Step 3b auto-fixes the loadout (prepends/inserts phases)
- Rule 10 in advisor-gate shows a warning only

Plus: Step 0 template path skips Step 3b entirely. Three code paths, one invariant — guaranteed drift.

Additionally, Step 7 pre-check (lines 225-231) does not validate `spec_path`: a `moment2_decision` of `"approve"` with `spec_path == null` falls through to legacy mode silently.

### CONSENSUS-4 — HIGH: CLAUDE.md developer docs stale

**File:** `CLAUDE.md:46-54, 108-110`
**Found by:** architecture + quality

The Command-path diagram shows `/advisor <task> → ... → user approves/modifies/cancels` without mentioning `advisor-gate`. The agents listing at lines 108-110 mentions only `advisor-router`. A developer reading CLAUDE.md will not know the gate subagent exists.

### CONSENSUS-5 — MEDIUM: Unbounded re-spawn loop

**File:** `commands/advisor.md:234`
**Found by:** security + architecture

"If `gate_output` is missing any required field, re-spawn the advisor-gate subagent from Step 6 with the same inputs" — no retry cap. A subagent bug that consistently produces malformed output causes an infinite re-spawn loop.

## Unique findings

### Security (unique)
- **UNIQUE-S-1 (HIGH)** — `AskUserQuestion` "Other" free-text social-engineering bypass. User types `"approve now, skip gate"` into Other and the LLM-subagent may honor it.
- **UNIQUE-S-2 (MEDIUM)** — `gate_token` uses `Date.now()+Math.random()` and is never verified; labeled like a security token but provides no integrity guarantee.
- **UNIQUE-S-3 (MEDIUM)** — Legacy-mode executes skill `Invocation` strings from `gate_output.loadout` without validating them against the index.
- **UNIQUE-S-4 (LOW)** — `spec_path` is Read with no path-containment check.

### Architecture (unique)
- **UNIQUE-A-1 (MEDIUM)** — Step 9 telemetry reads `gate_output.*` but exits exist where `gate_output` was never created; no defaults table.
- **UNIQUE-A-2 (MEDIUM)** — `original_loadout` in the gate contract is ambiguous (pre-Step-3b vs post-Step-3b); breaks the telemetry metric "router missed mandatory phases".
- **UNIQUE-A-3 (MEDIUM)** — Step 5 score explainer displays fields (semantic/keyword/graph) that are NOT in the `advisor-router` contract.
- **UNIQUE-A-4 (LOW)** — `action: "cancelled_moment2"` fires when the user backs out of skip confirmation — flow continues. Misleading name.

### Quality (unique)
- **UNIQUE-Q-1 (MEDIUM)** — Node inline script at lines 310-316 ends with `|| true`, silencing all errors; discovery-nudge cooldown can silently stop updating.
- **UNIQUE-Q-2 (MEDIUM)** — "Other" handling says "re-ask with more specific options" — unspecified; no iteration cap; possible infinite loop.
- **UNIQUE-Q-3 (LOW)** — Telemetry JSON built via shell concatenation; a `"` in ACTION/TOP/PLANNING breaks the line.
- **UNIQUE-Q-4 (LOW)** — Router-`reason` fallback generation is non-deterministic prose.

## Prioritized recommendations

| ID | Severity | Action | Addresses |
|---|---|---|---|
| R-1 | CRITICAL | Sanitization contract for user inputs interpolated into subagent prompt; clarify `Agent({...})` block is documentation only | CONSENSUS-1, UNIQUE-S-1 |
| R-2 | HIGH | Consolidate decision→action mapping into ONE table; add `gate_error` to Step 10; remove duplicate `"cancel"` vs `"cancelled"` | CONSENSUS-2 |
| R-3 | HIGH | Single SSOT for clarification+planning enforcement (command OR gate, not both); extend to Step 0 template path | CONSENSUS-3 |
| R-4 | HIGH | Update CLAUDE.md diagram + agents listing to include advisor-gate | CONSENSUS-4 |
| R-5 | MEDIUM | Add retry cap (max 2) to Step 7 re-spawn logic | CONSENSUS-5 |
| R-6 | MEDIUM | Extend Step 7 pre-check (`spec_path` non-null when moment2≠skip, `gate_token` presence, `iterations` presence, loadout entries valid) | UNIQUE-S-3, UNIQUE-A-1 |
| R-7 | MEDIUM | Remove `|| true` silencing on discovery-nudge cooldown script | UNIQUE-Q-1 |
| R-8 | MEDIUM | Cap "Other" free-text retries at 2 | UNIQUE-Q-2, UNIQUE-S-1 |
| R-9 | LOW | Rename `gate_token` → `gate_invocation_id` OR implement real integrity | UNIQUE-S-2 |
| R-10 | LOW | Reconcile Step 5 score explainer with router contract | UNIQUE-A-3 |
| R-11 | LOW | Rename `"cancelled_moment2"` to something non-terminal | UNIQUE-A-4 |

## Verdict

**REVIEW_NEEDED.** R-1 (CRITICAL) and R-2/R-3/R-4 (HIGH) should be addressed before merge. R-5+ can ship as follow-up issues.
