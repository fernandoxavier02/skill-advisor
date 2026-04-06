---
title: Unify parseFrontmatter into lib/frontmatter.js
depends_on: []
---

## Initial User Prompt

Phase 0, Task 0.1: Two different parseFrontmatter implementations exist in build-index.js and build-graph.js. The graph version handles YAML lists and inline arrays; the index version does not. Extract the more capable version into lib/frontmatter.js, update both consumers, and apply TDD — write comprehensive tests BEFORE refactoring. GitHub issue #1.

# Description

This task extracts the duplicated `parseFrontmatter` function into a shared `lib/frontmatter.js` module as Phase 0 groundwork for the Skill Advisor v2.0 evolution. Two separate implementations currently exist: `build-index.js` has a simpler version that handles plain scalars, multiline pipe values, and BOM stripping; `build-graph.js` has a more capable version that additionally handles YAML dash lists, inline arrays, and boolean/number/null coercion. This divergence means future enhancements to frontmatter parsing must be applied twice, risking silent bugs from inconsistency.

The unified module merges all capabilities from both implementations: BOM stripping from the index version plus YAML list/array/coercion support from the graph version. Both consumers (`build-index.js` and `build-graph.js`) are then updated to import from this shared module, removing their local copies entirely. The function signature `parseFrontmatter(content: string) → object | null` and its return contract remain identical to ensure zero behavior change in any consumer.

TDD methodology governs execution order: comprehensive tests for `lib/frontmatter.js` must be written and committed BEFORE the module is created. These tests will fail initially (RED phase), then pass once the module is extracted (GREEN phase). All pre-existing tests must continue to pass throughout the entire refactor.

**Scope**:
- Included:
  - Create `lib/frontmatter.js` as a CommonJS module exporting `parseFrontmatter` (and `coerceScalar` for testability)
  - Create `tests/frontmatter.test.js` with comprehensive tests covering all YAML variants (tests written before the module exists)
  - Update `build-index.js` to remove its local `parseFrontmatter` definition and import from `lib/frontmatter.js`
  - Update `build-graph.js` to remove its local `parseFrontmatter` and `coerceScalar` definitions and import from `lib/frontmatter.js`
  - Verify all pre-existing tests in `build-index.test.js` continue to pass with zero modifications
- Excluded:
  - Changes to any other module (`build-catalog.js`, `graph-search.js`, `semantic.js`, hooks, agents, commands)
  - New YAML parsing capabilities beyond what the two existing implementations already support combined
  - Any change to the behavior of existing consumers
  - Changes to the function signature or return type contract

**User Scenarios**:
1. **Primary Flow**: Developer writes `frontmatter.test.js` importing from `lib/frontmatter.js` (RED — tests fail because module does not exist) → Developer creates `lib/frontmatter.js` with unified implementation (GREEN — new tests pass) → Developer updates both consumers to remove local copies → All tests pass with zero modifications to pre-existing tests
2. **Alternative Flow**: During consumer update, any additional file found to contain a local `parseFrontmatter` is flagged for a follow-up task (not addressed in this task's scope)
3. **Error Handling**: `parseFrontmatter` returns `null` for missing frontmatter, empty frontmatter block, or non-string input without throwing; handles BOM, CRLF, and malformed inline arrays gracefully

---

## Acceptance Criteria

### Functional Requirements

- [ ] **Module exports parseFrontmatter**: `lib/frontmatter.js` exists as a CommonJS module and exports `parseFrontmatter` as a function.
  - Given: `lib/frontmatter.js` has been created
  - When: `require('./lib/frontmatter')` is called
  - Then: the returned object has a `parseFrontmatter` property that is a function

- [ ] **Basic scalar parsing**: The unified parser correctly reads plain key-value pairs from the frontmatter block.
  - Given: markdown content with `name: test-skill` and `description: A test skill` in frontmatter
  - When: `parseFrontmatter(content)` is called
  - Then: the returned object contains `{ name: 'test-skill', description: 'A test skill' }`

- [ ] **No frontmatter returns null**: Content without frontmatter delimiters does not produce a partial result.
  - Given: plain text content with no `---` delimiters
  - When: `parseFrontmatter(content)` is called
  - Then: the return value is `null`

- [ ] **Empty frontmatter block returns null**: A document with `---\n---` (no key-value pairs between delimiters) is treated as having no parseable frontmatter.
  - Given: content `---\n---\n\nBody text`
  - When: `parseFrontmatter(content)` is called
  - Then: the return value is `null`

- [ ] **YAML dash list parsed as array**: A key whose value is a multi-line indented dash list is returned as a JavaScript array.
  - Given: frontmatter with `aliases:\n  - item1\n  - item2`
  - When: `parseFrontmatter(content)` is called
  - Then: `result.aliases` is `['item1', 'item2']`

- [ ] **Inline array parsed as array**: A key with an inline bracket array is returned as a JavaScript array.
  - Given: frontmatter with `aliases: [item1, item2, item3]`
  - When: `parseFrontmatter(content)` is called
  - Then: `result.aliases` is `['item1', 'item2', 'item3']`

- [ ] **Boolean coercion**: String values `true` and `false` are returned as JavaScript booleans, not strings.
  - Given: frontmatter with `destructive: false` and `requires_user_input: true`
  - When: `parseFrontmatter(content)` is called
  - Then: `result.destructive === false` (boolean) and `result.requires_user_input === true` (boolean)

- [ ] **Number coercion**: String values that are valid numbers are returned as JavaScript numbers.
  - Given: frontmatter with `estimated_tokens: 5000`
  - When: `parseFrontmatter(content)` is called
  - Then: `result.estimated_tokens === 5000` (number, not string `'5000'`)

- [ ] **Null coercion**: String values `null` and `~` are returned as JavaScript `null`.
  - Given: frontmatter with `category: null` and `domain: ~`
  - When: `parseFrontmatter(content)` is called
  - Then: `result.category === null` and `result.domain === null`

- [ ] **BOM stripping**: Content beginning with a UTF-8 BOM (`\uFEFF`) is parsed correctly without returning null or including the BOM in key names.
  - Given: content `\uFEFF---\nname: bom-skill\n---\n\nBody`
  - When: `parseFrontmatter(content)` is called
  - Then: the return value is `{ name: 'bom-skill' }` (not null, no BOM artifact in key)

- [ ] **CRLF line endings handled**: Content with Windows CRLF line endings (`\r\n`) is parsed identically to LF-only content.
  - Given: frontmatter content using `\r\n` as line separator
  - When: `parseFrontmatter(content)` is called
  - Then: the return value is identical to parsing the same content with `\n` line endings

- [ ] **Consumers have no local copy**: After the refactor, neither `build-index.js` nor `build-graph.js` contain a local `parseFrontmatter` function definition.
  - Given: the refactor is complete
  - When: `build-index.js` and `build-graph.js` are inspected for a local `parseFrontmatter` function
  - Then: no local function definition is found in either file; both files import `parseFrontmatter` from `lib/frontmatter.js`

- [ ] **Zero regressions in pre-existing tests**: All tests in `tests/build-index.test.js` that were passing before the refactor continue to pass after the refactor with no modifications to those test files.
  - Given: the refactor is complete and consumers are updated
  - When: `npm test` is executed
  - Then: all pre-existing test cases pass and no new test failures appear in `build-index.test.js`

### Non-Functional Requirements

- [ ] **No new runtime dependencies**: `lib/frontmatter.js` uses only Node.js built-in APIs. No `package.json` dependency additions are required.
- [ ] **CommonJS module format**: `lib/frontmatter.js` uses `require`/`module.exports` syntax, not ESM `import`/`export`.
- [ ] **Node.js 18 compatibility**: The module and its tests run without errors on Node.js 18 using `node --test`.

### Definition of Done

- [ ] `tests/frontmatter.test.js` exists and covers all acceptance criteria above
- [ ] `tests/frontmatter.test.js` was committed/written before `lib/frontmatter.js` was created (TDD Red-Green order)
- [ ] `lib/frontmatter.js` exists and exports `parseFrontmatter`
- [ ] `build-index.js` has no local `parseFrontmatter` definition and imports from `lib/frontmatter.js`
- [ ] `build-graph.js` has no local `parseFrontmatter` or `coerceScalar` definition and imports from `lib/frontmatter.js`
- [ ] `npm test` passes with zero failures
- [ ] No modifications made to `tests/build-index.test.js` (existing tests must pass as-is)

---

## Implementation Process

You MUST launch for each step a separate agent, instead of performing all steps yourself. And for each step marked as parallel, you MUST launch separate agents in parallel.

**CRITICAL:** For each agent you MUST:
1. Use the **Agent** type specified in the step (e.g., `haiku`, `sonnet`, `sdd:developer`)
2. Provide path to task file and prompt which step to implement
3. Require agent to implement exactly that step, not more, not less, not other steps

### Implementation Strategy

**Approach**: Bottom-Up (TDD Red-Green-Refactor)
**Rationale**: TDD methodology is mandated by the task. Tests define the contract first (RED), then the unified module satisfies them (GREEN), then consumers are rewired to use the shared module (REFACTOR). Each step builds on the previous and produces verifiable progress.

### Parallelization Overview

```
Step 1 (TDD RED - Write tests) [sdd:developer / opus]
    |
    v
Step 2 (TDD GREEN - Create module) [sdd:developer / opus]
    |
    +---------------+
    v               v
Step 3            Step 4
(build-index.js)  (build-graph.js)
[sdd:developer    [sdd:developer
 / sonnet]         / sonnet]
(MUST parallel)   (MUST parallel)
    +-------+-------+
            |
            v
        Step 5
    (Verification)
    [general-purpose (haiku)]
```

---

### Step 1: Write tests/frontmatter.test.js (TDD RED Phase)

**Model:** opus
**Agent:** sdd:developer
**Depends on:** None
**Parallel with:** None

**Goal**: Create comprehensive tests for the unified `parseFrontmatter` module BEFORE it exists. Tests will fail with `MODULE_NOT_FOUND` — this is the expected RED state.

**Phase**: 1 — TDD RED
**Complexity**: Medium
**Uncertainty**: Low

#### Expected Output

- `tests/frontmatter.test.js`: Comprehensive test file with ~19 test cases covering all acceptance criteria

#### Success Criteria

- [ ] File `tests/frontmatter.test.js` exists
- [ ] File imports `parseFrontmatter` and `coerceScalar` from `../lib/frontmatter`
- [ ] Uses `node:test` (`describe`, `it`) and `node:assert/strict` — same pattern as `tests/build-index.test.js`
- [ ] Running `node --test tests/frontmatter.test.js` fails with `MODULE_NOT_FOUND` (RED state confirmed)
- [ ] Test cases cover ALL 13 functional acceptance criteria from this task

#### Subtasks

- [ ] Create `tests/frontmatter.test.js` with imports from `../lib/frontmatter`
- [ ] Write `describe('parseFrontmatter')` block with these test cases:
  - [ ] Basic key:value string extraction (`name: test-skill`, `description: A test skill`)
  - [ ] Returns null for content without frontmatter delimiters
  - [ ] Returns null for empty frontmatter block (`---\n---`)
  - [ ] BOM-prefixed content strips BOM and parses correctly
  - [ ] Windows CRLF line endings parsed identically to LF
  - [ ] Double-quoted values (`"value"`) strip quotes
  - [ ] Single-quoted values (`'value'`) strip quotes
  - [ ] Inline array `key: [a, b, c]` returns JavaScript array
  - [ ] Inline array with spaces `key: [ a , b ]` trims elements
  - [ ] YAML dash list returns JavaScript array
  - [ ] YAML dash list with blank lines inside block
  - [ ] Boolean coercion: `true`/`false` become JS booleans
  - [ ] Number coercion: `42`, `3.14` become JS numbers
  - [ ] Null coercion: `null`, `~` become JS null
  - [ ] Comment lines (`# comment`) are skipped
  - [ ] Blank lines between keys are skipped
  - [ ] Pipe/fold multiline (`|`) appends continuation lines
  - [ ] Mixed fields: strings + arrays + booleans in single block
  - [ ] Key with underscore prefix (`_key: value`) is parsed
- [ ] Write `describe('coerceScalar')` block with test cases:
  - [ ] `'true'` returns boolean `true`
  - [ ] `'false'` returns boolean `false`
  - [ ] `'null'` returns `null`
  - [ ] `'~'` returns `null`
  - [ ] `'42'` returns number `42`
  - [ ] `'3.14'` returns number `3.14`
  - [ ] `'hello'` returns string `'hello'`
  - [ ] `''` returns string `''`
- [ ] Verify RED state: run `node --test tests/frontmatter.test.js` and confirm `MODULE_NOT_FOUND` error

#### Verification

**Level:** Single Judge
**Artifact:** `tests/frontmatter.test.js`
**Threshold:** 4.0/5.0

**Rubric:**

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Acceptance Coverage | 0.30 | Tests cover ALL 13 functional acceptance criteria from the task specification |
| Edge Cases | 0.25 | Edge cases tested: BOM, CRLF, empty frontmatter, no delimiters, quoted values, blank lines, comments |
| RED State | 0.15 | Running tests fails with MODULE_NOT_FOUND (module does not exist yet, confirming TDD RED phase) |
| Test Clarity | 0.15 | Test names clearly describe what is being verified; describe/it structure matches build-index.test.js patterns |
| Maintainability | 0.15 | Tests use node:test and node:assert/strict; no external dependencies; imports from ../lib/frontmatter |

#### Blockers

- None (zero dependencies)

#### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Test expectations mismatch unified behavior | Medium | Low | Tests are derived directly from acceptance criteria and analysis of both implementations |

#### Integration Points

- Imports from `../lib/frontmatter` (does not exist yet — intentional RED state)

#### Definition of Done

- [ ] All subtasks complete
- [ ] RED state confirmed (tests fail because module doesn't exist)

---

### Step 2: Create lib/frontmatter.js (TDD GREEN Phase)

**Model:** opus
**Agent:** sdd:developer
**Depends on:** Step 1
**Parallel with:** None

**Goal**: Create the unified `parseFrontmatter` module that merges capabilities from both `build-index.js` (BOM stripping, pipe/fold multiline) and `build-graph.js` (YAML lists, inline arrays, boolean/number/null coercion). All tests from Step 1 must pass.

**Phase**: 2 — TDD GREEN
**Complexity**: Medium
**Uncertainty**: Medium (merging pipe/fold with graph-style parsing requires careful integration)

#### Expected Output

- `lib/frontmatter.js`: CommonJS module exporting `{ parseFrontmatter, coerceScalar }`

#### Success Criteria

- [ ] File `lib/frontmatter.js` exists
- [ ] `require('./lib/frontmatter')` returns an object with `parseFrontmatter` as a function
- [ ] `require('./lib/frontmatter')` returns an object with `coerceScalar` as a function
- [ ] Uses `module.exports` (CommonJS), not ESM `export`
- [ ] No external npm dependencies (only Node.js built-ins)
- [ ] Running `node --test tests/frontmatter.test.js` passes ALL tests (GREEN state)
- [ ] Runs on Node.js 18 without errors

#### Subtasks

- [ ] Create `lib/frontmatter.js` as CommonJS module
- [ ] Implement `coerceScalar(s)` function (from `build-graph.js:116-123`):
  - Handles: `'true'` -> `true`, `'false'` -> `false`, `'null'`/`'~'` -> `null`, numeric strings -> numbers, passthrough strings
- [ ] Implement `parseFrontmatter(content)` function merging both implementations:
  - [ ] BOM stripping: `content.replace(/^\uFEFF/, '')` (from `build-index.js:17`)
  - [ ] Regex extraction of frontmatter block between `---` delimiters with CRLF support
  - [ ] Line-by-line parsing using index-based loop (graph-style `while` loop, not `for...of`)
  - [ ] Skip blank lines and comment lines (`#`) (from `build-graph.js:44`)
  - [ ] Top-level key matching with underscore support: `/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)/` (from `build-graph.js:50`)
  - [ ] Inline array detection `[a, b, c]` (from `build-graph.js:60-66`)
  - [ ] YAML dash list detection with blank line tolerance (from `build-graph.js:71-97`)
  - [ ] Pipe/fold multiline detection (`|`/`>`) with indented continuation (from `build-index.js:28-36`)
  - [ ] Quoted value stripping for both `"..."` and `'...'` (from `build-graph.js:101-104`)
  - [ ] Plain scalar coercion via `coerceScalar()` (from `build-graph.js:109`)
  - [ ] Return `null` for empty result (no keys parsed)
- [ ] Export `{ parseFrontmatter, coerceScalar }` via `module.exports`
- [ ] Run `node --test tests/frontmatter.test.js` and verify ALL tests pass (GREEN state)

#### Verification

**Level:** CRITICAL - Panel of 2 Judges with Aggregated Voting
**Artifact:** `lib/frontmatter.js`
**Threshold:** 4.0/5.0

**Rubric:**

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Correctness | 0.30 | Merges ALL capabilities: BOM stripping, CRLF, pipe/fold multiline, YAML dash lists, inline arrays, boolean/number/null coercion, quoted value stripping |
| GREEN State | 0.20 | All tests in tests/frontmatter.test.js pass after module creation |
| Code Quality | 0.20 | Clean implementation following existing project conventions; CommonJS module.exports; no external dependencies |
| Error Handling | 0.15 | Returns null for missing/empty frontmatter, non-string input; handles malformed inline arrays gracefully |
| API Contract | 0.15 | Exports both parseFrontmatter and coerceScalar; signature parseFrontmatter(content) -> object or null preserved |

**Reference Pattern:** `lib/build-graph.js` (lines 20-123, graph-style parser as primary base)

#### Blockers

- Step 1 must be complete (tests must exist to verify GREEN)

#### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Pipe/fold multiline conflicts with dash list lookahead | High | Medium | Pipe/fold sets value to `''` and uses `startsWith('  ')` for continuation; dash list uses `^\s+-\s+` pattern. These are distinguishable — pipe/fold has explicit `\|`/`>` marker |
| Empty value semantics differ (null vs empty string) | Medium | Low | Graph version uses `null` for empty key with no list; unified should match graph behavior since build-index callers use `fm.description \|\| ''` pattern which handles null |
| `coerceScalar` changes build-index behavior (previously no coercion) | Low | Low | Skill names are always strings; numeric/boolean skill names are not realistic |

#### Integration Points

- Consumed by `tests/frontmatter.test.js` (Step 1)
- Will be consumed by `build-index.js` (Step 3) and `build-graph.js` (Step 4)

#### Definition of Done

- [ ] All subtasks complete
- [ ] GREEN state confirmed (all frontmatter tests pass)

---

### Step 3: Update build-index.js to use shared module

**Model:** sonnet
**Agent:** sdd:developer
**Depends on:** Step 2
**Parallel with:** Step 4

**Goal**: Remove the local `parseFrontmatter` implementation from `build-index.js` and replace it with an import from `lib/frontmatter.js`. Re-export `parseFrontmatter` in `module.exports` so `tests/build-index.test.js` continues to pass without any modifications.

**Phase**: 3 — REFACTOR
**Complexity**: Small
**Uncertainty**: Low

#### Expected Output

- Modified `lib/build-index.js`: local function removed, import added, re-export preserved

#### Success Criteria

- [ ] `lib/build-index.js` does NOT contain a local `function parseFrontmatter` definition
- [ ] `lib/build-index.js` contains `const { parseFrontmatter } = require('./frontmatter');` (or equivalent)
- [ ] `lib/build-index.js` `module.exports` still includes `parseFrontmatter` (re-export for backward compat)
- [ ] Running `node --test tests/build-index.test.js` passes ALL existing tests with ZERO modifications to the test file
- [ ] Running `node --test tests/frontmatter.test.js` still passes

#### Subtasks

- [ ] Add `const { parseFrontmatter } = require('./frontmatter');` after the existing `require('./paths')` line in `lib/build-index.js`
- [ ] Remove the local `parseFrontmatter` function (lines 13-42 approximately: the comment + function definition)
- [ ] Verify `module.exports` on line 328 still includes `parseFrontmatter` (it references the imported function now)
- [ ] Run `node --test tests/build-index.test.js` — all 7 parseFrontmatter tests must pass
- [ ] Run `node --test tests/frontmatter.test.js` — all tests must still pass
- [ ] Confirm `tests/build-index.test.js` was NOT modified (diff check)

#### Verification

**Level:** Single Judge
**Artifact:** `lib/build-index.js`
**Threshold:** 4.0/5.0

**Rubric:**

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Behavior Preserved | 0.35 | All 7 existing parseFrontmatter tests in build-index.test.js pass without ANY modifications to test file |
| Local Copy Removed | 0.25 | No local function parseFrontmatter definition remains in lib/build-index.js |
| Import Correct | 0.20 | Contains const { parseFrontmatter } = require('./frontmatter') or equivalent import statement |
| Re-export Intact | 0.20 | module.exports still includes parseFrontmatter for backward compatibility with test imports |

**Reference Pattern:** `lib/build-index.js` (current file before modification, for diff comparison)

#### Blockers

- Step 2 must be complete (`lib/frontmatter.js` must exist)

#### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Re-export omitted from module.exports | High | Low | The existing `module.exports` line references the variable name `parseFrontmatter` which will now point to the imported function — no change needed to the exports line |
| Multiline pipe test fails (`tests/build-index.test.js:37-43`) | High | Medium | Unified implementation MUST include pipe/fold support (verified in Step 2) |

#### Integration Points

- `tests/build-index.test.js:4` imports `parseFrontmatter` from `../lib/build-index` — re-export ensures compatibility
- All internal callers in `build-index.js` (scanSkills, scanPluginManifests, etc.) use `parseFrontmatter` by name — no change needed

#### Definition of Done

- [ ] All subtasks complete
- [ ] Zero modifications to `tests/build-index.test.js`
- [ ] All build-index tests pass

---

### Step 4: Update build-graph.js to use shared module

**Model:** sonnet
**Agent:** sdd:developer
**Depends on:** Step 2
**Parallel with:** Step 3

**Goal**: Remove the local `parseFrontmatter` and `coerceScalar` implementations from `build-graph.js` and replace with an import from `lib/frontmatter.js`. Re-export `parseFrontmatter` in `module.exports` for backward compatibility.

**Phase**: 3 — REFACTOR
**Complexity**: Small
**Uncertainty**: Low

#### Expected Output

- Modified `lib/build-graph.js`: local functions removed, import added, re-export preserved

#### Success Criteria

- [ ] `lib/build-graph.js` does NOT contain a local `function parseFrontmatter` definition
- [ ] `lib/build-graph.js` does NOT contain a local `function coerceScalar` definition
- [ ] `lib/build-graph.js` contains `const { parseFrontmatter } = require('./frontmatter');` (or equivalent)
- [ ] `lib/build-graph.js` `module.exports` still includes `parseFrontmatter` (re-export)
- [ ] Running `node --test tests/frontmatter.test.js` still passes

#### Subtasks

- [ ] Add `const { parseFrontmatter } = require('./frontmatter');` after the existing `require('./paths')` line in `lib/build-graph.js`
- [ ] Remove the local `parseFrontmatter` function (lines 20-114 approximately: comments + function)
- [ ] Remove the local `coerceScalar` function (lines 116-123 approximately)
- [ ] Verify `module.exports` on line 343 still includes `parseFrontmatter` (references imported function)
- [ ] Run `node --test tests/frontmatter.test.js` — all tests must still pass

#### Verification

**Level:** Single Judge
**Artifact:** `lib/build-graph.js`
**Threshold:** 4.0/5.0

**Rubric:**

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Local Copies Removed | 0.35 | No local function parseFrontmatter or function coerceScalar definitions remain in lib/build-graph.js |
| Import Correct | 0.25 | Contains const { parseFrontmatter } = require('./frontmatter') or equivalent import statement |
| Re-export Intact | 0.20 | module.exports still includes parseFrontmatter for backward compatibility |
| No Regressions | 0.20 | tests/frontmatter.test.js still passes after changes |

**Reference Pattern:** `lib/build-graph.js` (current file before modification, for diff comparison)

#### Blockers

- Step 2 must be complete (`lib/frontmatter.js` must exist)

#### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Internal callers reference `coerceScalar` directly | Low | Low | Grep confirms `coerceScalar` is only called from within `parseFrontmatter` in build-graph.js — no external callers |

#### Integration Points

- `module.exports` on line 343 exports `parseFrontmatter` — re-export ensures any future consumer is unaffected
- `buildGraph()` calls `parseFrontmatter` by name internally — import provides the same reference

#### Definition of Done

- [ ] All subtasks complete
- [ ] No local `parseFrontmatter` or `coerceScalar` in build-graph.js
- [ ] All frontmatter tests pass

---

### Step 5: Full Verification and Regression Check

**Model:** haiku
**Agent:** general-purpose (haiku)
**Depends on:** Step 3, Step 4
**Parallel with:** None

**Goal**: Run the complete test suite (`npm test`) and verify zero regressions. Confirm no local `parseFrontmatter` definitions remain in consumer files.

**Phase**: 4 — Verification
**Complexity**: Small
**Uncertainty**: Low

#### Expected Output

- Clean `npm test` output with zero failures
- Grep confirmation: no local `parseFrontmatter` function definitions in `build-index.js` or `build-graph.js`

#### Success Criteria

- [ ] `npm test` exits with code 0 (all tests pass)
- [ ] `tests/build-index.test.js` was NOT modified during this entire task (verify with git diff or file comparison)
- [ ] Grep for `function parseFrontmatter` in `lib/build-index.js` returns zero matches
- [ ] Grep for `function parseFrontmatter` in `lib/build-graph.js` returns zero matches
- [ ] Grep for `function coerceScalar` in `lib/build-graph.js` returns zero matches
- [ ] `lib/frontmatter.js` exports both `parseFrontmatter` and `coerceScalar`

#### Subtasks

- [ ] Run `npm test` and capture output — expect zero failures
- [ ] Grep `lib/build-index.js` for `function parseFrontmatter` — expect no matches
- [ ] Grep `lib/build-graph.js` for `function parseFrontmatter` — expect no matches
- [ ] Grep `lib/build-graph.js` for `function coerceScalar` — expect no matches
- [ ] Verify `tests/build-index.test.js` is unchanged (no modifications made during this task)

#### Verification

**Level:** NOT NEEDED
**Rationale:** Verification step that runs commands and checks binary pass/fail outcomes. Success is determined by npm test exit code and grep match counts -- no subjective judgment needed.

#### Blockers

- Steps 3 and 4 must both be complete

#### Risks

- None at this stage (all implementation is done)

#### Integration Points

- Validates the complete integration of `lib/frontmatter.js` with both consumers

#### Definition of Done

- [ ] All subtasks complete
- [ ] npm test green
- [ ] No local copies remain
- [ ] No test file modifications

---

## Implementation Summary

| Step | Phase | Goal | Key Output | Est. Effort |
|------|-------|------|------------|-------------|
| 1 | RED | Write comprehensive failing tests | `tests/frontmatter.test.js` (~19 test cases) | Medium |
| 2 | GREEN | Create unified frontmatter parser | `lib/frontmatter.js` (merged implementation) | Medium |
| 3 | REFACTOR | Update build-index.js consumer | Modified `lib/build-index.js` (import + re-export) | Small |
| 4 | REFACTOR | Update build-graph.js consumer | Modified `lib/build-graph.js` (import + re-export) | Small |
| 5 | VERIFY | Full regression check | Clean npm test output | Small |

**Total Steps**: 5
**Total Subtasks**: 38
**Critical Path**: Steps 1 -> 2 -> 3 -> 5 (and 1 -> 2 -> 4 -> 5)
**Parallel Opportunities**: Steps 3 and 4 can run concurrently (both depend only on Step 2)
**Estimated Total Effort**: Medium

---

## Verification Summary

| Step | Verification Level | Judges | Threshold | Artifacts |
|------|-------------------|--------|-----------|-----------|
| 1 | Single Judge | 1 | 4.0/5.0 | `tests/frontmatter.test.js` (TDD RED test file) |
| 2 | CRITICAL - Panel (2) | 2 | 4.0/5.0 | `lib/frontmatter.js` (unified parser module) |
| 3 | Single Judge | 1 | 4.0/5.0 | `lib/build-index.js` (consumer refactor) |
| 4 | Single Judge | 1 | 4.0/5.0 | `lib/build-graph.js` (consumer refactor) |
| 5 | None | - | - | npm test output + grep checks |

**Total Evaluations:** 5
**Implementation Command:** `/implement C:/Projetos/skill-advisor/.specs/tasks/draft/unify-parse-frontmatter.refactor.md`

---

## Risks & Blockers Summary

### High Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| Pipe/fold multiline not in graph version | High | Certain | Unified module MUST merge pipe/fold from build-index.js into graph-style parser (Step 2) |
| Re-export omission breaks existing tests | High | Low | `module.exports` in build-index.js already references `parseFrontmatter` by name; importing it provides the binding |
| Multiline pipe test in build-index.test.js:37-43 | High | Medium | Step 2 implementation explicitly includes pipe/fold; Step 3 verifies this specific test passes |

### Low Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| coerceScalar changes build-index behavior | Low | Low | Skill names are strings; numeric coercion is harmless for real data |
| Empty value null vs empty string | Low | Low | Callers use `fm.field \|\| ''` pattern which handles both |

---

## Definition of Done (Task Level)

- [ ] All 5 implementation steps completed
- [ ] All 13 functional acceptance criteria verified
- [ ] All 3 non-functional requirements met (no new deps, CommonJS, Node 18 compat)
- [ ] `tests/frontmatter.test.js` written and passing
- [ ] `lib/frontmatter.js` exists and exports `parseFrontmatter` and `coerceScalar`
- [ ] `build-index.js` and `build-graph.js` have no local `parseFrontmatter` definitions
- [ ] `npm test` passes with zero failures
- [ ] `tests/build-index.test.js` was NOT modified
- [ ] No high-priority risks unaddressed
