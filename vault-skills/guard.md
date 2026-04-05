---
aliases: [guard, safety-mode, full-safety, modo-seguro]
type: skill
source: guard
invocation: /guard
category: quality
inputs: [code changes]
outputs: [guarded execution with warnings]
estimated_tokens: small
---

# Guard

## Conceitos
- [[destructive-warnings]] — alerts for rm -rf, DROP TABLE, force-push
- [[directory-scoping]] — limiting edits to safe directories
- [[safety-mode]] — combined careful + freeze
- [[confirmation-prompts]] — requiring explicit user approval

## Workflow
1. Enable full safety mode
2. Set directory scope restrictions
3. Show warnings for destructive commands
4. Require explicit confirmation
5. Prevent accidental deletions
6. Log safety violations

## Conecta com
- [[careful]] provides: destructive warnings only
- [[freeze]] provides: directory scoping only
- [[unfreeze]] clears: scope restrictions

## Quando usar
- Working with critical systems
- Production deployments
- Destructive database operations
- When safety is paramount
- Team collaboration with safety requirements
