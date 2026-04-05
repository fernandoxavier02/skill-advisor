---
aliases: [fpf:reset, limpar-ciclo, reset reasoning cycle]
type: skill
source: context-engineering-kit
invocation: /fpf:reset
category: planning
inputs: [reset scope, preservation options]
outputs: [clean FPF state, preserved artifacts if specified]
estimated_tokens: small
---

# Reset Cycle

## Conceitos
- [[state-reset]] — clearing hypothesis exploration state
- [[soft-reset]] — preserving important decisions
- [[hard-reset]] — complete knowledge base clear
- [[checkpoint-preservation]] — saving before reset

## Workflow
1. Choose reset type: soft or hard
2. Identify artifacts to preserve (if soft reset)
3. Clear active hypothesis exploration state
4. Reset reasoning cycle to initial state
5. Prepare for fresh exploration
6. Option: restore from checkpoint if needed

## Conecta com
- [[fpf-status]] shows: reset readiness
- [[fpf-actualize]] follows: reset operation
- checkpoint tools can: save before hard reset

## Quando usar
- Starting fresh exploration after major changes
- Clearing conflicting hypothesis states
- Resetting after a failed verification cycle
- Preparing for a complete architectural review
