---
aliases: [pair-agent, agente-pareamento, pair, pareamento-agente, remote-pair]
type: skill
source: global:pair-agent
invocation: /pair-agent
category: utility
inputs: [browser session URL, setup key generation request, remote agent connection details]
outputs: [setup key for remote agent, pairing instructions, active browser-agent bridge session]
estimated_tokens: 5000
---

# Pair Agent

## Conceitos
- [[automation]] — bridges remote AI agents with local browser sessions
- [[deployment]] — enables cross-environment agent collaboration
- [[security]] — generates secure setup keys for authenticated pairing

## Workflow
1. Generate a unique setup key for the pairing session
2. Print connection instructions for the remote agent to consume
3. Establish and maintain the browser-agent bridge for collaborative work

## Conecta com
- [[agent-browser]] recebe: active browser session for remote agent to control
- [[cc-agent]] recebe: pairing configuration for multi-agent orchestration

## Quando usar
- When you need a remote AI agent to interact with your local browser
- When setting up cross-agent collaboration that requires browser access
- When debugging or testing requires an external agent to observe browser state
