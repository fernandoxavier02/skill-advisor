---
aliases: [cc, cc-toolkit, claude-code-toolkit, kit-claude-code, ferramenta-claude-code, swiss-army-knife]
type: skill
source: plugin:cc-toolkit:cc
invocation: /cc
category: utility
inputs: [user query about Claude Code capabilities, help request]
outputs: [routed skill invocation, interactive triage menu, skill recommendation]
estimated_tokens: 2000
---

# CC (Claude Code Swiss Army Knife)

## Conceitos
- [[tooling]] — central hub for all cc-toolkit skills and capabilities
- [[automation]] — interactive triage that routes to the right specialized skill
- [[documentation]] — provides help and guidance on available Claude Code tools

## Workflow
1. User invokes /cc or asks for help with Claude Code capabilities
2. Interactive triage identifies the user's intent and available skills
3. Routes to the appropriate specialized cc-toolkit skill or provides guidance

## Conecta com
- [[cc-expert-router]] recebe: questions about Claude Code setup and configuration
- [[cc-security]] recebe: security and permissions configuration requests
- [[help]] recebe: general help queries about available tools

## Quando usar
- When you need help finding the right Claude Code skill for your task
- When you type /cc and want an interactive menu of cc-toolkit capabilities
- When unsure which specialized skill to use for a Claude Code workflow
