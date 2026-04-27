# Contributing to skill-advisor

Thanks for working on `skill-advisor`. This document captures the few hard
rules a contributor must follow when shipping a change. The rest of the
process (review, release, packaging) is documented elsewhere.

## How to validate a change locally

```
npm ci
npm run validate
```

`npm run validate` runs the full test suite (`npm test`), rebuilds the
advisor index (`npm run index`) and finally invokes the smoke-runner
(`node lib/smoke-runner.js`). CI runs exactly the same command on Node 18
and Node 20 for every push and pull request — see
`.github/workflows/ci.yml`.

There is intentionally **no pre-commit hook**. TDD requires the freedom to
commit a red test before a green implementation, and a pre-commit gate
would confiscate that flow. CI on push is the gate that matters for
publication.

## Slice Discipline

Every change to `skill-advisor` ships as a *vertical slice* — one thin
end-to-end piece of behavior, with tests written first. Three rules govern
how a slice is shaped, named, and traced back to the spec. **All three are
mandatory.**

1. **BDD scenario in test names.** Every slice introduces (or extends) at
   least one test whose name follows the Given/When/Then pattern, mapping
   directly to the requirement's EARS Acceptance Criterion. Example:

   ```js
   it('Given prompt="abc" and threshold=12, When runNudge runs, Then earlyExit is true', ...)
   ```

   The Given clause states the precondition, the When clause names the
   triggering event, the Then clause names the observable outcome. Tests
   that do not follow this shape do not satisfy the slice.

2. **Reference requirement IDs with `_Requirements: N.M_`.** Every commit
   message and every task entry that ships work for a slice must end with
   a line of the form `_Requirements: N.M_` (or a comma-separated list:
   `_Requirements: 9.1, 9.2_`). The IDs are numeric only and refer to the
   Acceptance Criteria in
   `.kiro/specs/skill-advisor-refactor/requirements.md`. Downstream
   tooling greps for this exact pattern, so the underscores and the
   capital `R` are load-bearing.

3. **No behavior outside an EARS criterion.** If, while implementing a
   slice, you discover that the change introduces behavior not covered by
   an EARS Acceptance Criterion in `requirements.md`, **halt the slice**.
   Update `requirements.md` with the new criterion, get it reviewed, and
   only then resume the slice. Adding behavior that no requirement
   describes is the single fastest way to drift the spec out of sync with
   the codebase, and it is not an acceptable outcome of a slice.

If a change does not fit the discipline above (for example, a one-off
chore that touches only documentation), say so explicitly in the commit
message. The discipline applies to behavioral and architectural changes;
it is not a barrier to typo fixes.

## Architectural guards — known limitations

The repository ships four architectural guards enforced by `npm run validate`:

- **DI-1 (Module Load Purity)** — `tests/pipeline-config.test.js` patches
  `fs.readFileSync`, `fs.statSync`, `fs.readdirSync` BEFORE requiring
  `lib/constants.js` and asserts zero invocations during module load.
- **DI-2 (Layered Dependency Direction)** — `tests/dependency-edges.test.js`
  greps every `lib/<non-builder>.js` for `require('./build-*.js')`.
- **DI-3 (Manifest Version Coherence)** — `tests/version-coherence.test.js`
  cross-references `package.json` and `.claude-plugin/plugin.json` SemVer.
- **Vault env single source** — `tests/vault-env-single-source.test.js`
  greps `lib/paths.js` for direct env reads.

**Known limitation of DI-1**: the guard tests for *user-initiated fs I/O
purity* by patching the three fs functions named above. It does NOT test
for *transitive require-chain purity*. A module may pass DI-1 by avoiding
fs calls at module load, while still triggering a long chain of transitive
requires that load other modules. As of 0.5.0, `lib/constants.js:144` does
exactly this — it has a top-level `require('./pipeline-config.js')`. This
was flagged by adversarial review as a structural violation of the "pure
constants" boundary; it is parked for 0.5.1 hardening (either strengthen
the guard with require-chain assertion, or move the require inside a
lazy getter).

If you add a new architectural guard or strengthen an existing one,
document its scope and known limitations here so the next contributor
understands what it does and does not catch.

## Test environment conventions

- `npm test` is self-contained: the script wraps `node --test` in a Node-eval
  shim that sets `SKILL_ADVISOR_TEST=1` before spawning. This env flag
  authorizes test-only reset hooks (`__resetCacheForTests`,
  `__resetLegacyWarnedForTesting`) to clear module-scope latches between
  scenarios. Production code paths that try to call these reset hooks
  without the flag will throw — defense-in-depth.
- `npm run test:perf` runs the perf-assertion suite separately (~60s),
  setting `RUN_PERF=1` so the perf tests fire (they are skipped in
  default `npm test`). The perf gate is platform-specific: it skips
  the headroom check when `process.platform !== baseline.platform`.
  CI Linux must re-capture the baseline on first green main run via
  `node tests/_capture-perf-baseline.js` and commit the resulting
  `tests/fixtures/perf-baseline.json`.
- `PERF_STRETCH=1` opt-in env enables the p50 stretch-goal log line
  in the perf suite. Off by default to keep CI logs lean.
