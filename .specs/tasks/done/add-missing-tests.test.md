---
title: Add tests for graph-search, semantic, and build-catalog modules
depends_on:
  - unify-parse-frontmatter.refactor.md
  - centralize-constants.refactor.md
  - extract-text-utilities.refactor.md
---

## Initial User Prompt

Phase 0, Task 0.6: Only 3 test files exist (hook, index, paths). The graph BFS, semantic search, and catalog builder are completely untested. Create tests/graph-search.test.js (10+ cases: BFS, alias matching, convergence boost, category boost, empty graph, circular edges), tests/semantic.test.js (8+ cases: load, query, cosine, threshold, missing vocab), tests/build-catalog.test.js (8+ cases: walkDir, extractName, extractPlugin, batches, truncation). GitHub issue #6.

## Description

The skill-advisor plugin has three critical modules with zero test coverage: `lib/graph-search.js` (BFS graph traversal with distance scoring), `lib/semantic.js` (lightweight semantic search using pre-computed embeddings), and `lib/build-catalog.js` (filesystem scanner for skill/plugin discovery). These modules contain the core search and indexing logic that the entire advisor pipeline depends on. Without tests, regressions from Phase 0 refactoring (tasks 0.1-0.3) or future Phase 1+ changes will go undetected.

This task creates three new test files using `node:test` + `node:assert/strict` (matching the established pattern in `tests/paths.test.js` and `tests/build-index.test.js`). Each test file exercises the public API of its corresponding module, including edge cases, error paths, and boundary conditions. Test fixtures (JSON graphs, vocab files, directory trees) are created under `tests/fixtures/` to keep tests deterministic and fast (no network, no real plugin directories).

### Modules Under Test

| Module | Exports | Key Behaviors |
|--------|---------|---------------|
| `lib/graph-search.js` | `normalizeToken`, `inferTaskType`, `matchAliases`, `bfsTraverse`, `graphSearch`, `loadGraph`, 3 constants | BFS traversal, distance scoring, convergence/category boosts, alias matching with accent normalization |
| `lib/semantic.js` | `loadEmbeddings`, `isReady`, `queryEmbedding`, `cosineSimilarity`, `semanticSearch` | Bag-of-words embedding, cosine similarity, threshold filtering, state management |
| `lib/build-catalog.js` | `walkDir`, `extractNameFromFrontmatter`, `extractPluginName`, `scanSources`, `getExistingCards`, `generateBatches` | Recursive directory walk with limits, frontmatter parsing, path-based plugin detection, batch splitting |

## Acceptance Criteria

- [ ] `tests/graph-search.test.js` exists with 10+ test cases covering: `normalizeToken`, `inferTaskType`, `matchAliases`, `bfsTraverse`, `graphSearch`, `loadGraph`, convergence boost, category boost, empty graph, circular edges, maxHops boundary
- [ ] `tests/semantic.test.js` exists with 8+ test cases covering: `loadEmbeddings` success/failure, `isReady` state, `queryEmbedding` averaging and normalization, `cosineSimilarity` math, `semanticSearch` threshold filtering, missing vocab tokens, empty input
- [ ] `tests/build-catalog.test.js` exists with 8+ test cases covering: `walkDir` depth/entry limits and skip dirs, `extractNameFromFrontmatter` with quotes/missing/empty, `extractPluginName` for cache/skills/unknown paths, `generateBatches` splitting and existing card filtering
- [ ] All fixtures are in `tests/fixtures/` (no hardcoded paths to real user directories)
- [ ] `npm test` passes with all existing + new tests (zero regressions)
- [ ] Each test file uses `node:test` (`describe`/`it`) + `node:assert/strict` (matches existing convention)
- [ ] No test depends on network access, real plugin directories, or external state
- [ ] Total new test case count >= 26 (10 + 8 + 8)

## Architecture Overview

See: `C:/Projetos/skill-advisor/.specs/plans/skill-advisor-v2-orchestration-platform.design.md`

Relevant sections: Phase 0 roadmap (section 10), Development Methodology (section 12 - TDD).

### Key Constraints
- **Runtime**: Node.js >= 18 (CommonJS, `require`)
- **Test framework**: `node:test` (built-in, no external deps)
- **Assertions**: `node:assert/strict`
- **Pattern**: Match `tests/paths.test.js` and `tests/build-index.test.js` style
- **Fixtures**: `tests/fixtures/` directory (already has sample-plugin, sample-skill, etc.)
- **Module state**: `semantic.js` uses module-level `_vocab`/`_embeddings` globals -- tests must account for state between runs
- **FS dependencies**: `loadGraph` and `scanSources` read from disk -- use fixture directories, not mocks

---

## Implementation Process

### Implementation Strategy

**Approach**: Bottom-Up
**Rationale**: Each module exposes pure functions (normalizeToken, cosineSimilarity, extractName) that can be tested in isolation before testing composite functions (bfsTraverse, queryEmbedding, walkDir) and full pipelines (graphSearch, semanticSearch, generateBatches). Fixtures are created first as the foundation.

### Phase Overview

```
Phase 1: Fixtures Setup
    |
    v
Phase 2: Test Files (3 steps, parallelizable)
    |-- Step 2: graph-search.test.js
    |-- Step 3: semantic.test.js
    |-- Step 4: build-catalog.test.js
    |
    v
Phase 3: Integration Verification
```

---

### Step 1: Create Test Fixtures

**Goal**: Create deterministic JSON fixtures for graph-search and semantic tests, and verify existing directory fixtures for build-catalog.

#### Expected Output

- `tests/fixtures/graph/adjacency.json`: Small graph with 4-5 skill nodes, 2-3 concept nodes, alias_index, edges (including a cycle)
- `tests/fixtures/semantic/advisor-vocab.json`: 10-15 word vectors (384-dim, pre-normalized)
- `tests/fixtures/semantic/advisor-embeddings.json`: 3-4 skill embeddings (384-dim)

#### Success Criteria

- [ ] `tests/fixtures/graph/adjacency.json` is valid JSON with `nodes` and `alias_index` keys
- [ ] Graph contains at least: 2 concept nodes, 3 skill nodes, 1 circular edge pair
- [ ] `tests/fixtures/semantic/advisor-vocab.json` has at least 10 word entries with 384-dim arrays
- [ ] `tests/fixtures/semantic/advisor-embeddings.json` has at least 3 skill entries with 384-dim arrays
- [ ] All vectors are pre-normalized (magnitude ~1.0) for deterministic cosine similarity results
- [ ] Existing `tests/fixtures/sample-plugin/` structure verified as sufficient for build-catalog tests

#### Subtasks

- [ ] Create `tests/fixtures/graph/` directory
- [ ] Create `tests/fixtures/graph/adjacency.json` with nodes: `concept:debugging`, `concept:deployment`, `skill:investigate`, `skill:fix`, `skill:deploy`, `skill:review`; alias_index mapping common terms; edges including a cycle between `skill:investigate` <-> `skill:fix`
- [ ] Create `tests/fixtures/semantic/` directory
- [ ] Create `tests/fixtures/semantic/advisor-vocab.json` with words: debug, fix, error, deploy, ship, test, review, build, create, implement (384-dim normalized vectors)
- [ ] Create `tests/fixtures/semantic/advisor-embeddings.json` with skills: `skill:investigate`, `skill:deploy`, `skill:review` (384-dim vectors with known similarity relationships)
- [ ] Verify `tests/fixtures/sample-plugin/` has the expected structure for walkDir/scanSources tests

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: None
**Blockers**: None
**Risks**: Vector normalization errors could cause flaky cosine similarity tests. Mitigation: use simple unit vectors with known dot products.

---

### Step 2: Create `tests/graph-search.test.js` (10+ cases)

**Goal**: Comprehensive test coverage for the BFS graph traversal module, covering all 8 exports and key algorithmic behaviors.

#### Expected Output

- `tests/graph-search.test.js`: 10+ test cases organized in describe blocks

#### Success Criteria

- [ ] File uses `require('node:test')` and `require('node:assert/strict')`
- [ ] Tests pass when run with `node --test tests/graph-search.test.js`
- [ ] All 8 exports tested (6 functions + 3 constants)
- [ ] Minimum 10 test cases

#### Subtasks

- [ ] Create `tests/graph-search.test.js` with imports from `../lib/graph-search`
- [ ] `describe('constants')`: verify SCORE_BY_HOP is `[1.0, 0.7, 0.4]`, CONVERGENCE_BOOST is `0.15`, CATEGORY_BOOST is `0.2`
- [ ] `describe('normalizeToken')`: accent stripping (`"depurar"` -> `"depurar"`, `"seguranca"` with cedilla -> `"seguranca"`), lowercase, trim
- [ ] `describe('inferTaskType')`: returns `'debugging'` for `['debug', 'error']`, `'deployment'` for `['deploy']`, `'implementation'` for `['create', 'feature']`, `null` for `['random', 'words']`
- [ ] `describe('matchAliases')`: finds node IDs from alias_index, deduplicates results, handles accent-normalized lookups, returns `[]` for unknown tokens
- [ ] `describe('bfsTraverse')`: seed nodes at distance 0 with score 1.0; neighbors at distance 1 with score 0.7; 2-hop nodes with score 0.4; `maxHops=0` returns only seeds; circular edges do not cause infinite loop; non-existent seed IDs are skipped; `fromSeeds` accumulates multiple seed origins
- [ ] `describe('graphSearch')`: full pipeline returns sorted skills; convergence boost applied when skill reachable from 2+ seeds; category boost applied when skill category matches inferred task type; empty alias match returns `[]`; `topN` limits results; returns `paths` explain strings
- [ ] `describe('loadGraph')`: loads fixture adjacency.json; returns object with `nodes` and `alias_index`; caching behavior (second call uses cache if mtime unchanged)

**Complexity**: Medium
**Uncertainty**: Low
**Dependencies**: Step 1 (graph fixtures)
**Blockers**: None
**Risks**: `loadGraph` uses module-level cache (`_graphCache`). Tests must use the fixture path parameter to avoid cache pollution. Mitigation: pass explicit `graphDir` to `loadGraph()`.

---

### Step 3: Create `tests/semantic.test.js` (8+ cases)

**Goal**: Test the semantic search pipeline including vector math, state management, and threshold filtering.

#### Expected Output

- `tests/semantic.test.js`: 8+ test cases organized in describe blocks

#### Success Criteria

- [ ] File uses `require('node:test')` and `require('node:assert/strict')`
- [ ] Tests pass when run with `node --test tests/semantic.test.js`
- [ ] All 5 exports tested
- [ ] Minimum 8 test cases

#### Subtasks

- [ ] Create `tests/semantic.test.js` with imports from `../lib/semantic`
- [ ] `describe('loadEmbeddings')`: returns `true` when loading valid fixture files; returns `false` when directory does not exist; returns `false` when files are malformed/missing
- [ ] `describe('isReady')`: returns `false` before loading; returns `true` after successful load; returns `false` after failed load attempt
- [ ] `describe('cosineSimilarity')`: identical normalized vectors return ~1.0; orthogonal vectors return ~0.0; returns 0 when either input is null; handles different-length vectors gracefully
- [ ] `describe('queryEmbedding')`: returns null for empty tokens array; returns null when no tokens match vocabulary; returns averaged and normalized vector for known tokens; skips unknown tokens in the average
- [ ] `describe('semanticSearch')`: returns `[]` when not loaded; returns results sorted by score descending; filters out results below 0.15 threshold; respects `topN` limit; returns `{ id, score }` shape

**Complexity**: Medium
**Uncertainty**: Medium (module-level state requires careful test ordering or re-loading between describe blocks)
**Dependencies**: Step 1 (semantic fixtures)
**Blockers**: None
**Risks**: Module-level state (`_vocab`, `_embeddings`, `_embeddingIds`) persists across tests in the same process. Mitigation: structure tests so `loadEmbeddings` is called at the start of each describe block that needs it, and test the "not loaded" state first before any load call. Alternatively, test in a specific order: unloaded state tests first, then load, then loaded state tests.

---

### Step 4: Create `tests/build-catalog.test.js` (8+ cases)

**Goal**: Test the filesystem scanning and catalog building functions, focusing on pure functions and using fixture directories for walkDir.

#### Expected Output

- `tests/build-catalog.test.js`: 8+ test cases organized in describe blocks

#### Success Criteria

- [ ] File uses `require('node:test')` and `require('node:assert/strict')`
- [ ] Tests pass when run with `node --test tests/build-catalog.test.js`
- [ ] All 6 exports tested (pure functions fully, FS-dependent functions with fixtures)
- [ ] Minimum 8 test cases

#### Subtasks

- [ ] Create `tests/build-catalog.test.js` with imports from `../lib/build-catalog`
- [ ] `describe('walkDir')`: returns files from fixture `sample-plugin` directory; respects `maxDepth=0` (returns nothing since depth 0 only reads the root dir entries); respects `maxEntries` limit; skips `node_modules` and `.git` directories; returns empty array for non-existent directory; skips hidden directories (those starting with `.`)
- [ ] `describe('extractNameFromFrontmatter')`: extracts unquoted name (`name: my-skill`); extracts double-quoted name (`name: "my-skill"`); extracts single-quoted name (`name: 'my-skill'`); returns null when no name field; returns null for empty string
- [ ] `describe('extractPluginName')`: extracts from cache path (`~/.claude/plugins/cache/org/plugin` -> `org/plugin`); extracts from skills path (`~/.claude/skills/my-skill` -> `my-skill`); returns `'unknown'` for unrecognized paths; handles Windows backslash paths
- [ ] `describe('generateBatches')`: verify batch math -- NOTE: `generateBatches` calls `scanSources` internally which depends on real PLUGIN_DIR/SKILL_DIR. If those dirs don't exist in test environment, it returns empty. Test the batching logic indirectly or skip if FS-dependent. Consider testing only `walkDir`, `extractNameFromFrontmatter`, `extractPluginName` as pure unit tests, and `generateBatches` as a smoke test that returns the expected shape `{ sources, pending, batches, existingCount }`

**Complexity**: Medium
**Uncertainty**: Medium (`scanSources`/`getExistingCards`/`generateBatches` depend on real FS paths from `lib/paths.js` which may not exist in CI)
**Dependencies**: Step 1 (verify fixtures)
**Blockers**: None
**Risks**: `scanSources` reads from `PLUGIN_DIR` and `SKILL_DIR` (user home directory). In CI or clean environments these may not exist, causing scanSources to return `[]`. Mitigation: test `scanSources` as a smoke test that verifies return shape rather than specific content. Focus unit tests on the pure functions (`walkDir`, `extractNameFromFrontmatter`, `extractPluginName`).

---

### Step 5: Integration Verification

**Goal**: Verify all tests pass together with zero regressions to existing test suite.

#### Expected Output

- Clean `npm test` output with all tests passing

#### Success Criteria

- [ ] `npm test` (which runs `node --test tests/*.test.js`) passes with exit code 0
- [ ] All 5 test files run: `paths.test.js`, `build-index.test.js`, `advisor-nudge.test.js`, `graph-search.test.js`, `semantic.test.js`, `build-catalog.test.js`
- [ ] Total test count >= 26 new cases + existing cases
- [ ] No test file has skipped or todo tests

#### Subtasks

- [ ] Run `npm test` and verify exit code 0
- [ ] Count total test cases across all files, confirm >= 26 new
- [ ] Verify no flaky tests by running twice

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Steps 2, 3, 4
**Blockers**: None
**Risks**: None

---

## Implementation Summary

| Step | Goal | Output | Est. Effort |
|------|------|--------|-------------|
| 1 | Create test fixtures | `tests/fixtures/graph/`, `tests/fixtures/semantic/` | S |
| 2 | graph-search tests (10+ cases) | `tests/graph-search.test.js` | M |
| 3 | semantic tests (8+ cases) | `tests/semantic.test.js` | M |
| 4 | build-catalog tests (8+ cases) | `tests/build-catalog.test.js` | M |
| 5 | Integration verification | Clean `npm test` pass | S |

**Total Steps**: 5
**Critical Path**: Step 1 -> Steps 2/3/4 (parallel) -> Step 5
**Parallel Opportunities**: Steps 2, 3, 4 can run concurrently after Step 1

---

## Risks & Blockers Summary

### High Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| Module-level state in semantic.js | Med | High | Test unloaded state first, then load once; structure describe blocks carefully |
| scanSources/getExistingCards depend on real FS | Med | Med | Test as smoke tests for shape; focus unit tests on pure functions |
| loadGraph mtime cache pollution | Low | Med | Always pass explicit graphDir to fixture path |

### Low Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| Fixture vector normalization errors | Low | Low | Use simple unit vectors with analytically known dot products |
| Windows path separator issues | Low | Low | extractPluginName already normalizes to forward slashes; test both |

---

## Verification Rubrics

### Per-Test-File Quality Gate

Each test file MUST satisfy ALL of the following:

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | Correct imports | File starts with `require('node:test')` and `require('node:assert/strict')` |
| 2 | Minimum case count | `grep -c "it(" <file>` returns >= threshold (10/8/8) |
| 3 | All exports covered | Every function in `module.exports` of the source has at least 1 test |
| 4 | Edge cases present | At least 2 edge cases per file (empty input, null, missing data) |
| 5 | No external deps | No `require` of npm packages; only `node:*` built-ins and project files |
| 6 | Deterministic | Running twice produces identical results |
| 7 | Isolated | Each test can run independently (no order dependency between `it()` blocks within a `describe`) |
| 8 | Fast | All tests in the file complete in < 2 seconds |

### Acceptance Verification Commands

```bash
# Individual file verification
node --test tests/graph-search.test.js
node --test tests/semantic.test.js
node --test tests/build-catalog.test.js

# Full suite (must include all 6 test files)
npm test

# Case count verification
grep -c "it(" tests/graph-search.test.js   # >= 10
grep -c "it(" tests/semantic.test.js       # >= 8
grep -c "it(" tests/build-catalog.test.js  # >= 8
```

---

## Definition of Done (Task Level)

- [ ] All 3 test files created and passing individually
- [ ] All fixtures created under `tests/fixtures/`
- [ ] `npm test` passes with exit code 0 (zero regressions)
- [ ] Total new test cases >= 26
- [ ] No test depends on network, real plugin dirs, or non-deterministic state
- [ ] All acceptance criteria verified
