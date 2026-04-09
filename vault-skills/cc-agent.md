---
aliases: [cc-agent, agente-claude-code, claude-code-agent, configurar-agente, agent-design, agent-configuration]
type: skill
source: plugin:cc-toolkit:cc-agent
invocation: /cc-agent
category: implementation
inputs: [agent requirements description, target use case, worktree configuration needs, headless mode preferences]
outputs: [agent configuration files, subagent definitions, team orchestration setup, worktree configurations]
estimated_tokens: 10000
---

# CC Agent

## Conceitos
- [[architecture]] — designs agent hierarchies and communication patterns
- [[automation]] — configures autonomous and headless agent workflows
- [[planning]] — structures multi-agent teams for complex task decomposition

## Workflow
1. Analyze user requirements for agent design (single agent, subagent, team, or worktree)
2. Design and configure the agent structure with proper roles, tools, and constraints
3. Generate configuration files and validate the agent setup works correctly

## Conecta com
- [[cc-hooks]] recebe: hook configurations that agents trigger during execution
- [[cc-setup]] recebe: CLI and environment setup needed for agent runtime
- [[customaize-agent-create-agent]] recebe: agent definition patterns and best practices

## Quando usar
- When designing new Claude Code agents or subagents for specific tasks
- When configuring agent teams for parallel or hierarchical work
- When setting up worktrees or headless mode patterns for CI/CD integration
