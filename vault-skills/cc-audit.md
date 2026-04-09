---
aliases: [cc-audit, auditoria-cc, claude-code-audit, audit-context, auditoria-contexto, cc-toolkit-audit]
type: skill
source: plugin:cc-toolkit:cc-audit
invocation: /cc-audit
category: quality
inputs: ["project root directory", "CLAUDE.md and context files", ".claude/ directory structure"]
outputs: ["consistency report across context files", "completeness assessment", "quality score with actionable recommendations", "list of conflicts and gaps"]
estimated_tokens: 10000
---

# CC Audit

## Conceitos
- [[quality]] — ensures Claude Code project context is consistent and complete
- [[documentation]] — validates that documentation files are aligned and non-contradictory
- [[observability]] — surfaces hidden inconsistencies in AI agent configuration

## Workflow
1. Scan all Claude Code context files (CLAUDE.md, rules, agents, hooks, settings)
2. Cross-reference for consistency, duplicates, and contradictions
3. Assess completeness against best practices for Claude Code projects
4. Generate audit report with findings, severity, and fix recommendations

## Conecta com
- [[revise-claude-md]] recebe: specific CLAUDE.md issues to fix
- [[cc-skill]] recebe: skill configuration problems found during audit
- [[cc-mcp]] recebe: MCP configuration issues discovered

## Quando usar
- After major changes to project context files
- When Claude Code behaves inconsistently and you suspect context issues
- Periodically as part of project hygiene to catch drift between context files
