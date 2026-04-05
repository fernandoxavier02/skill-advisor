---
title: Codebase Impact Analysis - Unify parseFrontmatter into lib/frontmatter.js
task_file: C:/Projetos/skill-advisor/.specs/tasks/draft/unify-parse-frontmatter.refactor.md
scratchpad: C:/Projetos/skill-advisor/.specs/scratchpad/fix-analysis-unify-parse-frontmatter.md
created: 2026-04-05
status: complete
---

# Codebase Impact Analysis: Unify parseFrontmatter into lib/frontmatter.js

## Summary

- **Files to Modify**: 2 files
- **Files to Create**: 2 files (lib/frontmatter.js + tests/frontmatter.test.js)
- **Files to Delete**: 0 files
- **Test Files Affected**: 1 existing file (tests/build-index.test.js) — zero modifications required
- **Risk Level**: Low

---

## Grep Evidence: parseFrontmatter Definitions

The following grep commands were run to confirm there are exactly 2 `parseFrontmatter` definitions and no hidden copies.

**Command**: `grep -rn "function parseFrontmatter" /c/Projetos/skill-advisor` (excluding node_modules)

**Result**:
```
lib/build-graph.js:31:function parseFrontmatter(content) {
lib/build-index.js:15:function parseFrontmatter(content) {
```

**Command**: `grep -rn "parseFrontmatter" /c/Projetos/skill-advisor --include="*.js" --include="*.cjs" --include="*.mjs"` (excluding node_modules)

**Result** (all occurrences):
```
lib/build-graph.js:20    — comment (doc block)
lib/build-graph.js:31    — DEFINITION
lib/build-graph.js:192   — internal usage
lib/build-graph.js:206   — internal usage
lib/build-graph.js:224   — internal usage
lib/build-graph.js:343   — module.exports
lib/build-index.js:15    — DEFINITION
lib/build-index.js:80    — internal usage
lib/build-index.js:126   — internal usage
lib/build-index.js:150   — internal usage
lib/build-index.js:328   — module.exports
tests/build-index.test.js:4   — import (from build-index)
tests/build-index.test.js:8,11,18,24,32,39,47,54 — test usages
```

**Conclusion**: Exactly 2 definitions exist. No copies in hooks, agents, commands, or other lib files. No `.ts`, `.cjs`, or `.mjs` files define it.

---

## Files to be Modified/Created

### Primary Changes

```
lib/
├── frontmatter.js          # NEW: Unified parser (extracted from build-graph.js + BOM from build-index.js)
├── build-index.js          # UPDATE: Remove inline parseFrontmatter, require('./frontmatter'), re-export parseFrontmatter
└── build-graph.js          # UPDATE: Remove inline parseFrontmatter + coerceScalar, require('./frontmatter')

tests/
├── frontmatter.test.js     # NEW: Comprehensive TDD tests for the unified parser
└── build-index.test.js     # NO CHANGE REQUIRED — re-export strategy keeps this file passing as-is
```

---

## Capability Delta: What the Unified Version Must Handle

Both implementations are inlined in their respective files. The graph version is the more capable designated base. The unified module must merge all capabilities from both.

| Feature | build-index.js:15 | build-graph.js:31 | Unified Decision |
|---------|:-----------------:|:-----------------:|:----------------:|
| BOM stripping (`\uFEFF`) | YES | NO | INCLUDE (Windows compat) |
| Key regex allows `_` prefix | NO | YES | Use graph regex |
| Blank line skipping | NO | YES | INCLUDE |
| Comment line skipping (`#`) | NO | YES | INCLUDE |
| Inline arrays `[a, b, c]` | NO | YES | INCLUDE |
| YAML dash lists | NO | YES | INCLUDE |
| Quoted values (`"` and `'`) | Partial (double only) | YES | INCLUDE |
| Boolean/number/null coercion | NO | YES (coerceScalar) | INCLUDE |
| Pipe/fold multiline (`\|`/`>`) | YES | NO | **MANDATORY — existing test at `tests/build-index.test.js:37-43` requires it** |
| Indented continuation lines | YES | NO | LOW PRIORITY — superseded by dash lists; covered by pipe/fold support |

---

## Key Interfaces & Contracts

### TypeScript-Style Interface

```typescript
interface FrontmatterResult {
  [key: string]: string | string[] | boolean | number | null;
}

function parseFrontmatter(content: string): FrontmatterResult | null;
function coerceScalar(s: string): string | boolean | number | null;
```

**Return contract**:
- Returns `null` if no `---` frontmatter block found
- Returns `null` if the frontmatter block contains no parseable key-value pairs (empty block)
- Returns `FrontmatterResult` otherwise, where each value is one of: `string`, `string[]`, `boolean`, `number`, or `null`

### Functions to Extract into lib/frontmatter.js

| Location | Name | Current Signature | Change Required |
|----------|------|-------------------|-----------------|
| `lib/build-index.js:15` | `parseFrontmatter` | `parseFrontmatter(content: string): FrontmatterResult\|null` | Remove — replace with require |
| `lib/build-graph.js:31` | `parseFrontmatter` | `parseFrontmatter(content: string): FrontmatterResult\|null` | Remove — replace with require |
| `lib/build-graph.js:116` | `coerceScalar` | `coerceScalar(s: string): string\|boolean\|number\|null` | Move to lib/frontmatter.js — **MUST be exported** |

### New module: lib/frontmatter.js

```js
module.exports = { parseFrontmatter, coerceScalar };
// coerceScalar MUST be exported for testability
// (task acceptance criteria: "exporting parseFrontmatter (and coerceScalar for testability)")
```

### Re-export Strategy for build-index.js (REQUIRED)

`build-index.js` **MUST** re-export `parseFrontmatter` after removing its inline definition. This is not optional.

**Rationale**: `tests/build-index.test.js:4` imports `parseFrontmatter` directly from `../lib/build-index`. The task's Definition of Done states "No modifications made to `tests/build-index.test.js`". Therefore `build-index.js` must continue to expose `parseFrontmatter` in its `module.exports`.

**Required change to `lib/build-index.js`**:
```js
// Remove inline function definition (lines 15-42)
// Add at top of file:
const { parseFrontmatter } = require('./frontmatter');

// Keep module.exports as-is at line 328:
module.exports = { main, parseFrontmatter, inferCategory, dedup, scanSkills, buildLiteIndex, buildFullIndex, truncate };
```

`build-graph.js` similarly re-exports `parseFrontmatter` at `lib/build-graph.js:343` and should be updated the same way.

---

## Integration Points

| File | Relationship | Impact | Action Needed |
|------|--------------|--------|---------------|
| `lib/build-index.js:15-42` | Contains inline implementation | High | Remove inline function, add `const { parseFrontmatter } = require('./frontmatter');`, keep re-export in module.exports |
| `lib/build-graph.js:31-123` | Contains inline implementation + coerceScalar | High | Remove inline functions, add `const { parseFrontmatter } = require('./frontmatter');` |
| `tests/build-index.test.js:4` | Imports `parseFrontmatter` from `../lib/build-index` | None | Zero modifications needed — re-export from build-index.js satisfies this |
| `lib/build-catalog.js:52` | Has its own `extractNameFromFrontmatter` (regex only) | None | Not affected — uses different function for different purpose |
| `hooks/advisor-nudge.cjs` | Does not use parseFrontmatter | None | Not affected |

---

## Similar Implementations

### Pattern: build-catalog.js extractNameFromFrontmatter

- **Location**: `lib/build-catalog.js:52-56`
- **Why relevant**: Shows the project already accepted "simple enough for purpose" regex approach for catalog building. The unified frontmatter.js is the counterpart for full parsing.
- **Key note**: This function is intentionally simple (single-field regex extraction) and should NOT be replaced with the full parser.

---

## Test Coverage

### Existing Tests — Zero Modifications Required

| Test File | Tests Affected | Update Required |
|-----------|----------------|-----------------|
| `tests/build-index.test.js:4` | All 7 `parseFrontmatter` tests (lines 8-58) | NONE — re-export from build-index.js preserves the import path |

The 7 existing tests that must continue to pass (via re-export):
1. `tests/build-index.test.js:9` — basic name/description extraction
2. `tests/build-index.test.js:16` — null for no frontmatter
3. `tests/build-index.test.js:22` — null for empty frontmatter block
4. `tests/build-index.test.js:30` — quoted values
5. `tests/build-index.test.js:37` — **multiline pipe values** (MANDATORY support in unified parser)
6. `tests/build-index.test.js:45` — Windows CRLF line endings
7. `tests/build-index.test.js:52` — BOM-prefixed files

### New Tests Needed (TDD — write BEFORE creating lib/frontmatter.js)

| Test Type | Location | Coverage Target |
|-----------|----------|-----------------|
| Unit | `tests/frontmatter.test.js` | All features below |

New test cases required for `tests/frontmatter.test.js`:

1. Basic key:value string
2. No frontmatter block → returns null
3. Empty frontmatter block (`---\n---`) → returns null
4. BOM-prefixed content → strips BOM, parses correctly
5. Windows CRLF line endings
6. Quoted values (double quotes `"..."`)
7. Quoted values (single quotes `'...'`)
8. Inline array `key: [a, b, c]` → returns `string[]`
9. Inline array with spaces `key: [ a , b ]` → trims elements
10. YAML dash list block → returns `string[]`
11. YAML dash list with blank lines inside block
12. Boolean coercion: `true` → `true`, `false` → `false`
13. Number coercion: `42` → `42`, `3.14` → `3.14`
14. Null coercion: `null` → `null`, `~` → `null`
15. Comment lines (`# comment`) → skipped
16. Blank lines between keys → skipped
17. **Pipe/fold multiline (`|`) → appends continuation lines** (MANDATORY — matches existing test at `build-index.test.js:37-43`)
18. Mixed fields: strings + arrays + booleans in single block
19. Key with underscore prefix (`_key: value`)
20. coerceScalar exported and callable independently

---

## Risk Assessment

### High Risk Areas

| Area | Risk | Mitigation |
|------|------|------------|
| Re-export from build-index.js | If re-export is omitted, `tests/build-index.test.js:4` breaks immediately | **REQUIRED**: keep `parseFrontmatter` in build-index.js module.exports after removing inline impl |
| Pipe/fold multiline in unified parser | `tests/build-index.test.js:37-43` tests pipe multiline directly; unified parser lacking this support causes test failure | Pipe/fold support is **MANDATORY** in unified parser |
| coerceScalar not exported | `tests/frontmatter.test.js` cannot test coerceScalar independently; task spec explicitly requires export | **MUST** export `coerceScalar` from frontmatter.js |
| Empty value → null vs empty string | Graph version sets `result[key] = null` for empty value with no list items; build-index.js sets `result[key] = ''` for pipe/fold empty values | Document behavior: unified parser returns empty string for pipe/fold with no continuation lines; callers use `fm.description \|\| ''` pattern — safe with either |

---

## Recommended Exploration

Before implementation, developer should read:

1. `lib/build-index.js:15-42` — Full inline implementation to understand what must NOT be lost (BOM, pipe/fold)
2. `lib/build-graph.js:31-123` — Full inline implementation that becomes the base (includes coerceScalar)
3. `tests/build-index.test.js:37-43` — The multiline pipe test that MUST continue to pass after refactor (MANDATORY parser feature)

---

## Verification Summary

| Check | Status | Notes |
|-------|--------|-------|
| All affected files identified | ✅ | 2 to modify, 2 to create; grep evidence provided |
| Integration points mapped | ✅ | 5 files checked; 2 consumers, 1 re-export dependency, 2 unaffected |
| Similar patterns found | ✅ | extractNameFromFrontmatter in build-catalog.js (intentionally separate) |
| Test coverage analyzed | ✅ | 7 existing tests (zero modifications via re-export); ~20 new tests needed |
| Risks assessed | ✅ | Pipe/fold mandatory, re-export required, coerceScalar must be exported |
| Grep evidence provided | ✅ | Exactly 2 definitions confirmed; no hidden copies |
| TypeScript-style interface provided | ✅ | FrontmatterResult interface + function signatures documented |
| coerceScalar export decision | ✅ | MUST be exported (task acceptance criteria explicit) |
| Re-export guidance | ✅ | REQUIRED — not optional; no change to test files |
| Pipe/fold support classification | ✅ | MANDATORY — existing test at build-index.test.js:37-43 depends on it |

Limitations/Caveats: `paths.js` does not export `getVaultDir` or `getSkillsDir` visibly (build-catalog.js imports `getSkillsDir` which is not in paths.js:26-34 — likely a bug or dead import unrelated to this task). Not investigated further as it is outside scope.
