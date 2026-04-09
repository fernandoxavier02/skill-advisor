---
aliases: [cc-context, claude-code-context, contexto-claude-code, context-diagnostics, compaction-fix, context-window, gerenciamento-contexto]
type: skill
source: "plugin:cc-toolkit:cc-context"
invocation: /cc-context
category: utility
inputs: ["Claude Code project path", "symptoms (compaction issues, missing rules, stale memory)"]
outputs: ["context diagnosis report", "fix recommendations", "updated context files", "compaction strategy"]
estimated_tokens: 5000
---

# CC Context

## Conceitos
- [[automation]] — automates diagnosis and repair of Claude Code context configuration
- [[quality]] — ensures context window is optimally used without waste or stale data
- [[architecture]] — understands CLAUDE.md hierarchy, rules, hooks, and memory system
- [[observability]] — detects compaction issues, missing rules, and context window overflow

## Workflow
1. Diagnose current context state — scan CLAUDE.md, rules, hooks, memory files for issues
2. Identify problems — compaction issues, missing rules, stale memory, context window waste
3. Recommend and apply fixes — update context files, optimize token usage, fix broken references

## Conecta com
- [[cc-prompt]] recebe: optimized context configuration for prompt tuning
- [[customaize-agent-create-rule]] recebe: identified rule gaps for new rule creation
- [[reflexion-reflect]] recebe: context diagnosis for self-improvement reflection

## Quando usar
- When Claude Code seems to forget rules or instructions mid-conversation
- When compaction is losing important context
- When rules or CLAUDE.md files are not being picked up
- When context window is filling up too fast with irrelevant content
- When memory files have stale or conflicting information
