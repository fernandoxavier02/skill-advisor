---
title: Centralize constants in lib/constants.js
depends_on: []
---

## Initial User Prompt

Phase 0, Task 0.2: Scoring weights, BFS parameters, walk limits, staleness threshold, truncation limits, and semantic threshold are hardcoded across 6+ files. Create lib/constants.js grouping by domain (SEARCH_WEIGHTS, WALK_LIMITS, GRAPH_PARAMS, THRESHOLDS) and update all modules to import from it. Apply TDD. GitHub issue #2.

## Description

Magic numbers and configuration values are scattered across 7 files in the skill-advisor codebase. The same logical constants (e.g., MAX_WALK_ENTRIES=10000, MAX_WALK_DEPTH=6) appear in multiple files independently, creating a maintenance burden and a divergence risk if one file is updated but another is not.

This task creates a single `lib/constants.js` module that serves as the SSOT for all tunable parameters, grouped by domain:

- **SEARCH_WEIGHTS** -- keyword scoring weights (NAME_WEIGHT, DESC_WEIGHT, DEFAULT_TOP_N, MAX_SEMANTIC_RESULTS, MAX_DISPLAY_RESULTS)
- **GRAPH_PARAMS** -- BFS traversal parameters (SCORE_BY_HOP, CONVERGENCE_BOOST, CATEGORY_BOOST)
- **WALK_LIMITS** -- filesystem traversal bounds (MAX_ENTRIES, MAX_DEPTH)
- **THRESHOLDS** -- relevance cutoffs (DEFAULT_SCORE, STALENESS_DAYS, SEMANTIC_MIN, LITE_INDEX_BUDGET_KB)
- **TRUNCATION** -- text length limits (LITE_DESC, CONTENT)
- **EMBEDDING** -- vector configuration (DIMENSIONS)

After this refactoring, every consumer imports from `lib/constants.js` instead of defining its own inline values. Existing behavior must remain identical -- zero regressions.

### Constants Inventory

| Constant | Current Value | Source File(s) | Target Group |
|----------|--------------|----------------|--------------|
| NAME_WEIGHT | 3 | hooks/advisor-nudge.cjs:20 | SEARCH_WEIGHTS |
| DESC_WEIGHT | 2 | hooks/advisor-nudge.cjs:21 | SEARCH_WEIGHTS |
| DEFAULT_TOP_N | 5 | lib/semantic.js:91, lib/graph-search.js:180 | SEARCH_WEIGHTS |
| MAX_SEMANTIC_RESULTS | 10 | hooks/advisor-nudge.cjs:222 | SEARCH_WEIGHTS |
| MAX_DISPLAY_RESULTS | 3 | hooks/advisor-nudge.cjs:244 | SEARCH_WEIGHTS |
| SCORE_BY_HOP | [1.0, 0.7, 0.4] | lib/graph-search.js:26 | GRAPH_PARAMS |
| CONVERGENCE_BOOST | 0.15 | lib/graph-search.js:27 | GRAPH_PARAMS |
| CATEGORY_BOOST | 0.2 | lib/graph-search.js:28 | GRAPH_PARAMS |
| MAX_WALK_ENTRIES | 10000 | lib/build-index.js:46, lib/build-catalog.js:12 | WALK_LIMITS |
| MAX_WALK_DEPTH | 6 | lib/build-index.js:58, lib/build-catalog.js:12 | WALK_LIMITS |
| DEFAULT_SCORE_THRESHOLD | 0.20 | hooks/advisor-nudge.cjs:23 | THRESHOLDS |
| STALENESS_DAYS | 7 | hooks/advisor-nudge.cjs:27 | THRESHOLDS |
| SEMANTIC_MIN | 0.15 | lib/semantic.js:101 | THRESHOLDS |
| LITE_INDEX_BUDGET_KB | 100 | lib/build-index.js:317 | THRESHOLDS |
| LITE_DESC_TRUNCATE | 120 | lib/build-index.js:258 | TRUNCATION |
| CONTENT_TRUNCATE | 2000 | lib/build-catalog.js:125,170 | TRUNCATION |
| EMBEDDING_DIMENSIONS | 384 | lib/semantic.js:52, lib/build-embeddings.js:109 | EMBEDDING |

## Acceptance Criteria

- [ ] `lib/constants.js` exists and exports 6 domain groups: SEARCH_WEIGHTS, GRAPH_PARAMS, WALK_LIMITS, THRESHOLDS, TRUNCATION, EMBEDDING
- [ ] Each group is a frozen object (`Object.freeze`) to prevent accidental mutation
- [ ] All 17 constants from the inventory are present with correct values
- [ ] `hooks/advisor-nudge.cjs` imports NAME_WEIGHT, DESC_WEIGHT, STALENESS_DAYS, DEFAULT_SCORE_THRESHOLD, MAX_SEMANTIC_RESULTS, MAX_DISPLAY_RESULTS from `lib/constants.js` -- no local definitions
- [ ] `lib/graph-search.js` imports SCORE_BY_HOP, CONVERGENCE_BOOST, CATEGORY_BOOST from `lib/constants.js` -- no local definitions
- [ ] `lib/build-index.js` imports MAX_WALK_ENTRIES, MAX_WALK_DEPTH, LITE_DESC_TRUNCATE, LITE_INDEX_BUDGET_KB from `lib/constants.js` -- no local definitions
- [ ] `lib/semantic.js` imports SEMANTIC_MIN, DEFAULT_TOP_N, EMBEDDING_DIMENSIONS from `lib/constants.js` -- no local definitions
- [ ] `lib/build-catalog.js` imports MAX_WALK_DEPTH, MAX_WALK_ENTRIES, CONTENT_TRUNCATE from `lib/constants.js` -- no local definitions
- [ ] `lib/build-embeddings.js` imports EMBEDDING_DIMENSIONS from `lib/constants.js` -- no local `.slice(0, 384)`
- [ ] `graph-search.js` continues to re-export SCORE_BY_HOP, CONVERGENCE_BOOST, CATEGORY_BOOST for backward compatibility
- [ ] `advisor-nudge.cjs` continues to export NAME_WEIGHT, DESC_WEIGHT for backward compatibility
- [ ] `npm test` passes with zero regressions
- [ ] New test file `tests/constants.test.js` covers all 6 groups, all 17 values, and freeze behavior

## Architecture Overview

### Module Design

```
lib/constants.js (new - SSOT)
    |
    +-- SEARCH_WEIGHTS { NAME_WEIGHT, DESC_WEIGHT, DEFAULT_TOP_N, MAX_SEMANTIC_RESULTS, MAX_DISPLAY_RESULTS }
    +-- GRAPH_PARAMS   { SCORE_BY_HOP, CONVERGENCE_BOOST, CATEGORY_BOOST }
    +-- WALK_LIMITS    { MAX_ENTRIES, MAX_DEPTH }
    +-- THRESHOLDS     { DEFAULT_SCORE, STALENESS_DAYS, SEMANTIC_MIN, LITE_INDEX_BUDGET_KB }
    +-- TRUNCATION     { LITE_DESC, CONTENT }
    +-- EMBEDDING      { DIMENSIONS }
```

### Consumer Import Pattern

```js
// In lib/*.js files:
const { GRAPH_PARAMS, THRESHOLDS } = require('./constants');

// In hooks/advisor-nudge.cjs (different relative path):
const { SEARCH_WEIGHTS, THRESHOLDS } = require('../lib/constants');
```

### Backward Compatibility

Files that currently export constants (graph-search.js exports SCORE_BY_HOP etc., advisor-nudge.cjs exports NAME_WEIGHT etc.) will continue to re-export them by importing from constants.js and including them in `module.exports`. This prevents breakage for any external consumers.

---

## Implementation Process

### Implementation Strategy

**Approach**: Bottom-Up with TDD (RED-GREEN-REFACTOR)
**Rationale**: The constants module is a pure leaf dependency with zero imports from other project modules. We build the foundation first (test + module), then update consumers one at a time. Each consumer update is independently verifiable via `npm test`.

### Phase Overview

```
Phase 1: RED - Write failing tests for constants module
    |
    v
Phase 2: GREEN - Create lib/constants.js to make tests pass
    |
    v
Phase 3: REFACTOR - Update each consumer file (6 files, parallelizable)
    |
    v
Phase 4: VERIFY - Full regression test pass
```

---

### Step 1: Write Failing Tests for Constants Module (RED)

**Goal**: Define the expected API contract for `lib/constants.js` via tests before any implementation exists.

#### Expected Output

- `tests/constants.test.js`: Test file covering all 6 domain groups, all 17 values, and freeze behavior

#### Success Criteria

- [ ] File `tests/constants.test.js` exists
- [ ] Tests attempt to `require('../lib/constants')` and fail (module not found)
- [ ] Tests verify each group exists as an object: SEARCH_WEIGHTS, GRAPH_PARAMS, WALK_LIMITS, THRESHOLDS, TRUNCATION, EMBEDDING
- [ ] Tests verify each constant value matches expected value (all 17)
- [ ] Tests verify objects are frozen (mutation attempt throws or is silently ignored)
- [ ] Running `node --test tests/constants.test.js` produces RED (all tests fail)

#### Subtasks

- [ ] Create `tests/constants.test.js` with `describe('constants.js')` block
- [ ] Add test: SEARCH_WEIGHTS exports NAME_WEIGHT=3, DESC_WEIGHT=2, DEFAULT_TOP_N=5, MAX_SEMANTIC_RESULTS=10, MAX_DISPLAY_RESULTS=3
- [ ] Add test: GRAPH_PARAMS exports SCORE_BY_HOP=[1.0,0.7,0.4], CONVERGENCE_BOOST=0.15, CATEGORY_BOOST=0.2
- [ ] Add test: WALK_LIMITS exports MAX_ENTRIES=10000, MAX_DEPTH=6
- [ ] Add test: THRESHOLDS exports DEFAULT_SCORE=0.20, STALENESS_DAYS=7, SEMANTIC_MIN=0.15, LITE_INDEX_BUDGET_KB=100
- [ ] Add test: TRUNCATION exports LITE_DESC=120, CONTENT=2000
- [ ] Add test: EMBEDDING exports DIMENSIONS=384
- [ ] Add test: all groups are frozen (Object.isFrozen returns true)
- [ ] Add test: mutation attempt on a group property does not change the value
- [ ] Run `node --test tests/constants.test.js` and confirm RED output

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| File exists | `ls tests/constants.test.js` | File found |
| Tests fail (RED) | `node --test tests/constants.test.js 2>&1` | Exit code != 0, "MODULE_NOT_FOUND" or similar |
| Test count | `grep -c "it(" tests/constants.test.js` | >= 8 test cases |

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: None
**Blockers**: None
**Risks**: None

---

### Step 2: Create lib/constants.js (GREEN)

**Goal**: Implement the constants module with all 6 domain groups so that Step 1 tests pass.

#### Expected Output

- `lib/constants.js`: Constants module with frozen domain-grouped objects

#### Success Criteria

- [ ] File `lib/constants.js` exists
- [ ] Module uses `'use strict'` and CommonJS (`module.exports`)
- [ ] All 6 groups exported: SEARCH_WEIGHTS, GRAPH_PARAMS, WALK_LIMITS, THRESHOLDS, TRUNCATION, EMBEDDING
- [ ] Each group is `Object.freeze()`-d
- [ ] All 17 constant values match the inventory exactly
- [ ] Running `node --test tests/constants.test.js` produces GREEN (all tests pass)

#### Subtasks

- [ ] Create `lib/constants.js` with `'use strict'` header and JSDoc comment explaining purpose
- [ ] Define SEARCH_WEIGHTS object with NAME_WEIGHT=3, DESC_WEIGHT=2, DEFAULT_TOP_N=5, MAX_SEMANTIC_RESULTS=10, MAX_DISPLAY_RESULTS=3
- [ ] Define GRAPH_PARAMS object with SCORE_BY_HOP=[1.0,0.7,0.4], CONVERGENCE_BOOST=0.15, CATEGORY_BOOST=0.2
- [ ] Define WALK_LIMITS object with MAX_ENTRIES=10000, MAX_DEPTH=6
- [ ] Define THRESHOLDS object with DEFAULT_SCORE=0.20, STALENESS_DAYS=7, SEMANTIC_MIN=0.15, LITE_INDEX_BUDGET_KB=100
- [ ] Define TRUNCATION object with LITE_DESC=120, CONTENT=2000
- [ ] Define EMBEDDING object with DIMENSIONS=384
- [ ] Apply Object.freeze() to each group
- [ ] Export all groups via module.exports
- [ ] Run `node --test tests/constants.test.js` and confirm GREEN

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| File exists | `ls lib/constants.js` | File found |
| Tests pass (GREEN) | `node --test tests/constants.test.js` | Exit code 0, all pass |
| Freeze check | `node -e "const c = require('./lib/constants'); console.log(Object.isFrozen(c.GRAPH_PARAMS))"` | `true` |
| Value spot-check | `node -e "const c = require('./lib/constants'); console.log(c.GRAPH_PARAMS.SCORE_BY_HOP)"` | `[1, 0.7, 0.4]` |

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Step 1
**Blockers**: None
**Risks**: None

---

### Step 3: Update hooks/advisor-nudge.cjs to Import from Constants

**Goal**: Replace inline constant definitions in advisor-nudge.cjs with imports from lib/constants.js. Maintain backward-compatible exports.

#### Expected Output

- Modified `hooks/advisor-nudge.cjs`: imports from `../lib/constants`, removes local definitions, re-exports for backward compat

#### Success Criteria

- [ ] advisor-nudge.cjs imports SEARCH_WEIGHTS and THRESHOLDS from `../lib/constants`
- [ ] Local `const NAME_WEIGHT = 3` and `const DESC_WEIGHT = 2` lines removed
- [ ] Local `const STALENESS_DAYS = 7` line removed
- [ ] Hardcoded `0.20` in threshold fallback uses THRESHOLDS.DEFAULT_SCORE
- [ ] Hardcoded `10` in semantic results limit uses SEARCH_WEIGHTS.MAX_SEMANTIC_RESULTS
- [ ] Hardcoded `3` in `top.slice(0, 3)` uses SEARCH_WEIGHTS.MAX_DISPLAY_RESULTS
- [ ] `module.exports` still includes `NAME_WEIGHT` and `DESC_WEIGHT` (backward compat)
- [ ] `npm test` passes (existing advisor-nudge tests still green)

#### Subtasks

- [ ] Add `const { SEARCH_WEIGHTS, THRESHOLDS } = require('../lib/constants');` at top of hooks/advisor-nudge.cjs
- [ ] Replace `const NAME_WEIGHT = 3;` with `const { NAME_WEIGHT, DESC_WEIGHT, MAX_SEMANTIC_RESULTS, MAX_DISPLAY_RESULTS } = SEARCH_WEIGHTS;`
- [ ] Replace `const DESC_WEIGHT = 2;` -- removed (covered by destructure above)
- [ ] Replace `const STALENESS_DAYS = 7;` with `const { STALENESS_DAYS, DEFAULT_SCORE } = THRESHOLDS;`
- [ ] Update threshold fallback from hardcoded `0.20` to `THRESHOLDS.DEFAULT_SCORE`
- [ ] Update `semanticSearch(promptTokens, 10)` to use `MAX_SEMANTIC_RESULTS`
- [ ] Update `scored.slice(0, 3)` to use `MAX_DISPLAY_RESULTS`
- [ ] Verify module.exports still includes NAME_WEIGHT, DESC_WEIGHT
- [ ] Run `node --test tests/advisor-nudge.test.js` and confirm GREEN

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| No local NAME_WEIGHT def | `grep "const NAME_WEIGHT = 3" hooks/advisor-nudge.cjs` | No match |
| Import present | `grep "require.*constants" hooks/advisor-nudge.cjs` | Match found |
| Backward compat | `node -e "const m = require('./hooks/advisor-nudge.cjs'); console.log(m.NAME_WEIGHT)"` | `3` |
| Tests pass | `node --test tests/advisor-nudge.test.js` | Exit code 0 |

**Complexity**: Medium
**Uncertainty**: Low
**Dependencies**: Step 2
**Blockers**: None
**Risks**: CJS require path from hooks/ to lib/ -- must use `../lib/constants` (already confirmed in existing code pattern at line 167)

---

### Step 4: Update lib/graph-search.js to Import from Constants

**Goal**: Replace inline BFS scoring constants in graph-search.js with imports from lib/constants.js. Maintain backward-compatible exports.

#### Expected Output

- Modified `lib/graph-search.js`: imports from `./constants`, removes local definitions, re-exports for backward compat

#### Success Criteria

- [ ] graph-search.js imports GRAPH_PARAMS from `./constants`
- [ ] Local `const SCORE_BY_HOP`, `const CONVERGENCE_BOOST`, `const CATEGORY_BOOST` lines removed
- [ ] `module.exports` still includes SCORE_BY_HOP, CONVERGENCE_BOOST, CATEGORY_BOOST (backward compat)
- [ ] `npm test` passes

#### Subtasks

- [ ] Add `const { GRAPH_PARAMS } = require('./constants');` at top of lib/graph-search.js
- [ ] Replace three local const declarations with `const { SCORE_BY_HOP, CONVERGENCE_BOOST, CATEGORY_BOOST } = GRAPH_PARAMS;`
- [ ] Verify module.exports still includes all three constants
- [ ] Run `npm test` and confirm GREEN

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| No local SCORE_BY_HOP def | `grep "const SCORE_BY_HOP = " lib/graph-search.js` | No match |
| Import present | `grep "require.*constants" lib/graph-search.js` | Match found |
| Backward compat | `node -e "const m = require('./lib/graph-search'); console.log(m.SCORE_BY_HOP)"` | `[1, 0.7, 0.4]` |
| Tests pass | `npm test` | Exit code 0 |

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Step 2
**Blockers**: None
**Risks**: None

---

### Step 5: Update lib/build-index.js to Import from Constants

**Goal**: Replace inline walk limits and truncation constants in build-index.js with imports from lib/constants.js.

#### Expected Output

- Modified `lib/build-index.js`: imports from `./constants`, removes local definitions

#### Success Criteria

- [ ] build-index.js imports WALK_LIMITS, TRUNCATION, THRESHOLDS from `./constants`
- [ ] Local `const MAX_WALK_ENTRIES = 10000` line removed
- [ ] Hardcoded `6` in `depth > 6` uses WALK_LIMITS.MAX_DEPTH
- [ ] Hardcoded `120` in `truncate(e.description, 120)` uses TRUNCATION.LITE_DESC
- [ ] Hardcoded `100` in lite index budget warning uses THRESHOLDS.LITE_INDEX_BUDGET_KB
- [ ] `npm test` passes (existing build-index tests still green)

#### Subtasks

- [ ] Add `const { WALK_LIMITS, TRUNCATION, THRESHOLDS } = require('./constants');` at top of lib/build-index.js
- [ ] Replace `const MAX_WALK_ENTRIES = 10000;` with destructure from WALK_LIMITS
- [ ] Replace hardcoded `6` in walk depth check with `WALK_LIMITS.MAX_DEPTH`
- [ ] Replace `truncate(e.description, 120)` with `truncate(e.description, TRUNCATION.LITE_DESC)`
- [ ] Replace `100` in budget check with `THRESHOLDS.LITE_INDEX_BUDGET_KB`
- [ ] Run `node --test tests/build-index.test.js` and confirm GREEN

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| No local MAX_WALK_ENTRIES | `grep "const MAX_WALK_ENTRIES = 10000" lib/build-index.js` | No match |
| Import present | `grep "require.*constants" lib/build-index.js` | Match found |
| Tests pass | `node --test tests/build-index.test.js` | Exit code 0 |

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Step 2
**Blockers**: None
**Risks**: None

---

### Step 6: Update lib/semantic.js to Import from Constants

**Goal**: Replace inline semantic threshold and embedding dimension in semantic.js with imports from lib/constants.js.

#### Expected Output

- Modified `lib/semantic.js`: imports from `./constants`, removes hardcoded values

#### Success Criteria

- [ ] semantic.js imports THRESHOLDS, SEARCH_WEIGHTS, EMBEDDING from `./constants`
- [ ] Hardcoded `0.15` threshold in semanticSearch uses THRESHOLDS.SEMANTIC_MIN
- [ ] Hardcoded `5` default topN in semanticSearch uses SEARCH_WEIGHTS.DEFAULT_TOP_N
- [ ] Hardcoded `384` dimension in queryEmbedding uses EMBEDDING.DIMENSIONS
- [ ] `npm test` passes

#### Subtasks

- [ ] Add `const { THRESHOLDS, SEARCH_WEIGHTS, EMBEDDING } = require('./constants');` at top of lib/semantic.js
- [ ] Replace `const dim = 384;` with `const dim = EMBEDDING.DIMENSIONS;`
- [ ] Replace `score > 0.15` with `score > THRESHOLDS.SEMANTIC_MIN`
- [ ] Replace default `topN = 5` with `topN = SEARCH_WEIGHTS.DEFAULT_TOP_N`
- [ ] Run `npm test` and confirm GREEN

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| No hardcoded 0.15 | `grep "score > 0.15" lib/semantic.js` | No match |
| Import present | `grep "require.*constants" lib/semantic.js` | Match found |
| Tests pass | `npm test` | Exit code 0 |

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Step 2
**Blockers**: None
**Risks**: None

---

### Step 7: Update lib/build-catalog.js to Import from Constants

**Goal**: Replace inline walk limits and content truncation in build-catalog.js with imports from lib/constants.js.

#### Expected Output

- Modified `lib/build-catalog.js`: imports from `./constants`, removes hardcoded default values

#### Success Criteria

- [ ] build-catalog.js imports WALK_LIMITS and TRUNCATION from `./constants`
- [ ] `walkDir` function default parameters use WALK_LIMITS.MAX_DEPTH and WALK_LIMITS.MAX_ENTRIES
- [ ] Hardcoded `2000` content truncation uses TRUNCATION.CONTENT
- [ ] `npm test` passes

#### Subtasks

- [ ] Add `const { WALK_LIMITS, TRUNCATION } = require('./constants');` at top of lib/build-catalog.js
- [ ] Update `walkDir(dir, maxDepth = 6, maxEntries = 10000)` defaults to use `WALK_LIMITS.MAX_DEPTH` and `WALK_LIMITS.MAX_ENTRIES`
- [ ] Replace both `content.length > 2000` and `content.substring(0, 2000)` with TRUNCATION.CONTENT
- [ ] Run `npm test` and confirm GREEN

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| No hardcoded 10000 default | `grep "maxEntries = 10000" lib/build-catalog.js` | No match |
| No hardcoded 2000 | `grep "2000" lib/build-catalog.js` | No match |
| Import present | `grep "require.*constants" lib/build-catalog.js` | Match found |
| Tests pass | `npm test` | Exit code 0 |

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Step 2
**Blockers**: None
**Risks**: None

---

### Step 8: Update lib/build-embeddings.js to Import from Constants

**Goal**: Replace inline embedding dimension in build-embeddings.js with import from lib/constants.js.

#### Expected Output

- Modified `lib/build-embeddings.js`: imports from `./constants`, removes hardcoded `.slice(0, 384)`

#### Success Criteria

- [ ] build-embeddings.js imports EMBEDDING from `./constants`
- [ ] Both `.slice(0, 384)` calls use `EMBEDDING.DIMENSIONS`
- [ ] `npm test` passes

#### Subtasks

- [ ] Add `const { EMBEDDING } = require('./constants');` at top of lib/build-embeddings.js
- [ ] Replace `.slice(0, 384)` at line 109 with `.slice(0, EMBEDDING.DIMENSIONS)`
- [ ] Replace `.slice(0, 384)` at line 126 with `.slice(0, EMBEDDING.DIMENSIONS)`
- [ ] Run `npm test` and confirm GREEN

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| No hardcoded 384 | `grep "slice(0, 384)" lib/build-embeddings.js` | No match |
| Import present | `grep "require.*constants" lib/build-embeddings.js` | Match found |
| Tests pass | `npm test` | Exit code 0 |

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Step 2
**Blockers**: None
**Risks**: None

---

### Step 9: Full Regression Verification

**Goal**: Run the complete test suite and verify no regressions. Confirm no residual hardcoded constants remain.

#### Expected Output

- Clean `npm test` pass
- Grep audit showing no residual hardcoded values

#### Success Criteria

- [ ] `npm test` exits with code 0, all test files pass
- [ ] `grep -rn "const NAME_WEIGHT = 3" hooks/ lib/` returns no matches
- [ ] `grep -rn "const SCORE_BY_HOP = " lib/` returns no matches
- [ ] `grep -rn "const MAX_WALK_ENTRIES = 10000" lib/` returns no matches
- [ ] `grep -rn "score > 0.15" lib/semantic.js` returns no matches
- [ ] `grep -rn "slice(0, 384)" lib/` returns no matches
- [ ] `grep -rn "maxEntries = 10000" lib/` returns no matches

#### Subtasks

- [ ] Run `npm test` and capture full output
- [ ] Run grep audit for all 17 constants to confirm none remain as inline definitions
- [ ] Verify backward compat: `node -e "const g = require('./lib/graph-search'); console.log(g.SCORE_BY_HOP)"`
- [ ] Verify backward compat: `node -e "const n = require('./hooks/advisor-nudge.cjs'); console.log(n.NAME_WEIGHT)"`

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| All tests pass | `npm test` | Exit code 0 |
| No stale constants | `grep -rn "const NAME_WEIGHT = 3" hooks/ lib/` | No output |
| Backward compat graph | `node -e "const g = require('./lib/graph-search'); console.log(g.SCORE_BY_HOP)"` | `[1, 0.7, 0.4]` |
| Backward compat nudge | `node -e "const n = require('./hooks/advisor-nudge.cjs'); console.log(n.NAME_WEIGHT)"` | `3` |

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Steps 3-8 (all consumer updates)
**Blockers**: None
**Risks**: None

---

## Implementation Summary

| Step | Goal | Output | Est. Effort |
|------|------|--------|-------------|
| 1 | Write failing tests (RED) | `tests/constants.test.js` | S |
| 2 | Create constants module (GREEN) | `lib/constants.js` | S |
| 3 | Update advisor-nudge.cjs | Modified `hooks/advisor-nudge.cjs` | M |
| 4 | Update graph-search.js | Modified `lib/graph-search.js` | S |
| 5 | Update build-index.js | Modified `lib/build-index.js` | S |
| 6 | Update semantic.js | Modified `lib/semantic.js` | S |
| 7 | Update build-catalog.js | Modified `lib/build-catalog.js` | S |
| 8 | Update build-embeddings.js | Modified `lib/build-embeddings.js` | S |
| 9 | Full regression verification | Clean test pass + grep audit | S |

**Total Steps**: 9
**Critical Path**: Steps 1 -> 2 -> [3,4,5,6,7,8] -> 9
**Parallel Opportunities**: Steps 3, 4, 5, 6, 7, 8 can all run concurrently (each is independent once Step 2 is complete)

---

## Risks & Blockers Summary

### High Priority

None.

### Medium Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| CJS require path from hooks/ to lib/ | Low | Low | Path `../lib/constants` already proven by `semantic` require at advisor-nudge.cjs:167 |
| Frozen objects break mutation in tests | Low | Low | Tests already use constants as read-only; freeze only prevents accidental writes |

### Low Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| External consumers depend on old exports | Low | Low | Backward compat re-exports maintained in graph-search.js and advisor-nudge.cjs |

---

## Definition of Done (Task Level)

- [ ] All 9 implementation steps completed
- [ ] All acceptance criteria verified
- [ ] `tests/constants.test.js` exists with >= 8 test cases, all passing
- [ ] `lib/constants.js` exists with 6 frozen domain groups, 17 constants
- [ ] All 6 consumer files import from `lib/constants.js`
- [ ] Zero inline magic numbers remain for inventoried constants
- [ ] Backward-compatible exports maintained
- [ ] `npm test` passes with zero regressions
- [ ] No high-priority risks unaddressed
