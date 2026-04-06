---
title: Add structured error handling with ADVISOR_DEBUG
depends_on: []
---

## Initial User Prompt

Phase 0, Task 0.4: Every catch block in the codebase silently swallows errors. Define AdvisorError class in lib/errors.js, replace silent catches with conditional debug logging via process.env.ADVISOR_DEBUG, and ensure expected errors log at debug level while unexpected errors propagate. Apply TDD. GitHub issue #4.

## Description

The skill-advisor plugin has 20 catch blocks across 6 files that silently swallow all errors. This makes debugging impossible -- when something fails (permission denied, corrupt JSON, missing file), there is zero diagnostic output. Developers must resort to adding temporary console.log statements, running, removing them, and repeating.

This task introduces a structured error handling layer:

1. **`AdvisorError`** -- A custom Error subclass with typed error codes (`FS_READ`, `FS_WALK`, `PARSE_JSON`, `PARSE_FRONTMATTER`, `MODULE_LOAD`, `EMBED_LOAD`) and structured context (file path, operation name). This enables programmatic error handling in future phases (e.g., the advisor-monitor agent can inspect error codes).

2. **`debugLog(code, message, context)`** -- A logging function gated by `process.env.ADVISOR_DEBUG`. When the env var is unset or falsy, the function is a no-op (zero overhead). When set, it writes structured debug output to stderr. This preserves the current silent behavior by default while giving developers an opt-in diagnostic channel.

3. **File-by-file catch block replacement** -- Each of the 20 silent catch blocks is replaced with a `debugLog()` call that captures the error code, a human-readable message, and contextual information (file path, directory, operation). The control flow (skip, return, continue) remains identical.

**Affected files and catch block counts:**
- `lib/build-index.js` -- 9 catch blocks (walk, readdir, readFile, JSON.parse)
- `lib/build-catalog.js` -- 4 catch blocks (walkDir, readFileSync, readdirSync)
- `lib/semantic.js` -- 1 catch block (JSON.parse embeddings)
- `lib/build-embeddings.js` -- 1 catch block (already propagates; wrap with AdvisorError)
- `hooks/advisor-nudge.cjs` -- 5 catch blocks (accessSync, require, stat, readFile, JSON.parse)

**Not affected:** `lib/build-graph.js` has 0 catch blocks (confirmed by grep).

**Critical constraint:** `hooks/advisor-nudge.cjs` must complete in <50ms. The `debugLog` function must have near-zero overhead when `ADVISOR_DEBUG` is unset (single env var check, no string formatting).

## Acceptance Criteria

- [ ] `lib/errors.js` exports `AdvisorError` class and `debugLog` function
- [ ] `AdvisorError` extends `Error` with `code`, `context`, and `cause` properties
- [ ] `AdvisorError` has typed error codes: `FS_READ`, `FS_WALK`, `PARSE_JSON`, `PARSE_FRONTMATTER`, `MODULE_LOAD`, `EMBED_LOAD`
- [ ] `debugLog(code, message, context)` writes to `stderr` only when `process.env.ADVISOR_DEBUG` is truthy
- [ ] `debugLog` is a no-op when `ADVISOR_DEBUG` is unset (no string formatting, no object allocation)
- [ ] All 20 silent catch blocks replaced with `debugLog()` calls
- [ ] Each `debugLog` call includes: error code, human message, and context object with file path
- [ ] Control flow in every catch block is identical to current behavior (skip/return/continue)
- [ ] When `ADVISOR_DEBUG` is unset, runtime behavior is byte-for-byte identical to current
- [ ] `tests/errors.test.js` exists with tests for `AdvisorError` and `debugLog`
- [ ] `npm test` passes with zero regressions
- [ ] `hooks/advisor-nudge.cjs` still completes in <50ms (no performance regression)

## Architecture Overview

### Module Design: `lib/errors.js`

```
Error Codes (constants):
  FS_READ, FS_WALK, PARSE_JSON, PARSE_FRONTMATTER, MODULE_LOAD, EMBED_LOAD

AdvisorError extends Error:
  constructor(code, message, { cause, context })
  - code: one of the error code constants
  - context: { filePath?, dir?, operation? }
  - cause: original Error instance

debugLog(code, message, context):
  - if (!process.env.ADVISOR_DEBUG) return;  // zero overhead path
  - writes to process.stderr: [ADVISOR_DEBUG] {code}: {message} {JSON context}
```

### Catch Block Replacement Pattern

Before:
```js
try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
catch { return; }
```

After:
```js
const { debugLog } = require('./errors');
// ...
try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
catch (err) { debugLog('FS_READ', 'readdirSync failed', { dir, cause: err.message }); return; }
```

### Performance Contract

`debugLog` when `ADVISOR_DEBUG` is unset:
- 1 property lookup on `process.env` (cached by V8)
- 0 string concatenation
- 0 object allocation
- Returns `undefined`

---

## Implementation Process

### Implementation Strategy

**Approach**: Bottom-Up (TDD)
**Rationale**: `lib/errors.js` is a zero-dependency leaf module. We write tests first (RED), implement to make them pass (GREEN), then propagate to each consumer file. Consumer files are independent and can be updated in parallel.

### Phase Overview

```
Phase 1: Foundation (TDD RED+GREEN)
    |
    v
Phase 2: File-by-file refactor (parallel)
    |
    v
Phase 3: Integration verification
```

---

### Step 1: Write failing tests for lib/errors.js (RED)

**Goal**: Define the expected API surface of the errors module through tests before any implementation exists.

#### Expected Output

- `tests/errors.test.js`: Test file covering AdvisorError class and debugLog function

#### Success Criteria

- [ ] `tests/errors.test.js` exists
- [ ] Tests cover: AdvisorError instantiation with code, message, cause, context
- [ ] Tests cover: AdvisorError extends Error (instanceof check)
- [ ] Tests cover: AdvisorError.code is one of the defined error codes
- [ ] Tests cover: debugLog is a no-op when ADVISOR_DEBUG is unset
- [ ] Tests cover: debugLog writes to stderr when ADVISOR_DEBUG is set
- [ ] Tests cover: debugLog output includes code, message, and context
- [ ] Tests cover: error code constants are exported
- [ ] Running `npm test` shows these tests FAIL (RED phase)

#### Subtasks

- [ ] Create `tests/errors.test.js` using `node:test` and `node:assert/strict` (matching project conventions from `tests/build-index.test.js`)
- [ ] Write `describe('AdvisorError')` block with tests for constructor, inheritance, properties
- [ ] Write `describe('debugLog')` block with tests for gated logging behavior
- [ ] Write `describe('ERROR_CODES')` block verifying all 6 codes are exported
- [ ] Run `npm test` and confirm all new tests fail (module not found)

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: None
**Blockers**: None
**Risks**: None

---

### Step 2: Create lib/errors.js (GREEN)

**Goal**: Implement the errors module to make all Step 1 tests pass.

#### Expected Output

- `lib/errors.js`: Module exporting AdvisorError, debugLog, and ERROR_CODES

#### Success Criteria

- [ ] `lib/errors.js` exists
- [ ] `AdvisorError` class extends `Error` with `code`, `context`, `cause` properties
- [ ] `ERROR_CODES` object exported with keys: `FS_READ`, `FS_WALK`, `PARSE_JSON`, `PARSE_FRONTMATTER`, `MODULE_LOAD`, `EMBED_LOAD`
- [ ] `debugLog(code, message, context)` checks `process.env.ADVISOR_DEBUG` first and returns immediately if falsy
- [ ] `debugLog` writes formatted message to `process.stderr.write()` when enabled
- [ ] `npm test` passes -- all errors.test.js tests GREEN
- [ ] No other test files affected (zero regressions)

#### Subtasks

- [ ] Create `lib/errors.js` with `ERROR_CODES` constant object
- [ ] Implement `AdvisorError` class extending `Error` with `code`, `context`, `cause` in constructor
- [ ] Implement `debugLog` function with env-var gate as first statement
- [ ] Export `{ AdvisorError, debugLog, ERROR_CODES }`
- [ ] Run `npm test` and confirm all tests pass

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Step 1
**Blockers**: None
**Risks**: None

---

### Step 3: Update lib/build-index.js (9 catch blocks)

**Goal**: Replace all 9 silent catch blocks in build-index.js with debugLog calls while preserving identical control flow.

#### Expected Output

- Modified `lib/build-index.js` with structured error handling

#### Success Criteria

- [ ] `const { debugLog } = require('./errors');` added at top of file
- [ ] All 9 catch blocks updated: each captures `err` and calls `debugLog()` with appropriate code and context
- [ ] Line 53: `catch (err) { debugLog('FS_WALK', ...)` -- findFilesRecursive
- [ ] Line 61: `catch (err) { debugLog('FS_READ', ...)` -- walk readdirSync
- [ ] Line 92: `catch (err) { debugLog('FS_READ', ...)` -- scanSkills readFileSync
- [ ] Line 137: `catch (err) { debugLog('FS_READ', ...)` -- scanPluginManifests read command
- [ ] Line 161: `catch (err) { debugLog('FS_READ', ...)` -- scanPluginManifests read agent
- [ ] Line 163: `catch (err) { debugLog('FS_READ', ...)` -- scanPluginManifests readdirSync agents
- [ ] Line 165: `catch (err) { debugLog('PARSE_JSON', ...)` -- scanPluginManifests parse plugin.json
- [ ] Line 181: `catch (err) { debugLog('FS_READ', ...)` -- scanMCPManifests cwd check
- [ ] Line 203: `catch (err) { debugLog('PARSE_JSON', ...)` -- scanMCPManifests parse mcp.json
- [ ] Control flow after each catch is unchanged (return, continue, skip)
- [ ] `npm test` passes (existing build-index.test.js green)
- [ ] With `ADVISOR_DEBUG` unset, output is identical to before

#### Subtasks

- [ ] Add `const { debugLog } = require('./errors');` import to `lib/build-index.js`
- [ ] Update catch block at line 53 (findFilesRecursive) with `debugLog('FS_WALK', ...)`
- [ ] Update catch block at line 61 (walk readdirSync) with `debugLog('FS_READ', ...)`
- [ ] Update catch block at line 92 (scanSkills readFile) with `debugLog('FS_READ', ...)`
- [ ] Update catch blocks at lines 137, 161, 163 (scanPluginManifests) with appropriate codes
- [ ] Update catch block at line 165 (plugin.json parse) with `debugLog('PARSE_JSON', ...)`
- [ ] Update catch blocks at lines 181, 203 (scanMCPManifests) with appropriate codes
- [ ] Run `npm test` and verify zero regressions

**Complexity**: Medium
**Uncertainty**: Low
**Dependencies**: Step 2
**Blockers**: None
**Risks**: None

---

### Step 4: Update lib/build-catalog.js (4 catch blocks)

**Goal**: Replace all 4 silent catch blocks in build-catalog.js with debugLog calls.

#### Expected Output

- Modified `lib/build-catalog.js` with structured error handling

#### Success Criteria

- [ ] `const { debugLog } = require('./errors');` added at top of file
- [ ] Line 38: `catch (err) { debugLog('FS_READ', ...)` -- walkDir readdirSync
- [ ] Line 143: `catch (err) { debugLog('FS_READ', ...)` -- scanSources readFileSync (plugin)
- [ ] Line 184: `catch (err) { debugLog('FS_READ', ...)` -- scanSources readFileSync (skill)
- [ ] Line 213: `catch (err) { debugLog('FS_READ', ...)` -- getExistingCards readdirSync
- [ ] Control flow unchanged in every catch block
- [ ] `npm test` passes

#### Subtasks

- [ ] Add `const { debugLog } = require('./errors');` import to `lib/build-catalog.js`
- [ ] Update catch block at line 38 (walkDir) with `debugLog('FS_READ', ...)`
- [ ] Update catch block at line 143 (scanSources plugin) with `debugLog('FS_READ', ...)`
- [ ] Update catch block at line 184 (scanSources skill) with `debugLog('FS_READ', ...)`
- [ ] Update catch block at line 213 (getExistingCards) with `debugLog('FS_READ', ...)`
- [ ] Run `npm test` and verify zero regressions

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Step 2
**Blockers**: None
**Risks**: None

---

### Step 5: Update lib/semantic.js (1 catch block)

**Goal**: Replace the silent catch in loadEmbeddings with debugLog.

#### Expected Output

- Modified `lib/semantic.js` with structured error handling

#### Success Criteria

- [ ] `const { debugLog } = require('./errors');` added at top of file
- [ ] Line 32: `catch (err) { debugLog('EMBED_LOAD', ...)` -- loadEmbeddings JSON.parse
- [ ] Function still returns `false` on failure (control flow unchanged)
- [ ] `npm test` passes

#### Subtasks

- [ ] Add `const { debugLog } = require('./errors');` import to `lib/semantic.js`
- [ ] Update catch block at line 32 with `debugLog('EMBED_LOAD', 'Failed to load embeddings', { vocabPath, embPath, cause: err.message })`
- [ ] Verify `_vocab`, `_embeddings`, `_embeddingIds` are still reset to null
- [ ] Verify function still returns `false`
- [ ] Run `npm test` and verify zero regressions

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Step 2
**Blockers**: None
**Risks**: None

---

### Step 6: Update lib/build-embeddings.js (1 catch block)

**Goal**: Wrap the existing error propagation with AdvisorError for consistency.

#### Expected Output

- Modified `lib/build-embeddings.js` with AdvisorError wrapping

#### Success Criteria

- [ ] `const { AdvisorError } = require('./errors');` added at top of file
- [ ] Line 148: `.catch(err => { ... })` wraps error as `AdvisorError('EMBED_LOAD', err.message, { cause: err })`
- [ ] Still calls `console.error` and `process.exit(1)` (propagation behavior unchanged)
- [ ] `npm test` passes

#### Subtasks

- [ ] Add `const { AdvisorError } = require('./errors');` import to `lib/build-embeddings.js`
- [ ] Update `.catch()` handler to wrap with AdvisorError before logging
- [ ] Run `npm test` and verify zero regressions

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Step 2
**Blockers**: None
**Risks**: None

---

### Step 7: Update hooks/advisor-nudge.cjs (5 catch blocks)

**Goal**: Replace all 5 silent catch blocks in the hook with debugLog calls while maintaining <50ms execution budget.

#### Expected Output

- Modified `hooks/advisor-nudge.cjs` with structured error handling

#### Success Criteria

- [ ] `const { debugLog } = require(path.resolve(__dirname, '..', 'lib', 'errors'));` added (using path.resolve like existing requires in this file)
- [ ] Line 35: `catch (err) { debugLog('FS_READ', ...)` -- getIndexLitePath accessSync
- [ ] Line 39: `catch (err) { debugLog('MODULE_LOAD', ...)` -- getIndexLitePath require paths
- [ ] Line 168: `catch (err) { debugLog('MODULE_LOAD', ...)` -- require semantic
- [ ] Line 186: catch block already logs user-facing message; add `debugLog('FS_READ', ...)` before the console.log
- [ ] Line 202: `catch (err) { debugLog('PARSE_JSON', ...)` -- JSON.parse index
- [ ] Control flow identical in every catch block
- [ ] `npm test` passes (existing advisor-nudge.test.js green)
- [ ] Execution time remains <50ms (no performance regression)

#### Subtasks

- [ ] Add `const { debugLog } = require(path.resolve(__dirname, '..', 'lib', 'errors'));` import to `hooks/advisor-nudge.cjs`
- [ ] Update catch block at line 35 (accessSync) with `debugLog('FS_READ', ...)`
- [ ] Update catch block at line 39 (require paths) with `debugLog('MODULE_LOAD', ...)`
- [ ] Update catch block at line 168 (require semantic) with `debugLog('MODULE_LOAD', ...)`
- [ ] Update catch block at line 186 (stat+read index) -- add debugLog before existing console.log
- [ ] Update catch block at line 202 (JSON.parse) with `debugLog('PARSE_JSON', ...)`
- [ ] Run `npm test` and verify zero regressions
- [ ] Manually verify: `time ADVISOR_DEBUG= node hooks/advisor-nudge.cjs` completes in <50ms

**Complexity**: Medium
**Uncertainty**: Low
**Dependencies**: Step 2
**Blockers**: None
**Risks**:
- Performance regression if debugLog does work when ADVISOR_DEBUG is unset
- Mitigation: debugLog checks env var as first statement, returns immediately

---

### Step 8: Integration verification and ADVISOR_DEBUG smoke test

**Goal**: Verify the complete system works correctly in both modes (debug on/off) and that no regressions exist.

#### Expected Output

- All tests passing
- Manual verification of ADVISOR_DEBUG behavior documented

#### Success Criteria

- [ ] `npm test` passes with 0 failures
- [ ] With `ADVISOR_DEBUG` unset: no debug output from any module
- [ ] With `ADVISOR_DEBUG=1`: running `node lib/build-index.js` against a path with permission-denied files produces structured debug output on stderr
- [ ] With `ADVISOR_DEBUG=1`: debug output includes error code, message, and file path context
- [ ] No `console.log` or `console.warn` calls added (all debug output via `process.stderr.write`)
- [ ] `lib/errors.js` has no dependencies beyond Node.js built-ins

#### Subtasks

- [ ] Run `npm test` -- verify all test files pass (errors.test.js, build-index.test.js, advisor-nudge.test.js, paths.test.js)
- [ ] Run `ADVISOR_DEBUG=1 node lib/build-index.js` and verify stderr shows structured debug messages for any skipped files
- [ ] Run `node lib/build-index.js` (no ADVISOR_DEBUG) and verify stderr is empty
- [ ] Verify `hooks/advisor-nudge.cjs` execution time is <50ms without ADVISOR_DEBUG
- [ ] Review all modified files to confirm no catch block still silently swallows errors

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Steps 3, 4, 5, 6, 7
**Blockers**: None
**Risks**: None

---

## Implementation Summary

| Step | Goal | Output | Est. Effort |
|------|------|--------|-------------|
| 1 | Write failing tests for errors.js (RED) | `tests/errors.test.js` | S |
| 2 | Create lib/errors.js (GREEN) | `lib/errors.js` | S |
| 3 | Update build-index.js (9 catches) | Modified `lib/build-index.js` | M |
| 4 | Update build-catalog.js (4 catches) | Modified `lib/build-catalog.js` | S |
| 5 | Update semantic.js (1 catch) | Modified `lib/semantic.js` | S |
| 6 | Update build-embeddings.js (1 catch) | Modified `lib/build-embeddings.js` | S |
| 7 | Update advisor-nudge.cjs (5 catches) | Modified `hooks/advisor-nudge.cjs` | M |
| 8 | Integration verification | All tests green, smoke test | S |

**Total Steps**: 8
**Critical Path**: Steps 1 -> 2 -> [3,4,5,6,7 parallel] -> 8
**Parallel Opportunities**: Steps 3, 4, 5, 6, 7 can all run concurrently after Step 2

---

## Risks & Blockers Summary

### High Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| Performance regression in advisor-nudge.cjs | High | Low | debugLog checks env var first; no work when disabled |
| Catch block control flow accidentally changed | High | Low | Each step verifies existing tests pass; explicit same-flow criteria |

### Low Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| Line numbers shift from prior refactoring tasks (0.1, 0.2, 0.3) | Low | Medium | Use grep to locate catch blocks by surrounding code, not line numbers |

---

## Definition of Done (Task Level)

- [ ] `lib/errors.js` created with AdvisorError, debugLog, ERROR_CODES
- [ ] `tests/errors.test.js` created with full coverage of errors module
- [ ] All 20 catch blocks across 6 files replaced with debugLog calls
- [ ] All catch blocks preserve original control flow (skip/return/continue)
- [ ] `npm test` passes with zero regressions
- [ ] `ADVISOR_DEBUG` unset: behavior identical to current (silent)
- [ ] `ADVISOR_DEBUG=1`: structured debug output on stderr
- [ ] `hooks/advisor-nudge.cjs` completes in <50ms
- [ ] No new dependencies added to package.json
