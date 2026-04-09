---
aliases: [cc-hooks, hooks-claude-code, claude-code-hooks, criar-hook, configurar-hooks, hook-debug]
type: skill
source: plugin:cc-toolkit:cc-hooks
invocation: /cc-hooks
category: implementation
inputs: [hook type (PreToolUse/PostToolUse/SessionStart/Stop/Notification), trigger conditions, hook logic requirements]
outputs: [hook configuration files, hook scripts (JS/shell), debugging output, optimized hook chains]
estimated_tokens: 5000
---

# CC Hooks

## Conceitos
- [[automation]] — creates event-driven hooks that trigger on tool usage and session events
- [[observability]] — enables monitoring and logging through PostToolUse and Notification hooks
- [[security]] — enforces constraints via PreToolUse hooks that gate tool execution

## Workflow
1. Identify the hook type and trigger event (PreToolUse, PostToolUse, SessionStart, Stop, Notification)
2. Create, configure, and wire up the hook logic with proper event matching
3. Debug and optimize hook execution to minimize latency and false triggers

## Conecta com
- [[cc-agent]] recebe: agent configurations that hooks enhance with event-driven behavior
- [[cc-setup]] recebe: CLI environment where hooks are registered and executed
- [[customaize-agent-create-hook]] recebe: hook creation patterns and templates

## Quando usar
- When you need to inject context or validation before a tool runs (PreToolUse)
- When you want to capture outputs or trigger side effects after tool execution (PostToolUse)
- When configuring session lifecycle events (SessionStart, Stop, Notification)
