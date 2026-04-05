---
title: Define data schemas with JSDoc typedefs in lib/schemas.js
depends_on:
  - unify-parse-frontmatter.refactor.md
  - centralize-constants.refactor.md
---

## Initial User Prompt

Phase 0, Task 0.5: Functions accept and return plain objects with no documented shape. Create lib/schemas.js with @typedef for IndexEntry, GraphNode, GraphEdge, SkillCardV2, PipelineSpec, CatalogEntry, EmbeddingMeta, GateDecision. Add validation functions for module boundaries. Apply TDD. GitHub issue #5.

## Description

The skill-advisor codebase passes plain JavaScript objects between modules (`build-index.js`, `build-graph.js`, `build-catalog.js`, `graph-search.js`, `semantic.js`, `build-embeddings.js`) with no documented or enforced shapes. This makes it impossible to know what fields an object carries without reading the producing function, and introduces silent bugs when fields are missing or misspelled.

This task creates `lib/schemas.js` containing:

1. **8 JSDoc `@typedef` definitions** that document every data shape flowing between modules:
   - `IndexEntry` -- output of `build-index.js` scanners (fields: `id`, `type`, `source`, `name`, `description`, `invocation`, `category`)
   - `GraphNode` -- nodes in `adjacency.json` produced by `build-graph.js` (fields: `type`, `name`, `aliases`, `edges`, plus type-specific fields: `domain` for concepts, `invocation`/`category`/`inputs`/`outputs`/`estimated_tokens` for skills, `steps`/`triggers` for pipelines)
   - `GraphEdge` -- typed edge between graph nodes (fields: `source`, `target`, `type`, `weight`)
   - `SkillCardV2` -- enriched vault card per design spec Section 4 (all v1 fields plus `plugin`, `workflow_steps`, `workflow_summary`, `requires_user_input`, `spawns_subagents`, `modifies_files`, `destructive`, `autonomy`, `works_well_with`, `often_precedes`, `often_follows`, `incompatible_with`, `estimated_minutes`, `complexity`)
   - `PipelineSpec` -- living pipeline document per design spec Section 7 (fields: `pipeline_id`, `task`, `status`, `mode`, `created_at`, `updated_at`, `total_phases`, `completed_phases`, `estimated_minutes`, `estimated_tokens`, `phases[]`)
   - `CatalogEntry` -- output of `build-catalog.js` scanSources (fields: `id`, `type`, `name`, `sourcePath`, `content`, `pluginName`)
   - `EmbeddingMeta` -- metadata block for embedding files per design spec Section 6 (fields: `provider`, `model`, `dimensions`, `timestamp`)
   - `GateDecision` -- output of advisor-monitor per design spec Section 3.5 (fields: `phase_id`, `skill`, `status`, `reason`, `timestamp`, `outputs_validated`)

2. **8 validation functions** (`validateIndexEntry`, `validateGraphNode`, etc.) that return `{ valid: boolean, errors: string[] }` for use at module boundaries.

3. **JSDoc `@type` annotations** added to existing modules that produce or consume these shapes, enabling IDE autocompletion and hover docs.

All shapes were reverse-engineered from the actual codebase (`build-index.js:82-92`, `build-graph.js:195-235`, `build-catalog.js:130-136`, `graph-search.js:170-258`, `build-embeddings.js:104-109`) and the design spec (Sections 3.5, 4, 6, 7).

## Acceptance Criteria

- [ ] `lib/schemas.js` exists and exports 8 `@typedef` JSDoc types
- [ ] `lib/schemas.js` exports 8 `validate*` functions, one per type
- [ ] Each `validate*` function returns `{ valid: boolean, errors: string[] }`
- [ ] Each `validate*` function checks required fields, field types, and enum values where applicable
- [ ] `validateGraphNode` handles all 3 node subtypes (concept, skill, pipeline) with subtype-specific required fields
- [ ] `validateSkillCardV2` validates both v1 (current) and v2 (new) fields, with v2-only fields optional
- [ ] `validatePipelineSpec` validates the `status` enum (`PLANNED`, `CLARIFIED`, `EXECUTING`, `COMPLETED`, `PARTIAL`, `FAILED`)
- [ ] `validateGateDecision` validates the `status` enum (`pass`, `fail`, `retry`, `escalate`)
- [ ] `tests/schemas.test.js` exists with tests for all 8 validators (valid input, missing required fields, wrong types, edge cases)
- [ ] All tests pass: `node --test tests/schemas.test.js` exits 0
- [ ] Existing modules (`build-index.js`, `build-graph.js`, `build-catalog.js`) have `@type` annotations referencing the new typedefs
- [ ] No existing tests break: `npm test` exits 0

## Architecture Overview

**Module**: `lib/schemas.js` (new file, CommonJS)
**Test file**: `tests/schemas.test.js` (new file, node:test)
**Dependencies**: None (pure JavaScript, no external packages)
**Depended on by**: All `lib/*.js` modules (via JSDoc `@type` imports)

**Validation pattern**:
```javascript
/**
 * @param {*} obj
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateIndexEntry(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') return { valid: false, errors: ['not an object'] };
  if (typeof obj.id !== 'string') errors.push('id must be a string');
  // ... field checks
  return { valid: errors.length === 0, errors };
}
```

**Type import pattern** (for existing modules):
```javascript
/** @typedef {import('./schemas').IndexEntry} IndexEntry */
```

---

## Implementation Process

### Implementation Strategy

**Approach**: Bottom-Up with TDD
**Rationale**: Data schemas are foundational building blocks with no runtime dependencies. TDD drives the order: write RED tests for each validator first, then implement validators to make tests GREEN. Simple types first (flat objects), then complex types (nested/polymorphic).

### Phase Overview

```
Phase 1: Setup (test infrastructure)
    |
    v
Phase 2: Foundation (typedefs + RED tests)
    |
    v
Phase 3: Core Implementation (validators GREEN)
    |
    v
Phase 4: Integration (annotate existing modules)
    |
    v
Phase 5: Polish (verify, cleanup)
```

---

### Step 1: Create test file with RED tests for all validators

**Goal**: Write comprehensive failing tests that define expected validator behavior before any implementation exists.

#### Expected Output

- `tests/schemas.test.js`: Test file with ~40-50 test cases covering all 8 validators

#### Success Criteria

- [ ] `tests/schemas.test.js` exists
- [ ] Tests import all 8 `validate*` functions from `../lib/schemas`
- [ ] Each validator has tests for: valid input, missing required field, wrong field type, empty object, null input
- [ ] `validateGraphNode` tests cover all 3 subtypes (concept, skill, pipeline)
- [ ] `validatePipelineSpec` tests check enum validation for `status`
- [ ] `validateGateDecision` tests check enum validation for `status`
- [ ] Running `node --test tests/schemas.test.js` fails (RED) because `lib/schemas.js` does not exist yet

#### Subtasks

- [ ] Create `tests/schemas.test.js` with `node:test` and `node:assert/strict` imports
- [ ] Write test suite for `validateIndexEntry`: valid entry, missing `id`, missing `type`, invalid `type` enum, null input
- [ ] Write test suite for `validateGraphNode`: valid concept node, valid skill node, valid pipeline node, missing `type`, skill node missing `invocation`, concept node with extra fields OK
- [ ] Write test suite for `validateGraphEdge`: valid edge, missing `source`, missing `target`, invalid `type` enum
- [ ] Write test suite for `validateSkillCardV2`: valid v1 card (minimal), valid v2 card (full), missing required `aliases`, invalid `autonomy` enum
- [ ] Write test suite for `validatePipelineSpec`: valid spec, invalid `status` enum, missing `pipeline_id`, missing `phases`
- [ ] Write test suite for `validateCatalogEntry`: valid entry, missing `id`, missing `sourcePath`
- [ ] Write test suite for `validateEmbeddingMeta`: valid meta, missing `provider`, invalid `dimensions` (not a number)
- [ ] Write test suite for `validateGateDecision`: valid decision, invalid `status` enum, missing `phase_id`

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| File exists | `ls tests/schemas.test.js` | File found |
| Imports 8 validators | `grep -c "validate" tests/schemas.test.js` | >= 8 |
| Tests fail (RED) | `node --test tests/schemas.test.js 2>&1; echo $?` | Exit code != 0 |
| Test count | `grep -c "it(" tests/schemas.test.js` | >= 40 |

**Complexity**: Medium
**Uncertainty**: Low
**Dependencies**: None

---

### Step 2: Create lib/schemas.js with JSDoc typedefs and simple validators

**Goal**: Create the schemas module with all 8 typedefs and implement validators for the 4 simpler flat types (IndexEntry, CatalogEntry, EmbeddingMeta, GraphEdge).

#### Expected Output

- `lib/schemas.js`: Module with all 8 `@typedef` blocks and 4 working validators

#### Success Criteria

- [ ] `lib/schemas.js` exists and is valid CommonJS (`module.exports = { ... }`)
- [ ] All 8 `@typedef` blocks present with correct field documentation
- [ ] `validateIndexEntry` passes its test suite
- [ ] `validateCatalogEntry` passes its test suite
- [ ] `validateEmbeddingMeta` passes its test suite
- [ ] `validateGraphEdge` passes its test suite
- [ ] `validateIndexEntry` checks: required fields (`id`, `type`, `name`), `type` enum (`skill`, `command`, `agent`, `mcp`), string types
- [ ] `validateCatalogEntry` checks: required fields (`id`, `type`, `name`, `sourcePath`), string types
- [ ] `validateEmbeddingMeta` checks: required fields (`provider`, `model`, `dimensions`), `dimensions` is a positive number
- [ ] `validateGraphEdge` checks: required fields (`source`, `target`, `type`), `type` enum (`explicit`, `semantic_strong`, `semantic_weak`)

#### Subtasks

- [ ] Create `lib/schemas.js` with module header and JSDoc `@typedef` for all 8 types
- [ ] Implement `validateIndexEntry(obj)` with required field + type + enum checks
- [ ] Implement `validateCatalogEntry(obj)` with required field + type checks
- [ ] Implement `validateEmbeddingMeta(obj)` with required field + type checks
- [ ] Implement `validateGraphEdge(obj)` with required field + type + enum checks
- [ ] Export all 8 function names (4 implemented, 4 stubs returning `{ valid: false, errors: ['not implemented'] }`)
- [ ] Run `node --test tests/schemas.test.js` -- 4 validator suites should pass (partial GREEN)

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| File exists | `ls lib/schemas.js` | File found |
| 8 typedefs | `grep -c "@typedef" lib/schemas.js` | 8 |
| 8 exports | `grep -c "validate" lib/schemas.js` in module.exports | 8 |
| IndexEntry tests pass | `node --test --test-name-pattern="IndexEntry" tests/schemas.test.js` | Exit 0 |
| CatalogEntry tests pass | `node --test --test-name-pattern="CatalogEntry" tests/schemas.test.js` | Exit 0 |
| EmbeddingMeta tests pass | `node --test --test-name-pattern="EmbeddingMeta" tests/schemas.test.js` | Exit 0 |
| GraphEdge tests pass | `node --test --test-name-pattern="GraphEdge" tests/schemas.test.js` | Exit 0 |

**Complexity**: Medium
**Uncertainty**: Low
**Dependencies**: Step 1

---

### Step 3: Implement graph and complex validators

**Goal**: Implement the remaining 4 validators for polymorphic/nested types (GraphNode, SkillCardV2, PipelineSpec, GateDecision) to reach full GREEN.

#### Expected Output

- `lib/schemas.js`: All 8 validators fully implemented and passing

#### Success Criteria

- [ ] `validateGraphNode` handles subtypes: concept requires `domain`, skill requires `invocation`+`category`, pipeline requires `steps`
- [ ] `validateGraphNode` checks common fields: `type` enum (`concept`, `skill`, `pipeline`), `name` string, `aliases` array, `edges` array
- [ ] `validateSkillCardV2` validates required v1 fields (`aliases`, `type`, `source`, `invocation`, `category`) and optional v2 fields (`autonomy` enum when present: `auto`, `gated`)
- [ ] `validatePipelineSpec` validates `status` enum (`PLANNED`, `CLARIFIED`, `EXECUTING`, `COMPLETED`, `PARTIAL`, `FAILED`), `mode` enum (`gated`, `auto`), `phases` is an array
- [ ] `validateGateDecision` validates `status` enum (`pass`, `fail`, `retry`, `escalate`), required `phase_id`, `skill`, `reason`
- [ ] `node --test tests/schemas.test.js` exits 0 (all GREEN)
- [ ] `npm test` exits 0 (no regressions)

#### Subtasks

- [ ] Implement `validateGraphNode(obj)` with subtype dispatch: check common fields, then branch on `type` for subtype-specific required fields
- [ ] Implement `validateSkillCardV2(obj)` with required v1 field checks and optional v2 field type/enum validation
- [ ] Implement `validatePipelineSpec(obj)` with status/mode enum checks and phases array validation
- [ ] Implement `validateGateDecision(obj)` with status enum check and required field validation
- [ ] Run full test suite: `node --test tests/schemas.test.js` -- all tests GREEN
- [ ] Run existing tests: `npm test` -- no regressions

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| All schema tests pass | `node --test tests/schemas.test.js 2>&1; echo $?` | Exit 0 |
| No regressions | `npm test 2>&1; echo $?` | Exit 0 |
| GraphNode tests pass | `node --test --test-name-pattern="GraphNode" tests/schemas.test.js` | Exit 0 |
| SkillCardV2 tests pass | `node --test --test-name-pattern="SkillCardV2" tests/schemas.test.js` | Exit 0 |
| PipelineSpec tests pass | `node --test --test-name-pattern="PipelineSpec" tests/schemas.test.js` | Exit 0 |
| GateDecision tests pass | `node --test --test-name-pattern="GateDecision" tests/schemas.test.js` | Exit 0 |

**Complexity**: Medium
**Uncertainty**: Low
**Dependencies**: Step 2

---

### Step 4: Add JSDoc @type annotations to existing modules

**Goal**: Annotate existing modules with `@type` imports so IDE autocompletion and type checking work across the codebase.

#### Expected Output

- `lib/build-index.js`: `@type` annotations on scanner return values
- `lib/build-graph.js`: `@type` annotations on node construction
- `lib/build-catalog.js`: `@type` annotations on scanSources return
- `lib/graph-search.js`: `@type` annotations on search result construction

#### Success Criteria

- [ ] `lib/build-index.js` has `@typedef {import('./schemas').IndexEntry} IndexEntry` and `@returns` annotations on `scanSkills`, `scanPluginManifests`, `scanMCPManifests`
- [ ] `lib/build-graph.js` has `@typedef {import('./schemas').GraphNode} GraphNode` and `@type` on node objects in `buildGraph()`
- [ ] `lib/build-catalog.js` has `@typedef {import('./schemas').CatalogEntry} CatalogEntry` and `@returns` on `scanSources`
- [ ] `lib/graph-search.js` has `@typedef {import('./schemas').GraphNode} GraphNode` used in function signatures
- [ ] `npm test` exits 0 (no regressions -- annotations are comments only)
- [ ] No functional code changes in existing modules (only JSDoc comments added)

#### Subtasks

- [ ] Add `@typedef` import + `@returns {IndexEntry[]}` to scanner functions in `lib/build-index.js`
- [ ] Add `@typedef` import + `@type {Object<string, GraphNode>}` to nodes map in `lib/build-graph.js`
- [ ] Add `@typedef` import + `@returns {CatalogEntry[]}` to `scanSources` in `lib/build-catalog.js`
- [ ] Add `@typedef` import + param/return annotations to `graphSearch` and `bfsTraverse` in `lib/graph-search.js`
- [ ] Run `npm test` to verify no regressions

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| Import in build-index | `grep "import.*schemas" lib/build-index.js` | Match found |
| Import in build-graph | `grep "import.*schemas" lib/build-graph.js` | Match found |
| Import in build-catalog | `grep "import.*schemas" lib/build-catalog.js` | Match found |
| Import in graph-search | `grep "import.*schemas" lib/graph-search.js` | Match found |
| No regressions | `npm test 2>&1; echo $?` | Exit 0 |
| No functional changes | `git diff --stat lib/build-*.js lib/graph-search.js` | Only comment additions |

**Complexity**: Small
**Uncertainty**: Low
**Dependencies**: Step 3

---

## Implementation Summary

| Step | Goal | Output | Est. Effort |
|------|------|--------|-------------|
| 1 | RED tests for all 8 validators | `tests/schemas.test.js` (~40+ tests) | M |
| 2 | Typedefs + simple validators (4/8) | `lib/schemas.js` with IndexEntry, CatalogEntry, EmbeddingMeta, GraphEdge | M |
| 3 | Complex validators (4/8) -- full GREEN | GraphNode, SkillCardV2, PipelineSpec, GateDecision validators | M |
| 4 | Annotate existing modules | JSDoc @type imports in 4 existing files | S |

**Total Steps**: 4
**Critical Path**: Steps 1 -> 2 -> 3 -> 4 (strictly sequential, TDD-driven)
**Parallel Opportunities**: None (each step depends on the previous)

---

## Risks & Blockers Summary

### High Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| Task 0.1 (frontmatter) not merged yet | Med | Low | schemas.js has no runtime dependency on frontmatter module; only JSDoc references. Can proceed independently. |
| Task 0.2 (constants) not merged yet | Med | Low | Enum values (categories, types) are hardcoded in validators for now. When constants.js lands, refactor validators to import from there. |
| SkillCardV2 fields may change during Phase 2 design | Med | Med | Make v2-only fields optional in validator. Validator is additive -- new fields can be added without breaking existing checks. |
| GraphEdge type is implicit (no explicit object in current code) | Low | Low | Define based on design spec Section 5. Validator is forward-looking; no existing code produces GraphEdge objects yet. |

---

## Definition of Done (Task Level)

- [ ] All implementation steps completed (Steps 1-4)
- [ ] All acceptance criteria verified (12 items above)
- [ ] `tests/schemas.test.js` has 40+ tests covering all 8 validators
- [ ] `node --test tests/schemas.test.js` exits 0
- [ ] `npm test` exits 0 (no regressions)
- [ ] All 8 typedefs document field names, types, and descriptions
- [ ] All 8 validators enforce required fields, types, and enums
- [ ] 4 existing modules annotated with `@type` imports
- [ ] No high-priority risks unaddressed
