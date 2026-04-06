---
title: Set autoDiscover false and hook disabled by default
depends_on: []
---

## Initial User Prompt

Phase 0, Task 0.7: Plugin currently uses autoDiscover: true and hook is enabled by default. Set autoDiscover: false in plugin.json, disable hook by default in hooks.json/advisor-config.json, update advisor-nudge.cjs to respect disabled-by-default config. GitHub issue #7.

## Description

The skill-advisor plugin currently auto-discovers its commands, agents, hooks, and skills via `autoDiscover: true` in `plugin.json`, and the nudge hook runs on every prompt by default. Per the v2 architecture decision (design spec section 2, table rows "autoDiscover" and "Hook nudge"), the plugin should be invoked only via explicit `/advisor` command and the hook should be opt-in via `/advisor-config enable`.

This chore makes three coordinated config changes:

1. **`plugin.json`**: Set `autoDiscover` to `false` so Claude Code does not auto-register plugin components -- they are registered explicitly via the plugin manifest structure.
2. **`lib/advisor-config.json`**: Create this file with `enabled: false` as the default state, establishing the hook as opt-in.
3. **`hooks/advisor-nudge.cjs`**: Add an early check in `main()` that reads `advisor-config.json` and exits immediately if `enabled` is `false` or the file is missing (matching the new disabled-by-default behavior).
4. **`commands/advisor-config.md`**: Update default JSON literals from `"enabled": true` to `"enabled": false` so the command aligns with the new default.

## Acceptance Criteria

- [ ] `plugin.json` has `"autoDiscover": false`
- [ ] `lib/advisor-config.json` exists with `{"enabled": false, "threshold": 0.35}`
- [ ] `hooks/advisor-nudge.cjs` reads `advisor-config.json` early in `main()` and returns immediately when `enabled` is `false`
- [ ] `hooks/advisor-nudge.cjs` treats missing config file as disabled (returns early)
- [ ] `ADVISOR_ENABLED=true` env var still overrides config file (backward compatibility)
- [ ] `commands/advisor-config.md` default JSON uses `"enabled": false`
- [ ] Running `/advisor-config enable` creates/updates `advisor-config.json` with `"enabled": true` (existing behavior, just verify)
- [ ] Existing unit tests pass without modification
- [ ] No behavior change when user has explicitly enabled the hook via `/advisor-config enable`

## Architecture Overview

Per design spec section 2 (Architectural Decisions):
- `autoDiscover: false` -- plugin invoked only via `/advisor` command
- Hook nudge disabled by default, opt-in via `/advisor-config enable` -- zero noise, user controls

Files involved:
- `plugin.json` (line 9): `"autoDiscover": true` -> `false`
- `lib/advisor-config.json` (new file): default config state
- `hooks/advisor-nudge.cjs` (lines 25, 172-175): add config file read + early exit
- `commands/advisor-config.md` (lines 28, 36, 47): update default literals
- `lib/paths.js`: already has `getConfigPath()` -- no changes needed

---

## Implementation Process

### Implementation Strategy

**Approach**: Bottom-Up
**Rationale**: Config-only chore. Establish config state in static files first (Level 0), then update code that reads them (Level 1). Simple dependency chain, no architectural decisions required.

### Phase Overview

```
Phase 1: Config File Changes (parallel, no dependencies)
    |
    v
Phase 2: Hook Code Update (depends on config format)
    |
    v
Phase 3: Verification
```

---

### Step 1: Set autoDiscover to false in plugin.json

**Goal**: Prevent Claude Code from auto-registering plugin components. Plugin components are already explicitly declared in the manifest structure.

#### Expected Output

- `plugin.json` with `"autoDiscover": false`

#### Success Criteria

- [ ] `plugin.json` line 9 reads `"autoDiscover": false,`
- [ ] `plugin.json` is valid JSON (no syntax errors)
- [ ] No other fields in `plugin.json` are modified

#### Subtasks

- [ ] Edit `plugin.json`: change `"autoDiscover": true` to `"autoDiscover": false`
- [ ] Validate JSON syntax with `node -e "JSON.parse(require('fs').readFileSync('plugin.json','utf8'))"`

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| Value changed | `node -e "console.log(JSON.parse(require('fs').readFileSync('plugin.json','utf8')).autoDiscover)"` | `false` |
| Valid JSON | `node -e "JSON.parse(require('fs').readFileSync('plugin.json','utf8')); console.log('OK')"` | `OK` |

---

### Step 2: Create lib/advisor-config.json with disabled default

**Goal**: Establish the default hook state as disabled. This file is the single source of truth for hook enabled/disabled state, read by both the hook and the `/advisor-config` command.

#### Expected Output

- `lib/advisor-config.json` with `{"enabled": false, "threshold": 0.35}`

#### Success Criteria

- [ ] File `lib/advisor-config.json` exists
- [ ] Contains `{"enabled": false, "threshold": 0.35}`
- [ ] `lib/paths.js` `getConfigPath()` resolves to this file (already does -- verify only)

#### Subtasks

- [ ] Create `lib/advisor-config.json` with content `{"enabled": false, "threshold": 0.35}`
- [ ] Verify `lib/paths.js` `getConfigPath()` points to correct location

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| File exists | `node -e "require('fs').accessSync('lib/advisor-config.json'); console.log('OK')"` | `OK` |
| Enabled is false | `node -e "console.log(JSON.parse(require('fs').readFileSync('lib/advisor-config.json','utf8')).enabled)"` | `false` |
| Path matches | `node -e "console.log(require('./lib/paths').getConfigPath())"` | Ends with `lib/advisor-config.json` |

---

### Step 3: Update advisor-config.md command defaults

**Goal**: Align the `/advisor-config` command's default JSON literals with the new disabled-by-default behavior, so when no config file exists the command shows `enabled: false`.

#### Expected Output

- `commands/advisor-config.md` with default JSON using `"enabled": false`

#### Success Criteria

- [ ] Line 28: default JSON shows `"enabled": false` instead of `"enabled": true`
- [ ] Line 36: fallback JSON shows `"enabled": false` instead of `"enabled": true`
- [ ] Line 47: fallback JSON shows `"enabled": false` instead of `"enabled": true`
- [ ] Command logic for `enable` action still writes `"enabled": true` (no change)
- [ ] Command logic for `disable` action still writes `"enabled": false` (no change)

#### Subtasks

- [ ] Edit `commands/advisor-config.md` line 28: change `'{"enabled": true, "threshold": 0.35}'` to `'{"enabled": false, "threshold": 0.35}'`
- [ ] Edit `commands/advisor-config.md` line 36: change `'{"enabled": true, "threshold": 0.35}'` to `'{"enabled": false, "threshold": 0.35}'`
- [ ] Edit `commands/advisor-config.md` line 47: change `'{"enabled": true, "threshold": 0.35}'` to `'{"enabled": false, "threshold": 0.35}'`

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| No "enabled": true in defaults | Grep for `"enabled": true` in advisor-config.md | Only in the `enable` action block (line ~50) |
| Enable action preserved | Grep for `"enabled": true` in enable block | Present (writes true when user enables) |

---

### Step 4: Update advisor-nudge.cjs to respect disabled-by-default config

**Goal**: Make the hook read `advisor-config.json` early in `main()` and exit immediately when the hook is disabled. This is the behavioral change that makes the hook opt-in.

#### Expected Output

- `hooks/advisor-nudge.cjs` with config file check in `main()` function

#### Success Criteria

- [ ] `main()` reads `advisor-config.json` before any prompt processing
- [ ] If config file has `enabled: false`, `main()` returns early (no output)
- [ ] If config file is missing, `main()` returns early (disabled by default)
- [ ] If config file has `enabled: true`, hook proceeds normally
- [ ] `ADVISOR_ENABLED=true` env var still works as override (checked before config file)
- [ ] `ADVISOR_ENABLED=false` env var still disables (existing behavior on line 25)
- [ ] Config file read uses `fs.readFileSync` with try/catch (no crashes on malformed JSON)
- [ ] Path resolution uses `path.resolve(__dirname, '..', 'lib', 'advisor-config.json')`
- [ ] Existing tests for `tokenize`, `scoreEntry` still pass

#### Subtasks

- [ ] Add config file path constant near line 28 (after existing config section): `const CONFIG_PATH = path.resolve(__dirname, '..', 'lib', 'advisor-config.json');`
- [ ] Add config read function that returns `{enabled, threshold}` with safe defaults
- [ ] In `main()` after line 174 (`if (!ENABLED) return;`), add config file check: read config, if `enabled !== true` return early
- [ ] Ensure env var `ADVISOR_ENABLED=true` takes precedence over config file (the existing `ENABLED` const on line 25 handles `ADVISOR_ENABLED=false`; for the override case, check if env var is explicitly set to `'true'` before reading config)
- [ ] Run existing tests: `node --test tests/` or equivalent

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| Config disabled, no output | `ADVISOR_ENABLED="" CLAUDE_USER_PROMPT="fix the bug" node hooks/advisor-nudge.cjs` | No output (empty) |
| Config enabled, has output | Write temp config `{"enabled":true,"threshold":0.35}`, run with valid index | Nudge output or silent (depends on index) |
| Env override works | `ADVISOR_ENABLED=true CLAUDE_USER_PROMPT="fix the bug" node hooks/advisor-nudge.cjs` | Processes prompt (may produce nudge) |
| Env disable works | `ADVISOR_ENABLED=false CLAUDE_USER_PROMPT="fix" node hooks/advisor-nudge.cjs` | No output |
| Missing config = disabled | Rename config, run hook | No output |
| Malformed config = disabled | Write `{bad json` to config, run hook | No output (no crash) |
| Existing tests pass | `cd C:/Projetos/skill-advisor && npm test` or `node --test tests/` | All pass |

---

### Step 5: End-to-end verification

**Goal**: Verify all changes work together and no regressions exist.

#### Success Criteria

- [ ] `plugin.json` has `autoDiscover: false`
- [ ] `lib/advisor-config.json` has `enabled: false`
- [ ] Hook produces no output with default config
- [ ] Hook produces output after `/advisor-config enable` (simulated by writing `enabled: true` to config)
- [ ] All existing tests pass
- [ ] `git diff` shows only the 4 expected files changed

#### Subtasks

- [ ] Run full test suite
- [ ] Run hook with default config (expect silence)
- [ ] Temporarily set config to enabled, run hook (expect normal behavior)
- [ ] Restore config to disabled default
- [ ] Review `git diff` for unexpected changes

#### Verification Rubric

| Check | Command | Expected |
|-------|---------|----------|
| Only expected files | `git diff --name-only` | plugin.json, lib/advisor-config.json, hooks/advisor-nudge.cjs, commands/advisor-config.md |
| Tests pass | `npm test` or `node --test tests/` | All pass |
| Default = silent | `CLAUDE_USER_PROMPT="test" node hooks/advisor-nudge.cjs` | No output |

---

## Implementation Summary

| Step | Goal | Output | Est. Effort |
|------|------|--------|-------------|
| 1 | Disable auto-discovery | `plugin.json` updated | S |
| 2 | Create default config | `lib/advisor-config.json` created | S |
| 3 | Align command defaults | `commands/advisor-config.md` updated | S |
| 4 | Hook respects config | `hooks/advisor-nudge.cjs` updated | S |
| 5 | End-to-end verification | All changes validated | S |

**Total Steps**: 5
**Critical Path**: Steps 1-3 are parallel (Level 0), Step 4 depends on Step 2, Step 5 depends on all
**Parallel Opportunities**: Steps 1, 2, 3 can run concurrently
**Estimated Total Effort**: Small (< 1 hour)

---

## Risks & Blockers Summary

### Low Priority

| Risk/Blocker | Impact | Likelihood | Mitigation |
|--------------|--------|------------|------------|
| Config file path resolution differs between dev and installed plugin | Low | Low | Use `path.resolve(__dirname, '..', 'lib')` same as existing `getIndexLitePath()` pattern |
| Existing tests rely on hook being enabled | Low | Low | Tests test `tokenize`/`scoreEntry` exports, not `main()` -- no impact |
| Users with `ADVISOR_ENABLED` env var set lose override | Low | Low | Keep env var check as primary override before config file check |

---

## Definition of Done (Task Level)

- [ ] All 5 implementation steps completed
- [ ] All acceptance criteria verified
- [ ] Existing tests pass without modification
- [ ] `git diff` shows only the 4 expected files
- [ ] Hook is silent by default, activatable via `/advisor-config enable`
