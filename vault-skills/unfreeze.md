---
aliases: [unfreeze, unfreeze-scope, scope-expansion, descongelar]
type: skill
source: unfreeze
invocation: /unfreeze
category: utility
inputs: [current freeze state]
outputs: [expanded edit permissions]
estimated_tokens: small
---

# Unfreeze

## Conceitos
- [[freeze-boundary]] — directory scope restrictions
- [[scope-management]] — controlling edit permissions
- [[directory-scope]] — limiting changes to specific folders
- [[freeze-state]] — tracking scope restrictions

## Workflow
1. Check current freeze boundary
2. Clear freeze restrictions
3. Allow edits to all directories
4. Continue session without scope limits

## Conecta com
- [[freeze]] creates: freeze boundaries (inverse operation)
- [[careful]] uses: safety mode with warnings
- [[guard]] uses: directory scoping

## Quando usar
- Need to edit outside frozen directory
- Expanding scope after focused work
- Lifting restrictions on edit scope
- After using /freeze to broaden access
