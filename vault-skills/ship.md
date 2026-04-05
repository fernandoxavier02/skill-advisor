---
aliases: [ship, shipping, pr-creation, criar-pr]
type: skill
source: ship
invocation: /ship
category: deployment
inputs: [implementation changes, version bump]
outputs: [PR created and pushed]
estimated_tokens: large
---

# Ship

## Conceitos
- [[branch-merge]] — base branch detection and merging
- [[test-execution]] — running full test suite
- [[diff-review]] — analyzing changes before shipping
- [[version-bumping]] — semantic versioning updates
- [[changelog-generation]] — documenting changes
- [[git-workflow]] — commit, push, and PR creation

## Workflow
1. Detect base branch and merge local changes
2. Run full test suite
3. Review complete diff
4. Bump VERSION file (semantic versioning)
5. Update CHANGELOG
6. Commit all changes
7. Push to remote
8. Create PR for review

## Conecta com
- [[review]] validates: created PR
- [[land-and-deploy]] merges: reviewed PR
- [[health]] verifies: test pass

## Quando usar
- Ready to create a PR from completed work
- Feature/bugfix development complete
- Before shipping to production
- Team code review workflow
- Version release preparation
