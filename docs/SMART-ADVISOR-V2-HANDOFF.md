# Smart Advisor v2.0 — Implementation Handoff

## Status

- Branch: `fix/audit-paths-dedup`
- Phase 0 (Refactoring): **COMPLETE** (6/7 items done, 0.7 autoDiscover toggle pending)
- CEO Review: **PASSED** (9/10 adversarial score, 3 rounds, 26 issues fixed)
- Eng Review: **PASSED** (9 issues found, 0 critical gaps, 0 unresolved)
- Outside Voice (Codex): **12 findings**, 4 substantive tensions resolved
- Pipeline completed: `/office-hours` -> `/grill-me` -> `/plan-ceo-review` -> `/plan-eng-review`
- Next step: **Implementation** (F8 -> F0 -> F1 -> ...)

## Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Design Doc (office-hours) | `~/.gstack/projects/fernandoxavier02-skill-advisor/ferna-fix-audit-paths-dedup-design-20260408-220000.md` | Problem statement, demand evidence, 7 features, chosen approach |
| CEO Plan (ceo-review) | `~/.gstack/projects/fernandoxavier02-skill-advisor/ceo-plans/2026-04-08-smart-advisor-v2.md` | Expanded scope (12 features), sub-decisions, constraints, reviewer concerns |
| V2 Design Spec | `.specs/plans/skill-advisor-v2-orchestration-platform.design.md` | Original v2 orchestration platform spec (broader vision, 6 agents) |

## 14 Features (Final Scope — post eng review)

| # | Feature | Priority | Effort | Depends On | Status |
|---|---------|----------|--------|------------|--------|
| F8 | Collision Detection | HIGH | S | semantic.js | TODO |
| F0 | Signal Fusion (semantic+keyword+graph) | HIGH | M | constants.js | TODO |
| F1 | Feedback Loop (affinity scores) | HIGH | M | F8, jsonl.js | TODO |
| F1.3 | "Why this?" Explainer | HIGH | S | F1 | TODO |
| F1.4 | Skill Discovery Nudge | HIGH | S | F1 | TODO |
| F2 | Context-Aware Scoring | HIGH | M | F1, context.js | TODO |
| F3 | Combo Discovery | MEDIUM | M | F1 | TODO |
| F3.2 | Pipeline Replay | MEDIUM | S | F3.1 | TODO |
| F7 | Workflow Templates | MEDIUM | S | F3 | TODO |
| F6 | Session Analytics | MEDIUM | M | F1 | TODO |
| F6.2 | Affinity Heat Map | MEDIUM | S | F6 | TODO |
| F4 | User Profile | MEDIUM | S | F1+F3 | TODO |
| F5 | Obsidian Vault Enriched | LOW | M | F1 | TODO |

**Sequence (revised by eng review):**
F8 -> F0 -> F1 -> F1.3 -> F1.4 -> F2 -> F3 -> F3.2 -> F7 -> F6 -> F6.2 -> F4 -> F5

Changes from CEO plan:
- **F8 moved to first** — collision detection before affinity prevents score splitting between duplicates
- **F0 added** — signal fusion (weighted combo of semantic+keyword+graph) before learning features

## Key Decisions (Grill-Me + CEO Review)

### Technical Decisions
- **F1.1**: Pre-compute affinity scores at build time (`advisor-affinity.json`), not parse JSONL at runtime
- **F1.2**: Canonical storage in `~/.claude/advisor/`
- **F2.1**: Hook uses only branch name + file extensions (git diff/status only in /advisor command)
- **F2.2**: Branch mapping hardcoded: `fix->debug, feat->impl, chore->utility, release->deploy`
- **F2.3**: Unmatched branch patterns fall back to `general` category (no category boost)
- **F3.1**: Enrich `/advisor-feedback` with `executed_sequence` field
- **F6.1**: 90-day rolling retention
- **F7.1**: Syntax: `/advisor --template bugfix` (explicit flag)

### Expansion Decisions (CEO Review)
- **F1.3**: "Why this?" explainer — in `/advisor` output only, not hook. Fields: skill name, score, contributing layer, top terms, context boost
- **F1.4**: Discovery nudge — trigger when `affinityScore > 0.6 AND usageCount == 0`. Max 1 per 30-min window. Pre-computed `advisor-discovery.json` (max 10 entries). Pruned at `/advisor-index` time
- **F3.2**: Pipeline Replay — branch prefix exact match + 50% file extension overlap. Pre-computed `advisor-replay-candidate.json`. Always requires user confirmation
- **F6.2**: Heat map — markdown table in `/advisor-stats`. Trend: `up` if 7d > 30d/4, `down` if 7d==0 AND 30d>0, else `flat`. Vault write only if `vault-pipelines/` exists
- **F8**: Collision detection — cosine_similarity > 0.85, reuses `advisor-embeddings.json`. Warnings-only in v2 (config subcommand deferred)

### Code Quality Decisions
- Extract `lib/jsonl.js` with `readJSONL(path)` and `writeJSON(path, data)` (DRY for 4+ build modules)
- Rename `collision-detect.js` to `build-collisions.js` (follows `build-*` naming convention)

## Engineering Review Decisions (2026-04-09)

### Architecture Decisions (D1-D8)

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | JSONL source data in `~/.claude/advisor/` | Survives plugin reinstalls. Replaces broken path in advisor-feedback.md |
| D2 | Build outputs in `~/.claude/advisor/cache/` | Also survives reinstalls. Only original indexes (lite/full/embeddings/vocab) stay in lib/ |
| D3 | Hook bundle: single `advisor-hook-data.json` | Merges affinity+discovery+replay. Hook does 2 total new reads instead of 4 separate |
| D4 | Hook stays read-only | `lastNudgeTs` written by command path (/advisor). Hook reads from bundle |
| D5 | `readJSONL` defensive with error reporting | Try/catch per line, skip malformed, debugLog counter, return `{data, errorCount}` |
| D6 | Unified 8-category taxonomy | CATEGORY_PATTERNS from build-index.js → constants.js as SSOT. Branch: fix→debugging, feat→implementation, chore→utility, release→deployment |
| D7 | `session_id` joins feedback↔telemetry | Generated in /advisor, included in both JSONL files. build-affinity joins by session_id |
| D8 | `executed_actual` captures real execution | advisor.md appends skill_id after each skill completes. Logs actual, not approved loadout |

### Data Flow

```
                    ~/.claude/advisor/
                    ├── feedback.jsonl      ← /advisor-feedback (with session_id)
                    ├── telemetry.jsonl     ← /advisor step 9 (with session_id + executed_actual)
                    └── cache/
                        ├── advisor-affinity.json        ← build-affinity (joins both JSONL by session_id)
                        ├── advisor-combos.json          ← build-combos (reads telemetry executed_actual)
                        ├── advisor-discovery.json       ← build-discovery (reads affinity + index)
                        ├── advisor-replay-candidate.json ← build-replay (reads combos)
                        ├── advisor-collisions.json      ← build-collisions (reads embeddings)
                        ├── advisor-hook-data.json       ← build-hook-data (merges affinity+discovery+replay)
                        └── advisor-discovery-seen.json  ← /advisor command (lastNudgeTs)

                    lib/  (only original indexes)
                    ├── advisor-index-lite.json     ← build-index
                    ├── advisor-index-full.json     ← build-index
                    ├── advisor-embeddings.json     ← build-embeddings
                    └── advisor-vocab.json          ← build-embeddings
```

### Hook Read Budget (worst case)

1. `lib/advisor-index-lite.json` (existing, ~30KB)
2. `lib/advisor-vocab.json` + `lib/advisor-embeddings.json` (existing, semantic)
3. `~/.claude/advisor/cache/advisor-hook-data.json` (new bundle, <50KB)
4. `~/.claude/advisor/cache/advisor-discovery-seen.json` (conditional — only if hook-data has discovery candidates)

Worst case: 5 reads. Best case (no discovery): 4 reads (same as today + 1).

### Outside Voice Findings (Codex, 12 findings)

4 substantive tensions resolved:
1. **Join key** — session_id added (D7)
2. **executed vs recommended** — executed_actual captures real execution (D8)
3. **Build outputs wiped on reinstall** — moved to ~/.claude/advisor/cache/ (D2)
4. **F8 sequence** — collision detection moved to first (prevents score contamination)

Remaining findings incorporated:
- readJSONL returns {data, errorCount} not just array (D5)
- F0 signal fusion added before learning features

Dismissed findings (with rationale):
- "lastNudgeTs should be in hook" — hook read-only invariant is more important (D4)
- "CATEGORY_PATTERNS too weak" — categories are scoring tilts (+0.2), not gates
- "Plan overcomplexity" — each module follows existing pre-computed-json pattern, horizontal not vertical
- "Windows bash portability" — commands are .md templates executed by Claude, not Node.js
- "F4/F5 sequence" — low priority, recalibration cost minimal

## Constraints

- **Hook budget: <50ms** — `advisor-nudge.cjs` is ephemeral CJS. No async, no model loading, no network
- **Description IS the trigger** — skill routing via `description` field. No separate metadata
- **Zero runtime deps** — only `@huggingface/transformers` at build-time
- **CommonJS** — all `lib/*.js` use `require`/`module.exports`
- **Pre-computed JSON pattern** — each feature = new `build-*.js` module + new JSON output file

## Architecture (V2 additions — post eng review)

### New Build Modules
```
lib/jsonl.js            — shared JSONL read/write utility (defensive per-line, returns {data, errorCount})
lib/build-affinity.js   — feedback.jsonl + telemetry.jsonl -> advisor-affinity.json (joins by session_id)
lib/build-combos.js     — telemetry.jsonl (executed_actual) -> advisor-combos.json
lib/build-discovery.js  — affinity.json + index -> advisor-discovery.json (top 10 unused)
lib/build-replay.js     — combos.json -> advisor-replay-candidate.json
lib/build-collisions.js — embeddings pairwise -> advisor-collisions.json (reuses semantic.js)
lib/build-hook-data.js  — merges affinity+discovery+replay -> advisor-hook-data.json (D3)
lib/context.js          — git branch/diff context signals for scoring
```

### JSON File Locations (post D1/D2)

**In `~/.claude/advisor/` (source data, survives reinstalls):**
```
feedback.jsonl           — [{ts, session_id, helpful_skill, unhelpful_skill, resolved, rating, pipeline_size}]
telemetry.jsonl          — [{ts, session_id, action, loadout_size, top_skill, executed_actual: [...], spec_generated}]
```

**In `~/.claude/advisor/cache/` (pre-computed, survives reinstalls):**
```
advisor-affinity.json         — [{skillId, affinityScore, usageCount, avgRating, lastUsed}]
advisor-combos.json           — [{branchPrefix, sequence: [skillId], count, fileTypes}]
advisor-discovery.json        — [{skillId, affinityScore, name, invocation}] (max 10)
advisor-discovery-seen.json   — {lastNudgeTs: ISO8601, seen: {skillId: lastSeenTs}}
advisor-replay-candidate.json — [{branchPrefix, sequence, fileTypes, count}]
advisor-collisions.json       — [[skillId1, skillId2, similarity]]
advisor-hook-data.json        — {affinity: [...], discovery: [...], replay: [...]}
```

**In `lib/` (original indexes only, shipped with plugin):**
```
advisor-index-lite.json     — (unchanged)
advisor-index-full.json     — (unchanged)
advisor-embeddings.json     — (unchanged)
advisor-vocab.json          — (unchanged)
```

### Hook Changes (advisor-nudge.cjs)
- Read 1 new file: `advisor-hook-data.json` bundle (D3)
- Conditionally read `advisor-discovery-seen.json` if discovery candidates exist
- F0: Signal fusion — weighted average of semantic+keyword+graph scores
- Apply affinity boost from bundle
- Branch-name context boost (F2) using unified category taxonomy (D6)
- Discovery nudge logic (F1.4) with 30-min session cap (reads lastNudgeTs from seen.json)
- Replay hint (F3.2) one-liner
- Hook stays read-only (D4) — NEVER writes to disk

### New Commands
- `/advisor-stats` (F6) — session analytics + heat map (F6.2)

### Enhanced Commands
- `/advisor` — session_id generation (D7), executed_actual tracking (D8), score explainer (F1.3), `--template` flag (F7), combo suggestions (F3), writes to `~/.claude/advisor/` (D1)
- `/advisor-feedback` — fixed path (D1), session_id reference (D7), writes to `~/.claude/advisor/`
- `/advisor-index` — runs new build modules in order: collisions → affinity → combos → discovery → replay → hook-data

## Tests Needed

9 new test files + 4 fixture files (TDD: write failing tests first):

### Test files
1. `tests/jsonl.test.js` — readJSONL (happy, malformed, missing, empty), writeJSON, appendJSONL
2. `tests/build-affinity.test.js` — affinity computation, cold start, malformed, session_id join
3. `tests/build-combos.test.js` — combo extraction, min threshold (3), sequence dedup, executed_actual
4. `tests/build-discovery.test.js` — candidate filtering, ranking, max 10, all-used edge case
5. `tests/build-replay.test.js` — candidate generation, branch matching, tie-breaker (most recent)
6. `tests/build-collisions.test.js` — pairwise similarity, threshold 0.85, self-exclusion, grouping
7. `tests/build-hook-data.test.js` — merge logic, missing inputs graceful degradation
8. `tests/context.test.js` — branch mapping (unified categories), fallback, file extension extraction
9. `tests/advisor-stats.test.js` — analytics aggregation, heat map, 90d rolling

### Fixture files
- `tests/fixtures/jsonl/feedback-valid.jsonl` — 5 entries with session_id
- `tests/fixtures/jsonl/feedback-malformed.jsonl` — mix valid + invalid lines
- `tests/fixtures/jsonl/telemetry-valid.jsonl` — 10 entries with session_id + executed_actual
- `tests/fixtures/jsonl/telemetry-empty.jsonl` — empty file

## Reviewer Concerns (status after eng review)

1. F3.2 tie-breaker → **RESOLVED**: use most recent by timestamp
2. `lastNudgeTs` location → **RESOLVED**: top-level in discovery-seen.json, written by command (D4)
3. F7 Workflow Templates spec → **OPEN**: needs schema/storage/output before implementation
4. F3.2 hook hint branch name → **RESOLVED**: hook reads branch from hook-data bundle context section

## Deferred Items (→ TODOS.md)

### From CEO Review
- Onboarding Flow: guided 5-min tour for cold start (blocked by: F1+F2 maturity)
- Export/Import Affinity Profiles: portability (blocked by: F1+F3+F4 data)
- Zero-Command Auto-Activation: risk too high without proven accuracy
- Time-of-day scoring signal: speculative, no evidence of predictive value
- F8 config subcommand (`/advisor-config default`): deferred, F8 v2 is warnings-only

### From Eng Review
- Signal Fusion v2 (learned weights from feedback): needs ~50+ feedbacks, depends on F0+F1
- Hook timing benchmark: script to measure actual cold-start timing on Windows with antivirus
- Commands bash→cross-platform: .md commands use bash-only (find, date -u, mkdir -p)

## Pending from Phase 0

- Task 0.7: Change `autoDiscover` from `true` to `false` in `.claude-plugin/plugin.json`
  (hook already respects disabled-by-default config, just the manifest flag remains)

---

## Execution Plan

### Prerequisites (before any feature work)
1. **Task 0.7**: Set `autoDiscover: false` in `.claude-plugin/plugin.json`
2. **Extend `lib/paths.js`**: Add `getAdvisorDataDir()`, `getAdvisorCachePath(name)`
3. **Extend `lib/constants.js`**: Add CATEGORIES (8 unified), AFFINITY_PARAMS, DISCOVERY_PARAMS, BRANCH_MAP, FUSION_WEIGHTS
4. **Create `lib/jsonl.js`** + `tests/jsonl.test.js` + fixtures
5. **Create TODOS.md** with deferred items listed above

### Implementation Steps (TDD: tests first for each module)

| Step | Feature | What to build | Files | Depends on |
|------|---------|--------------|-------|------------|
| S1 | Prereqs | paths.js, constants.js, jsonl.js, plugin.json | 4 lib + 1 test + 4 fixtures | — |
| S2 | F8 | build-collisions.js (reuses semantic.js cosineSimilarity) | 1 lib + 1 test | S1 |
| S3 | F0 | Signal fusion in advisor-nudge.cjs (weighted semantic+keyword+graph) | 1 hook modified + update test | S1 |
| S4 | F1 | build-affinity.js (joins feedback+telemetry by session_id) | 1 lib + 1 test | S1 |
| S5 | F1 | Update advisor.md (session_id, executed_actual, write to ~/.claude/advisor/) | 1 command | S1 |
| S6 | F1 | Update advisor-feedback.md (fix path, session_id ref, write to ~/.claude/advisor/) | 1 command | S1 |
| S7 | F1.3 | Score explainer in /advisor output | 1 command update | S4 |
| S8 | F1.4 | build-discovery.js + discovery nudge in hook | 1 lib + 1 test + hook update | S4 |
| S9 | F2 | context.js + branch context boost in hook | 1 lib + 1 test + hook update | S1 |
| S10 | F3 | build-combos.js (reads executed_actual from telemetry) | 1 lib + 1 test | S4, S5 |
| S11 | F3.2 | build-replay.js + replay hint in hook | 1 lib + 1 test + hook update | S10 |
| S12 | — | build-hook-data.js (merges affinity+discovery+replay into bundle) | 1 lib + 1 test | S4, S8, S11 |
| S13 | — | Final hook integration (read bundle, apply all boosts) | 1 hook modified + update test | S3, S9, S12 |
| S14 | F7 | Workflow Templates (--template flag in /advisor) | 1 command update | S10 |
| S15 | F6 | /advisor-stats command + build analytics | 1 command + 1 test | S4 |
| S16 | F6.2 | Heat map in /advisor-stats | 1 command update | S15 |
| S17 | F4 | User profile (derived from execution log, computed on-demand) | 1 lib | S4, S10 |
| S18 | F5 | Vault enrichment (extend build-catalog.js) | 1 lib update | S4 |
| S19 | — | Update advisor-index.md to run all build modules | 1 command | S2-S12 |

### Parallel Lanes (worktree opportunities)

```
Lane A (data pipeline):     S1 → S4 → S10 → S11 → S12
Lane B (independent utils): S2 + S9 (parallel, no shared modules)
Lane C (commands):          S5 + S6 (parallel, independent .md files)

Merge point: S13 (hook integration) needs A + B
Then:        S3 (signal fusion), S8 (discovery), S13 (final hook)
Finally:     S7, S14-S19 (features that build on top)
```

### Verification

After each step:
```bash
npm test  # all 294+ tests must pass (baseline) + new tests
```

After S13 (full hook integration):
```bash
# Manual test: set ADVISOR_ENABLED=true, type a prompt, verify nudge output
ADVISOR_ENABLED=true CLAUDE_USER_PROMPT="quero corrigir um bug" node hooks/advisor-nudge.cjs
```

After S19 (all build modules):
```bash
# Full rebuild: generates all JSON files
node lib/build-index.js && node lib/build-embeddings.js && node lib/build-collisions.js \
  && node lib/build-affinity.js && node lib/build-combos.js && node lib/build-discovery.js \
  && node lib/build-replay.js && node lib/build-hook-data.js
```

---

## Prompt para Implementacao

```
Implementar Smart Advisor v2.0 seguindo o plano de execucao em
docs/SMART-ADVISOR-V2-HANDOFF.md

Todo o planejamento esta completo:
1. /office-hours — design doc APROVADO
2. /grill-me — 9 decisoes tecnicas resolvidas
3. /plan-ceo-review — PASSED (9/10, 12 features)
4. /plan-eng-review — PASSED (9 issues, 8 decisoes arquiteturais D1-D8)
5. Outside voice (Codex) — 12 findings, 4 tensoes resolvidas

Comecar pelo Step S1 (prerequisites): paths.js, constants.js, jsonl.js, plugin.json.
TDD: testes primeiro para cada modulo.

Decisoes arquiteturais estao na secao "Engineering Review Decisions" do handoff doc.
NAO mudar nenhuma decisao D1-D8 sem discutir primeiro.
```
