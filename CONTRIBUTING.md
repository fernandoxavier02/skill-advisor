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
