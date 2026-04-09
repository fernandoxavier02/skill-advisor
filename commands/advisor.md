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

### 3b. Validate loadout phases

After receiving the router's recommendation, verify the loadout includes mandatory phases:

1. **Position 1 MUST be a clarification skill** (brainstorming, sdd:brainstorm, grill-me, or reflect). If missing, prepend brainstorming as position 1 and shift all other positions +1.
2. **Position 2 MUST be a planning skill** (writing-plans or sdd:plan). If missing, insert writing-plans as position 2 and shift implementation positions +1.

If you had to add missing phases, inform the user: "Adicionei etapas de clarificacao e planejamento que o router omitiu. O loadout agora segue a sequencia: clarificacao → planejamento → implementacao."

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

### 6. User Approval Gate (MANDATORY — inline execution)

**ENFORCEMENT:** Do NOT proceed to Step 7 without completing BOTH moments below. This gate runs inline (not as a sub-agent) because it requires direct user interaction.

Initialize iteration counters: `moment1_alterar=0, moment1_sugerir=0, moment2_alterar=0, moment2_sugerir=0`

#### Moment 1: Loadout Approval

Present the loadout from Step 5 with this EXACT menu:

```
┌─────────────────────────────────────────────┐
│  ADVISOR LOADOUT                             │
│                                              │
│  [repeat the dry-run from Step 5]            │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  1) Sim      — executar este pipeline        │
│  2) Nao      — cancelar                      │
│  3) Alterar  — ver 3 alternativas  [N/3]     │
│  4) Sugerir  — montar pipeline customizado   │
│                                              │
└─────────────────────────────────────────────┘
```

Wait for user response. Handle:

**1) Sim** — proceed to Moment 2. Set `decision: "approve"`.

**2) Nao** — tell user "Pipeline cancelado." Log telemetry with action "cancelled". STOP.

**3) Alterar** — increment `moment1_alterar`. If >= 3, say "Limite de alternativas atingido. Escolha Sim ou Nao." and re-show menu without option 3.
Otherwise, re-spawn `advisor-router` with prompt:
"Generate 3 ALTERNATIVE loadouts for this task: {task}. The original was: {loadout}. Each must use a different approach. For each: name, skills, pros/cons. Recommend the best. Return JSON array."
Present the 3 alternatives numbered [1] [2] [3] with the recommended one marked ★.
User picks 1/2/3 → use that loadout, proceed to Moment 2 with `decision: "alternative"`.
User picks 0 → discard alternatives, restore original, re-show Moment 1 menu.

**4) Sugerir** — increment `moment1_sugerir`. If >= 2, say limit reached and re-show menu without option 4.
Otherwise, invoke `Skill("sdd:brainstorm")` (or `Skill("superpowers:brainstorming")` if sdd unavailable) with:
"O usuario quer montar um pipeline customizado para: {task}. Skills disponiveis (top 20 do index): {list}. Ajude-o a montar o pipeline ideal."
After brainstorming, validate skill names against the index. Remove any not found (warn user).
Re-spawn `advisor-router` with: "Convert this brainstorming into structured loadout: {summary}. Only use indexed skills."
Use router's output as the loadout. Proceed to Moment 2 with `decision: "custom"`.

⛔ **STOP — Moment 2 is MANDATORY. Do NOT proceed to Step 7 without completing Moment 2 below.**
If you are about to skip Moment 2 and jump to execution, STOP. Go back and present the Moment 2 menu.

#### Moment 2: Spec Generation

Determine recommended planning skill based on loadout size:
- 1-2 skills → `/superpowers:writing-plans`
- 3-4 skills → `/sdd:plan` (if installed) or `/superpowers:writing-plans`
- 5+ skills → `/sdd:plan`

Check index for installed planning skills (names matching "plan", "writing-plans", "spec").

Present:

```
┌─────────────────────────────────────────────┐
│  PIPELINE APROVADO — GERACAO DA SPEC         │
│                                              │
│  Para documentar a execucao, recomendo:      │
│                                              │
│  {skill} ({plugin})                          │
│  Motivo: {reason}                            │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  1) Sim      — gerar spec com {skill}        │
│  2) Nao      — executar sem spec (legacy)    │
│  3) Alterar  — ver alternativas  [N/2]       │
│  4) Sugerir  — escolher outra skill          │
│                                              │
└─────────────────────────────────────────────┘
```

**1) Sim** — invoke the planning skill via Skill tool with:
"Generate pipeline execution spec for loadout: {json}. Task: {task}. Each phase MUST include: Skill, Plugin, Invocation (exact Skill() call), Moment, Prompt, Input, Output esperado, Gate de saida. Save to .specs/pipelines/{slug}-{date}.md"
Set `moment2_decision: "approve"`, save `spec_path`.

**2) Nao** — show warning:
"Sem spec, execucao sera no modo legacy (v1.0): sem documento de pipeline, sem invocacoes documentadas. Confirma? (sim/nao)"
If confirmed: `moment2_decision: "skip"`, `spec_path: null`.
If not: re-show Moment 2 menu.

**3) Alterar** — increment `moment2_alterar`. If >= 2, remove option.
Show installed planning skills (max 3). User picks one. Invoke it. Set `moment2_decision: "alternative"`.

**4) Sugerir** — increment `moment2_sugerir`. If >= 1, remove option.
Same brainstorming flow as Moment 1, focused on spec approach. Set `moment2_decision: "custom"`.

### 7. Execute pipeline

⛔ **PRE-CHECK: Before executing, verify BOTH conditions:**
1. Moment 1 was completed (decision is NOT "Nao")
2. Moment 2 was completed (moment2_decision has a value: "approve", "skip", "alternative", or "custom")
If Moment 2 was NOT completed, STOP and go back to present the Moment 2 menu.

This step only runs if the user approved in Step 6 (Moment 1 was not "Nao").

**If `spec_path` exists (from Moment 2):**
- Read the spec file at `spec_path`
- Execute skills in the order documented in the spec
- For each phase: invoke the skill using the exact `Invocation` field from the spec
- Inject context from previous phases using `{fase_N.campo}` references resolved from prior outputs
- After each skill completes, summarize output and ask: "Step N completo. Continuar? (sim/nao/ajustar)"

**If `spec_path` is null (legacy mode — user chose "Nao" in Moment 2):**
- Execute the loadout in order using semi-automatic flow
- For each skill: invoke via Skill tool with the original task + accumulated context
- After each skill: summarize, ask "Continuar? (sim/nao/ajustar)"

### 8. Feedback

After pipeline completes: "Pipeline finalizado. Rode /advisor-feedback para registrar o resultado."

### 9. Log telemetry

Generate a unique session_id at the START of /advisor execution (step 1), and track executed skills as they complete.

**Session ID generation (do this in step 1, before anything else):**
```bash
SESSION_ID="sess-$(date +%s)-$$"
echo "SESSION_ID: $SESSION_ID"
EXECUTED_ACTUAL="[]"
```

**After each skill completes (in step 7), append to EXECUTED_ACTUAL:**
Track the actual skills that ran (not the planned loadout). After each skill invocation completes successfully, add its name to the array. If a skill is skipped or fails, do not include it.

**At the end (step 9), write telemetry to ~/.claude/advisor/:**

```bash
ADVISOR_DATA="$HOME/.claude/advisor"
mkdir -p "$ADVISOR_DATA"
```

Replace placeholders with actual values from the gate output:
- `SESSION_ID` = the session_id generated in step 1
- `ACTION` = gate_output.decision (approve/cancel/alternative/custom)
- `MOMENT2` = gate_output.moment2_decision (approve/skip/alternative/custom)
- `SIZE` = gate_output.loadout length
- `TOP` = first skill invocation in loadout
- `EXECUTED_ACTUAL` = JSON array of skill names that actually completed (e.g., ["investigate","fix","review"])
- `SPEC` = true if spec_path exists, false otherwise
- `PLANNING` = gate_output.planning_skill_used or "none"
- `ITERS` = JSON string of gate_output.iterations

```bash
echo '{"ts":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","session_id":"SESSION_ID","action":"ACTION","moment2":"MOMENT2","loadout_size":SIZE,"top_skill":"TOP","executed_actual":EXECUTED_ACTUAL,"spec_generated":SPEC,"planning_skill":"PLANNING","iterations":ITERS,"mode":"gated"}' >> "$ADVISOR_DATA/telemetry.jsonl"
```

### 10. Update discovery nudge cooldown (D4 — hook read-only, command writes)

After logging telemetry, update the discovery nudge timestamp so the hook's 30-min cooldown works:

```bash
ADVISOR_CACHE="$ADVISOR_DATA/cache"
mkdir -p "$ADVISOR_CACHE"
SEEN_FILE="$ADVISOR_CACHE/advisor-discovery-seen.json"
if [ ! -f "$SEEN_FILE" ]; then
  echo '{"lastNudgeTs":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","seen":{}}' > "$SEEN_FILE"
else
  # Update lastNudgeTs in existing file (simple overwrite with preserved seen map)
  node -e "
    const fs = require('fs');
    let seen = {};
    try { seen = JSON.parse(fs.readFileSync('$SEEN_FILE', 'utf8')); } catch {}
    seen.lastNudgeTs = new Date().toISOString();
    fs.writeFileSync('$SEEN_FILE', JSON.stringify(seen, null, 2));
  " 2>/dev/null || true
fi
```
