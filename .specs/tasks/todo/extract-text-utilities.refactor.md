---
title: Extract shared text utilities into lib/text.js
depends_on: []
---

## Initial User Prompt

Phase 0, Task 0.3: Tokenization, accent normalization (NFD), stopwords, and synonym expansion are duplicated between advisor-nudge.cjs and graph-search.js with slightly different implementations. Create lib/text.js with shared utilities and update both consumers. Apply TDD. GitHub issue #3.

## Description

Text processing logic for the Skill Advisor plugin is duplicated across three files with inconsistent implementations:

1. **`hooks/advisor-nudge.cjs` (lines 46-143)** contains the complete implementation: `STOPWORDS` Set (54 PT-BR + EN terms), `SYNONYMS` Map (50+ PT-BR to EN translation pairs), and `tokenize(text)` function (lowercase, NFD accent normalization, punctuation removal, stopword filtering, synonym expansion).

2. **`lib/graph-search.js` (lines 44-51)** contains a simpler `normalizeToken(s)` that only does NFD accent stripping + lowercase + trim. This is a subset of the tokenize pipeline.

3. **`lib/build-graph.js` (line 149)** contains `normalizeAlias(s)` which is identical logic to `normalizeToken(s)` -- the graph-search.js comment explicitly says "Mirrors normalizeAlias() in build-graph.js".

This refactoring extracts all shared text utilities into a single `lib/text.js` module exporting: `normalizeAccents(s)`, `STOPWORDS`, `SYNONYMS`, and `tokenize(text)`. All three consumers are updated to import from the shared module. Existing behavior is preserved exactly -- no logic changes, pure extraction.

### Affected Files

| File | Current Role | Change |
|------|-------------|--------|
| `lib/text.js` | Does not exist | **Create** with all shared exports |
| `hooks/advisor-nudge.cjs` | Has complete text logic | **Remove** local definitions, import from `lib/text.js` |
| `lib/graph-search.js` | Has `normalizeToken()` | **Remove** local function, import `normalizeAccents` from `lib/text.js`, alias as `normalizeToken` for API compat |
| `lib/build-graph.js` | Has `normalizeAlias()` | **Remove** local function, import `normalizeAccents` from `lib/text.js`, alias as `normalizeAlias` for API compat |
| `tests/advisor-nudge.test.js` | Tests tokenize/STOPWORDS from nudge | **Keep working** -- nudge re-exports from text.js |
| `tests/text.test.js` | Does not exist | **Create** comprehensive tests for lib/text.js |

## Acceptance Criteria

- [ ] `lib/text.js` exists and exports: `normalizeAccents`, `STOPWORDS`, `SYNONYMS`, `tokenize`
- [ ] `normalizeAccents(s)` performs NFD decomposition, strips combining marks (U+0300-U+036F), lowercases, and trims
- [ ] `STOPWORDS` is a Set containing all 54 PT-BR + EN stopwords from advisor-nudge.cjs
- [ ] `SYNONYMS` is a Map containing all 50+ PT-BR to EN translation pairs from advisor-nudge.cjs
- [ ] `tokenize(text)` produces identical output to the current advisor-nudge.cjs implementation for all inputs
- [ ] `hooks/advisor-nudge.cjs` imports `tokenize`, `STOPWORDS`, `SYNONYMS` from `../lib/text.js` and has zero local text logic
- [ ] `lib/graph-search.js` imports `normalizeAccents` from `./text.js` (aliased as `normalizeToken`) and has zero local normalize logic
- [ ] `lib/build-graph.js` imports `normalizeAccents` from `./text.js` (aliased as `normalizeAlias`) and has zero local normalize logic
- [ ] `hooks/advisor-nudge.cjs` still exports `tokenize` and `STOPWORDS` (backward-compatible re-export)
- [ ] `lib/graph-search.js` still exports `normalizeToken` (backward-compatible re-export)
- [ ] `tests/text.test.js` exists with tests for all four exports
- [ ] `npm test` passes with zero regressions (all existing tests still green)
- [ ] No logic changes -- pure extraction refactoring, identical behavior

## Architecture Overview

This is a straightforward Extract Module refactoring. The canonical implementation lives in `hooks/advisor-nudge.cjs`. The new `lib/text.js` receives all text processing logic. Consumers import from the shared module and optionally re-export for backward compatibility.

```
BEFORE:
  advisor-nudge.cjs ──── STOPWORDS, SYNONYMS, tokenize() [complete]
  graph-search.js   ──── normalizeToken() [subset]
  build-graph.js    ──── normalizeAlias() [duplicate of normalizeToken]

AFTER:
  lib/text.js ────────── normalizeAccents(), STOPWORDS, SYNONYMS, tokenize()
       │
       ├── advisor-nudge.cjs (imports tokenize, STOPWORDS, SYNONYMS)
       ├── graph-search.js   (imports normalizeAccents as normalizeToken)
       └── build-graph.js    (imports normalizeAccents as normalizeAlias)
```

---

## Implementation Process

### Implementation Strategy

**Approach**: Bottom-Up with TDD (RED-GREEN-REFACTOR)
**Rationale**: The building blocks (normalizeAccents, STOPWORDS, SYNONYMS, tokenize) are well-defined and already working in production. Bottom-up lets us create the shared module with full test coverage first, then rewire consumers with confidence. TDD ensures the extracted module is behaviorally identical before any consumer is touched.

### Phase Overview

```
Phase 1: Setup (test infrastructure)
    |
    v
Phase 2: Foundation (RED - write failing tests)
    |
    v
Phase 3: Core Implementation (GREEN - create lib/text.js)
    |
    v
Phase 4: Consumer Updates (REFACTOR - rewire imports)
    |
    v
Phase 5: Validation (full regression check)
```

---

### Step 1: Write Tests for lib/text.js (RED)

**Goal**: Create comprehensive test file for the not-yet-existing lib/text.js module. Tests must fail because the module does not exist yet.

#### Expected Output

- `tests/text.test.js`: Complete test suite covering normalizeAccents, STOPWORDS, SYNONYMS, tokenize

#### Success Criteria

- [ ] File `tests/text.test.js` exists
- [ ] Tests import from `../lib/text.js` (which does not exist yet)
- [ ] Running `node --test tests/text.test.js` fails with MODULE_NOT_FOUND error (RED phase)
- [ ] Test suite covers all four exports with cases derived from existing `tests/advisor-nudge.test.js`

#### Subtasks

- [ ] Create `tests/text.test.js` with `node:test` and `node:assert/strict`
- [ ] Write `describe('normalizeAccents')` tests:
  - strips accents from Portuguese characters (e.g., "correcao" from "correção")
  - lowercases input
  - trims whitespace
  - handles empty string
  - handles null/undefined gracefully (or documents expected throw)
- [ ] Write `describe('STOPWORDS')` tests:
  - contains PT-BR stopwords (quero, preciso, fazer)
  - contains EN stopwords (the, and, for)
  - is a Set instance
  - has expected size (~54 entries)
- [ ] Write `describe('SYNONYMS')` tests:
  - contains PT-BR->EN pairs (auditar -> audit/review, seguranca -> security/safe)
  - is a Map instance
  - each value is an array of strings
  - has expected size (50+ entries)
- [ ] Write `describe('tokenize')` tests:
  - Port all 8 test cases from `tests/advisor-nudge.test.js` describe('tokenize')
  - Add synonym expansion test: tokenize('auditar') includes 'audit' and 'review'
  - Add combined test: tokenize('correção de segurança') strips accents AND expands synonyms
- [ ] Verify tests fail with MODULE_NOT_FOUND (RED confirmed)

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| File exists | `ls tests/text.test.js` | File found |
| Tests fail (RED) | `node --test tests/text.test.js 2>&1` | Exit code 1, MODULE_NOT_FOUND |
| Import path correct | `grep "require.*lib/text" tests/text.test.js` | `../lib/text.js` or `../lib/text` |
| Test count | `grep -c "it(" tests/text.test.js` | >= 15 test cases |

---

### Step 2: Create lib/text.js (GREEN)

**Goal**: Create the shared text utilities module with all four exports. Copy logic verbatim from advisor-nudge.cjs. Tests from Step 1 must pass.

#### Expected Output

- `lib/text.js`: Module exporting normalizeAccents, STOPWORDS, SYNONYMS, tokenize

#### Success Criteria

- [ ] File `lib/text.js` exists
- [ ] Exports: `normalizeAccents`, `STOPWORDS`, `SYNONYMS`, `tokenize`
- [ ] `normalizeAccents(s)` is extracted from the accent-stripping portion of tokenize (NFD + strip + lowercase + trim)
- [ ] `STOPWORDS` is the exact Set from advisor-nudge.cjs (54 entries)
- [ ] `SYNONYMS` is the exact Map from advisor-nudge.cjs (50+ entries)
- [ ] `tokenize(text)` uses `normalizeAccents` internally (not duplicating the logic)
- [ ] Running `node --test tests/text.test.js` passes (GREEN phase)
- [ ] No external dependencies (pure Node.js)

#### Subtasks

- [ ] Create `lib/text.js` with 'use strict' and JSDoc header
- [ ] Copy STOPWORDS Set verbatim from `hooks/advisor-nudge.cjs` lines 47-54
- [ ] Copy SYNONYMS Map verbatim from `hooks/advisor-nudge.cjs` lines 58-118
- [ ] Extract `normalizeAccents(s)` function: `s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()`
- [ ] Copy `tokenize(text)` from `hooks/advisor-nudge.cjs` lines 122-143, refactored to use `normalizeAccents()` internally
- [ ] Add `module.exports = { normalizeAccents, STOPWORDS, SYNONYMS, tokenize }`
- [ ] Run `node --test tests/text.test.js` and confirm all pass (GREEN)

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| File exists | `ls lib/text.js` | File found |
| Exports correct | `node -e "const t = require('./lib/text'); console.log(Object.keys(t).sort().join(','))"` | `STOPWORDS,SYNONYMS,normalizeAccents,tokenize` |
| Tests pass (GREEN) | `node --test tests/text.test.js` | Exit code 0, all pass |
| No external deps | `grep "require(" lib/text.js` | Only `node:` or no requires |
| STOPWORDS size | `node -e "console.log(require('./lib/text').STOPWORDS.size)"` | 54 |
| SYNONYMS size | `node -e "console.log(require('./lib/text').SYNONYMS.size)"` | >= 50 |

---

### Step 3: Update hooks/advisor-nudge.cjs to Import from lib/text.js

**Goal**: Remove local STOPWORDS, SYNONYMS, and tokenize definitions from advisor-nudge.cjs. Import from lib/text.js instead. Keep backward-compatible exports.

#### Expected Output

- Modified `hooks/advisor-nudge.cjs`: imports from `../lib/text.js`, no local text logic

#### Success Criteria

- [ ] `hooks/advisor-nudge.cjs` has `require('../lib/text')` import
- [ ] Lines 46-143 (STOPWORDS, SYNONYMS, tokenize) removed from advisor-nudge.cjs
- [ ] `module.exports` still includes `tokenize` and `STOPWORDS` (re-exported from text.js)
- [ ] `node --test tests/advisor-nudge.test.js` passes (zero regressions)
- [ ] `node --test tests/text.test.js` still passes

#### Subtasks

- [ ] Add `const { tokenize, STOPWORDS, SYNONYMS } = require('../lib/text');` near top of advisor-nudge.cjs
- [ ] Remove the `// Stopwords` section (lines 46-54)
- [ ] Remove the `// Synonym bridge` section (lines 58-118)
- [ ] Remove the `// Tokenizer` section (lines 122-143)
- [ ] Verify `module.exports` still exports `tokenize` and `STOPWORDS` for backward compat
- [ ] Run `node --test tests/advisor-nudge.test.js` to confirm zero regressions
- [ ] Run `node --test tests/text.test.js` to confirm still green

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| Import present | `grep "require.*lib/text" hooks/advisor-nudge.cjs` | Match found |
| No local STOPWORDS | `grep "^const STOPWORDS = new Set" hooks/advisor-nudge.cjs` | No match |
| No local SYNONYMS | `grep "^const SYNONYMS = new Map" hooks/advisor-nudge.cjs` | No match |
| No local tokenize | `grep "^function tokenize" hooks/advisor-nudge.cjs` | No match |
| Exports intact | `node -e "const m = require('./hooks/advisor-nudge.cjs'); console.log(typeof m.tokenize, typeof m.STOPWORDS)"` | `function object` |
| Nudge tests pass | `node --test tests/advisor-nudge.test.js` | Exit code 0 |
| Text tests pass | `node --test tests/text.test.js` | Exit code 0 |

---

### Step 4: Update lib/graph-search.js to Import from lib/text.js

**Goal**: Remove local normalizeToken definition from graph-search.js. Import normalizeAccents from text.js and alias it. Keep backward-compatible export.

#### Expected Output

- Modified `lib/graph-search.js`: imports normalizeAccents, no local normalize logic

#### Success Criteria

- [ ] `lib/graph-search.js` has `require('./text')` import
- [ ] Local `normalizeToken` function (lines 45-51) removed
- [ ] `normalizeToken` is aliased from `normalizeAccents` in the import or via const
- [ ] `module.exports` still includes `normalizeToken` for backward compat
- [ ] `npm test` passes (all test files)

#### Subtasks

- [ ] Add `const { normalizeAccents } = require('./text');` to imports section
- [ ] Add `const normalizeToken = normalizeAccents;` alias
- [ ] Remove the local `normalizeToken` function (lines 44-51)
- [ ] Verify `module.exports` still exports `normalizeToken`
- [ ] Run `npm test` to confirm zero regressions

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| Import present | `grep "require.*text" lib/graph-search.js` | Match found |
| No local function | `grep "^function normalizeToken" lib/graph-search.js` | No match |
| Export intact | `node -e "const m = require('./lib/graph-search'); console.log(typeof m.normalizeToken)"` | `function` |
| Full test suite | `npm test` | Exit code 0 |

---

### Step 5: Update lib/build-graph.js to Import from lib/text.js

**Goal**: Remove local normalizeAlias definition from build-graph.js. Import normalizeAccents from text.js and alias it.

#### Expected Output

- Modified `lib/build-graph.js`: imports normalizeAccents, no local normalize logic

#### Success Criteria

- [ ] `lib/build-graph.js` has `require('./text')` import
- [ ] Local `normalizeAlias` function removed
- [ ] `normalizeAlias` is aliased from `normalizeAccents`
- [ ] `npm test` passes (all test files)

#### Subtasks

- [ ] Add `const { normalizeAccents } = require('./text');` to imports section
- [ ] Add `const normalizeAlias = normalizeAccents;` alias
- [ ] Remove the local `normalizeAlias` function definition
- [ ] Run `npm test` to confirm zero regressions

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| Import present | `grep "require.*text" lib/build-graph.js` | Match found |
| No local function | `grep "^function normalizeAlias" lib/build-graph.js` | No match |
| Full test suite | `npm test` | Exit code 0 |

---

### Step 6: Final Regression Validation and Cleanup

**Goal**: Run the full test suite, verify no duplication remains, confirm file sizes decreased for consumers.

#### Expected Output

- Clean `npm test` run with all tests passing
- Confirmed zero text-processing duplication across codebase

#### Success Criteria

- [ ] `npm test` exits with code 0
- [ ] `grep -r "normalize.*NFD" hooks/ lib/` only matches `lib/text.js`
- [ ] `grep -r "STOPWORDS" hooks/ lib/` only matches `lib/text.js` (definition) and `hooks/advisor-nudge.cjs` (re-export)
- [ ] `grep -r "SYNONYMS" hooks/ lib/` only matches `lib/text.js` (definition) and `hooks/advisor-nudge.cjs` (import)
- [ ] All acceptance criteria from this task are met

#### Subtasks

- [ ] Run `npm test` and capture output
- [ ] Search for any remaining NFD normalize logic outside `lib/text.js`
- [ ] Search for any remaining STOPWORDS/SYNONYMS definitions outside `lib/text.js`
- [ ] Verify each acceptance criterion manually
- [ ] Mark task as complete

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| All tests pass | `npm test` | Exit code 0, 0 failures |
| Single NFD source | `grep -rl "normalize.*NFD" lib/ hooks/` | Only `lib/text.js` |
| No duplication | `grep -c "new Set\(\[" hooks/advisor-nudge.cjs` | 0 |
| Backward compat | `node -e "const n = require('./hooks/advisor-nudge.cjs'); const g = require('./lib/graph-search'); console.log(typeof n.tokenize, typeof g.normalizeToken)"` | `function function` |

---

## Implementation Summary

| Step | Goal | Output | Est. Effort |
|------|------|--------|-------------|
| 1 | Write failing tests for lib/text.js (RED) | `tests/text.test.js` | S |
| 2 | Create lib/text.js with shared exports (GREEN) | `lib/text.js` | S |
| 3 | Rewire advisor-nudge.cjs imports (REFACTOR) | Modified `hooks/advisor-nudge.cjs` | S |
| 4 | Rewire graph-search.js imports (REFACTOR) | Modified `lib/graph-search.js` | S |
| 5 | Rewire build-graph.js imports (REFACTOR) | Modified `lib/build-graph.js` | S |
| 6 | Final regression validation | Clean test run, zero duplication | S |

**Total Steps**: 6
**Critical Path**: Steps 1 -> 2 -> 3,4,5 (sequential) -> 6
**Parallel Opportunities**: Steps 3, 4, and 5 can run concurrently after Step 2
**Estimated Total Effort**: Small (all steps are Small, total ~2-4 hours)

---

## Risks & Blockers Summary

### High Priority

_None identified -- this is a low-risk pure extraction refactoring._

### Medium Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| Import path differences CJS vs ESM | Med | Low | Project is `"type": "commonjs"` -- use `require()` consistently |
| Existing tests break on import change | Med | Low | Keep backward-compatible re-exports in advisor-nudge.cjs |
| build-graph.js has side effects from removal | Low | Low | normalizeAlias is only used locally -- safe to replace with import |

---

## Definition of Done (Task Level)

- [ ] All 6 implementation steps completed
- [ ] All acceptance criteria verified
- [ ] `tests/text.test.js` exists with >= 15 test cases, all passing
- [ ] `npm test` passes with zero regressions
- [ ] No text-processing logic duplicated outside `lib/text.js`
- [ ] Backward-compatible exports preserved in all consumer modules
- [ ] No logic changes -- identical behavior before and after
