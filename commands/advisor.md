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

### 6. Spawn advisor-gate (MANDATORY)

Use the Agent tool to spawn the `advisor-gate` subagent with:

- **Loadout JSON:** The complete loadout from Step 3 (router output)
- **Task description:** The original user prompt or /advisor arguments
- **Codebase context:** Output from Step 2
- **Top 20 skills:** Read the full index and pass the top 20 entries matching the task (for Sugerir brainstorming option)
- **Installed planning skills:** Filter the index for entries with category "planning" or names matching "plan", "writing-plans", "spec"

ENFORCEMENT: Do NOT proceed to Step 7 without spawning advisor-gate.
The gate's decision is FINAL. Step 7 requires gate_token from gate output.

The gate will:
1. Present the loadout with 4 options (Sim/Nao/Alterar/Sugerir)
2. Handle alternatives, brainstorming, and iteration limits
3. If approved, present spec generation options (Moment 2)
4. Return a JSON contract with gate_token

### 7. Handle gate decision

PREREQUISITE: gate_output must exist and contain gate_token starting with "gate-".
If gate_output is missing or gate_token is absent: STOP with error "Gate not invoked. Cannot execute pipeline."

Parse the gate output JSON. Based on the decision:

**If decision is "cancel":**
- Tell user: "Pipeline cancelado."
- Log telemetry (Step 9) with action "cancelled"
- STOP

**If decision is "approve", "alternative", or "custom":**
- If `spec_path` exists (not null):
  - Read the spec file at `spec_path`
  - Execute skills in the order documented in the spec
  - For each phase: invoke the skill using the exact `Invocation` field from the spec
  - Inject context from previous phases using `{fase_N.campo}` references
  - After each skill completes, summarize output and ask: "Step N completo. Continuar? (sim/nao/ajustar)"

- If `spec_path` is null (legacy mode):
  - Execute the loadout in order using semi-automatic flow
  - For each skill: invoke via Skill tool, summarize, ask to continue

### 8. Feedback

After pipeline completes: "Pipeline finalizado. Rode /advisor-feedback para registrar o resultado."

### 9. Log telemetry

```bash
ADVISOR_LIB=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib" -type d 2>/dev/null | head -1)
```

Replace placeholders with actual values from the gate output:
- `ACTION` = gate_output.decision (approve/cancel/alternative/custom)
- `MOMENT2` = gate_output.moment2_decision (approve/skip/alternative/custom)
- `SIZE` = gate_output.loadout length
- `TOP` = first skill invocation in loadout
- `SPEC` = true if spec_path exists, false otherwise
- `PLANNING` = gate_output.planning_skill_used or "none"
- `ITERS` = JSON string of gate_output.iterations

```bash
echo '{"ts":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","action":"ACTION","moment2":"MOMENT2","loadout_size":SIZE,"top_skill":"TOP","spec_generated":SPEC,"planning_skill":"PLANNING","iterations":ITERS,"mode":"gated"}' >> "$ADVISOR_LIB/advisor-telemetry.jsonl"
```
