# 00 — Task Orchestrator

**Date:** 2026-04-08
**Request:** Execute corrections from Gemini code review on skill-advisor

---

## Classification

```yaml
ORCHESTRATOR_DECISION:
  request: "Fix 5 issues left by Gemini: dead imports (3), missing debugLog calls in catch blocks, threshold revert question, and restore deleted spec files"
  type: "Bug Fix"
  complexity: "SIMPLES"
  severity: "Medium"
  pipeline_variant: "bugfix-light"
  probable_files:
    - "hooks/advisor-nudge.cjs"
    - "lib/build-embeddings.js"
    - "lib/semantic.js"
    - "lib/advisor-config.json"
    - ".specs/tasks/done/add-structured-error-handling.refactor.md"
    - ".specs/tasks/done/define-data-schemas.refactor.md"
  has_spec: "Yes: .specs/tasks/todo/add-structured-error-handling.refactor.md (deleted, needs restore to done/)"
  execution: "pipeline"
  information_gate:
    status: "RESOLVED"
    gaps_resolved: 1
    gap_detail: "Item 4 (threshold 0.20 -> 0.35) requires user decision — blocked on confirmation"
  user_confirmed: false
  workflow:
    - "Item 1: Add debugLog() calls to silent catch blocks in hooks/advisor-nudge.cjs (lines 38, 42, 84)"
    - "Item 2: Remove unused AdvisorError import from lib/build-embeddings.js"
    - "Item 3: Remove unused ERROR_CODES from lib/semantic.js destructure"
    - "Item 4: DECISION REQUIRED — revert threshold to 0.20 or keep 0.35?"
    - "Item 5: Restore deleted specs to .specs/tasks/done/ (recover from git)"
    - "Run npm test to confirm no regressions"
  risks: >
    - Item 4 is a behavioral change (hook fires less often at 0.35 vs 0.20).
      Reverting without understanding why Gemini changed it could mask a latent issue.
    - advisor-nudge.cjs is a <50ms ephemeral hook — any require() added must be fast.
      debugLog import already added (line 17); calls just need to be placed.
    - Spec files were deleted (not staged as moved). Must recover via git checkout.
```

---

## Gap Analysis (Information Gate)

| Gap | Status | Resolution |
|-----|--------|------------|
| Why did Gemini change threshold 0.20 -> 0.35? | OPEN | User must decide: revert or keep |
| Are catch blocks at lines 38, 42, 84 truly silent (no output)? | RESOLVED | Confirmed — bare `catch {}` with no body |
| Are spec files recoverable from git? | RESOLVED | Files exist in HEAD, `git checkout HEAD -- <file>` will restore |
| Is ERROR_CODES actually unused in semantic.js? | RESOLVED | Confirmed — grep shows no usage of ERROR_CODES after import |

**Blocking gap:** Item 4 (threshold value). All other items are unblocked.

---

## SSOT Conflicts

None detected. `threshold` lives in `lib/advisor-config.json` as single source of truth. No duplication found.

---

## Affected Files Summary

| File | Action | Item |
|------|--------|------|
| `hooks/advisor-nudge.cjs` | Add debugLog() to 3 silent catch blocks (lines 38, 42, 84) | 1 |
| `lib/build-embeddings.js` | Remove `AdvisorError` from require | 2 |
| `lib/semantic.js` | Remove `ERROR_CODES` from destructured require | 3 |
| `lib/advisor-config.json` | DECISION: revert to 0.20 or keep 0.35 | 4 |
| `.specs/tasks/done/add-structured-error-handling.refactor.md` | Restore from git HEAD (was deleted) | 5 |
| `.specs/tasks/done/define-data-schemas.refactor.md` | Restore from git HEAD (was deleted) | 5 |

---

## Complexity Justification

**SIMPLES** — 4 clear mechanical fixes (dead import removal + catch block updates) across isolated files with no cross-cutting concerns. No auth, no data model, no new features. The single gap (threshold) requires 1 user decision but does not elevate complexity. Total LOC change estimated < 20 lines.
