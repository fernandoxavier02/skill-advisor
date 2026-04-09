---
aliases: [advisor-gate, gate-advisor, portao-advisor, skill-gate, advisor-approval, aprovacao-advisor, loadout-gate]
type: skill
source: "plugin:skill-advisor:agent:advisor-gate"
invocation: /advisor-gate
category: planning
inputs: ["advisor loadout proposal", "skill list with rationale"]
outputs: ["user approval decision (Sim/Nao/Alterar/Sugerir)", "approved skill loadout", "gate enforcement log"]
estimated_tokens: 2000
---

# Advisor Gate

## Conceitos
- [[planning]] — enforcement checkpoint before skill execution to ensure user approval
- [[quality]] — prevents unintended skill activation through explicit gate pattern
- [[automation]] — standardized 4-option approval flow (Sim/Nao/Alterar/Sugerir)

## Workflow
1. Receive advisor loadout proposal with recommended skills and rationale
2. Present the loadout to the user with the 4-option approval pattern
3. Block execution until explicit user approval; apply modifications if requested

## Conecta com
- [[advisor-router]] recebe: approved loadout for skill routing and execution
- [[advisor-catalog]] recebe: gate feedback for catalog refinement
- [[advisor-auto]] recebe: approval signal to proceed with automatic execution

## Quando usar
- When the Skill Advisor has assembled a loadout and needs user confirmation
- When enforcing the approval gate before any multi-skill execution
- When the user wants to review, modify, or reject a proposed skill combination
