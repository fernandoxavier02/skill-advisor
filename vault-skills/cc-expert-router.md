---
aliases: [cc-expert-router, roteador-especialista-cc, claude-code-expert, especialista-claude-code, cc-help, ajuda-claude-code]
type: skill
source: plugin:cc-toolkit:cc-expert-router
invocation: /cc-expert-router
category: utility
inputs: [question about Claude Code setup, hooks, MCP, permissions, agents, skills, prompts, or context]
outputs: [expert answer about Claude Code internals, configuration guidance, best practices]
estimated_tokens: 5000
---

# CC Expert Router

## Conceitos
- [[tooling]] — deep knowledge of Claude Code internals, hooks, MCP, and configuration
- [[architecture]] — understands Claude Code's agent, skill, and plugin architecture
- [[security]] — guides on permissions, sandbox mode, and access control

## Workflow
1. Receive a question about any Claude Code subsystem (hooks, MCP, permissions, agents, skills, prompts, context)
2. Route to the relevant expert knowledge domain
3. Provide detailed, accurate answer with configuration examples and best practices

## Conecta com
- [[cc]] recebe: routed queries from the main cc-toolkit triage
- [[cc-security]] recebe: security-specific questions for deeper analysis
- [[customaize-agent-create-skill]] recebe: skill creation guidance when user wants to build custom skills

## Quando usar
- When you have questions about Claude Code setup, hooks, or MCP configuration
- When you need to understand how Claude Code permissions, agents, or skills work
- When troubleshooting Claude Code prompt engineering or context management
