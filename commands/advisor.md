---
name: advisor
description: Analyze the current task and recommend the optimal combination of skills, plugins, and MCPs to use — with execution order, dependencies, and a dry-run preview. Use when you don't know which tools to use or want to compose multiple tools for a complex task.
---

# /advisor — Intelligent Skill Recommendation

Analyze the user's task and recommend the best combination of tools.

## Steps

### 1. Load the full index

```bash
ADVISOR_INDEX=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/advisor-index-full.json" 2>/dev/null | head -1)
[ -z "$ADVISOR_INDEX" ] && echo "INDEX_NOT_FOUND" || echo "INDEX_FOUND: $ADVISOR_INDEX"
```

If `INDEX_NOT_FOUND`: tell the user "Index nao encontrado. Rode /advisor-index primeiro para criar o catalogo." and stop.

### 2. Assemble context

Gather lightweight context about the current environment:

```bash
echo "=== BRANCH ==="
git branch --show-current 2>/dev/null || echo "not a git repo"
echo "=== STATUS ==="
git status --short 2>/dev/null | head -10
echo "=== PROJECT TYPE ==="
ls package.json requirements.txt Cargo.toml go.mod pyproject.toml Gemfile 2>/dev/null
echo "=== PROJECT CONTEXT ==="
ls CLAUDE.md .kiro/ .claude/ 2>/dev/null
```

### 3. Spawn the advisor-router subagent

Use the Agent tool to spawn the `advisor-router` subagent with:

- **Task description:** The user's prompt or /advisor arguments
- **Codebase context:** Output from step 2
- **Lite index:** Contents of the LITE index JSON file (read it with Read tool — NOT the full index, to save context budget)
- **Conversation context:** Summarize the last 3 user messages if available

The subagent will return a structured recommendation.

### 4. Handle clarification

If the router returns `clarification_needed: true`, present the clarification questions directly in your response text as a numbered list and wait for the user's reply. Then re-invoke the router with the refined context. Maximum 2 clarification rounds.

### 5. Present the dry-run

Format the router's recommendation as a visual dry-run:

```
┌─────────────────────────────────────────┐
│  ADVISOR LOADOUT (dry-run)              │
│                                         │
│  1. /skill-name  [category]  ~Xmin      │
│     → what it does                      │
│     depends on: (none or #N)            │
│                                         │
│  2. /next-skill  [category]  ~Xmin      │
│     → what it does                      │
│     depends on: #1                      │
│                                         │
│  Excluded: /skill (reason)              │
│                                         │
│  Estimated context: ~Nk tokens          │
│  Risk: low/medium/high                  │
└─────────────────────────────────────────┘
```

### 6. User approval

Ask the user directly in your response text. Present options as a numbered list and wait for their reply:
- A) Aprovar loadout — executar manualmente na ordem sugerida
- B) Modificar — remover/trocar/reordenar itens
- C) Cancelar — descartar recomendacao

If B: ask user for modifications, re-render dry-run, confirm again.

### 7. Log telemetry (minimal)

After the user approves/rejects, append a line to the telemetry file:

```bash
ADVISOR_LIB=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib" -type d 2>/dev/null | head -1)
```

Replace the placeholders below with actual values from the session:
- `ACTION` = `approved` or `rejected` or `modified`
- `SIZE` = number of tools in the loadout
- `TOP` = invocation name of the top-ranked tool

```bash
echo '{"ts":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","action":"ACTION","loadout_size":SIZE,"top_skill":"TOP"}' >> "$ADVISOR_LIB/advisor-telemetry.jsonl"
```

### 8. Output

If approved, tell the user the execution order:
"Loadout aprovado. Execute na ordem:"
1. /first-skill
2. /second-skill (apos #1)
3. /third-skill (apos #2)
