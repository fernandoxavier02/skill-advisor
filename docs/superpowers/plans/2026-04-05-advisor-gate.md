# Advisor Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `advisor-gate` enforcement agent and wire it into the `/advisor` command flow, replacing the current inline approval with a mandatory sub-agent that presents the 4-option pattern (Sim/Nao/Alterar/Sugerir) at two decision moments.

**Architecture:** The gate is a markdown agent (`agents/advisor-gate.md`) spawned by `commands/advisor.md` after the router returns a loadout. It presents options, handles iteration loops with limits, invokes brainstorming/planning skills when needed, and returns a structured JSON contract with a `gate_token` that the advisor.md verifies before execution.

**Tech Stack:** Claude Code plugin (markdown agents, Skill tool, Agent tool), Node.js >= 18 (CommonJS)

**Spec:** `docs/superpowers/specs/2026-04-05-advisor-gate-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `agents/advisor-gate.md` | CREATE | The enforcement agent — presents 4-option menus, manages iteration state, spawns router/brainstorming/planning skills |
| `commands/advisor.md` | MODIFY | Steps 6-8 replaced to spawn gate, check gate_token, handle decision |
| `tests/advisor-gate-contract.test.js` | CREATE | Tests for the gate output contract schema validation |
| `lib/schemas.js` | MODIFY | Add `validateGateOutput` function |

---

### Task 1: Add Gate Output Contract Validator

**Files:**
- Modify: `C:/Projetos/skill-advisor/lib/schemas.js` (append to end)
- Create: `C:/Projetos/skill-advisor/tests/advisor-gate-contract.test.js`

- [ ] **Step 1: Write failing tests for `validateGateOutput`**

```javascript
// tests/advisor-gate-contract.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateGateOutput } = require('../lib/schemas');

describe('validateGateOutput', () => {
  const validOutput = {
    gate_token: 'gate-abc123',
    decision: 'approve',
    moment2_decision: 'approve',
    loadout: [{ position: 1, invocation: '/investigate' }],
    original_loadout: [{ position: 1, invocation: '/investigate' }],
    spec_path: '.specs/pipelines/test-2026-04-05.md',
    planning_skill_used: '/sdd:plan',
    brainstorm_summary: null,
    iterations: { moment1_alterar: 0, moment1_sugerir: 0, moment2_alterar: 0, moment2_sugerir: 0 },
    error: null,
  };

  it('accepts valid gate output', () => {
    const result = validateGateOutput(validOutput);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('rejects missing gate_token', () => {
    const bad = { ...validOutput, gate_token: undefined };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('gate_token')));
  });

  it('rejects gate_token not starting with "gate-"', () => {
    const bad = { ...validOutput, gate_token: 'invalid-token' };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects invalid decision enum', () => {
    const bad = { ...validOutput, decision: 'maybe' };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects invalid moment2_decision enum', () => {
    const bad = { ...validOutput, moment2_decision: 'dunno' };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('accepts null optional fields', () => {
    const minimal = {
      ...validOutput,
      spec_path: null,
      planning_skill_used: null,
      brainstorm_summary: null,
      error: null,
    };
    const result = validateGateOutput(minimal);
    assert.equal(result.valid, true);
  });

  it('rejects missing loadout', () => {
    const bad = { ...validOutput, loadout: undefined };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects non-array loadout', () => {
    const bad = { ...validOutput, loadout: 'not-array' };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects missing iterations', () => {
    const bad = { ...validOutput, iterations: undefined };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects iterations with missing keys', () => {
    const bad = { ...validOutput, iterations: { moment1_alterar: 0 } };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects null input', () => {
    const result = validateGateOutput(null);
    assert.equal(result.valid, false);
  });

  it('accepts cancel decision with empty loadout', () => {
    const cancel = { ...validOutput, decision: 'cancel', loadout: [], moment2_decision: null };
    const result = validateGateOutput(cancel);
    assert.equal(result.valid, true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (RED)**

Run: `node --test tests/advisor-gate-contract.test.js`
Expected: FAIL — `validateGateOutput is not a function` (not exported yet)

- [ ] **Step 3: Implement `validateGateOutput` in schemas.js**

Append to `C:/Projetos/skill-advisor/lib/schemas.js`:

```javascript
const GATE_DECISIONS = ['approve', 'cancel', 'alternative', 'custom'];
const GATE_MOMENT2_DECISIONS = ['approve', 'skip', 'alternative', 'custom', null];
const GATE_ITERATION_KEYS = ['moment1_alterar', 'moment1_sugerir', 'moment2_alterar', 'moment2_sugerir'];

function validateGateOutput(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') return { valid: false, errors: ['not an object'] };

  // gate_token: required string starting with "gate-"
  if (typeof obj.gate_token !== 'string') errors.push('gate_token must be a string');
  else if (!obj.gate_token.startsWith('gate-')) errors.push('gate_token must start with "gate-"');

  // decision: required enum
  if (!GATE_DECISIONS.includes(obj.decision)) errors.push(`decision must be one of: ${GATE_DECISIONS.join(', ')}`);

  // moment2_decision: nullable enum
  if (obj.moment2_decision !== null && obj.moment2_decision !== undefined) {
    if (!GATE_DECISIONS.includes(obj.moment2_decision) && obj.moment2_decision !== 'skip') {
      errors.push(`moment2_decision must be one of: ${[...GATE_DECISIONS, 'skip'].join(', ')} or null`);
    }
  }

  // loadout: required array
  if (!Array.isArray(obj.loadout)) errors.push('loadout must be an array');

  // original_loadout: required array
  if (!Array.isArray(obj.original_loadout)) errors.push('original_loadout must be an array');

  // iterations: required object with 4 specific keys
  if (!obj.iterations || typeof obj.iterations !== 'object') {
    errors.push('iterations must be an object');
  } else {
    for (const key of GATE_ITERATION_KEYS) {
      if (typeof obj.iterations[key] !== 'number') errors.push(`iterations.${key} must be a number`);
    }
  }

  // nullable fields: spec_path, planning_skill_used, brainstorm_summary, error
  // (no validation needed — null or string both acceptable)

  return { valid: errors.length === 0, errors };
}
```

Add `validateGateOutput` to the `module.exports` of `schemas.js`.

- [ ] **Step 4: Run tests to verify they pass (GREEN)**

Run: `node --test tests/advisor-gate-contract.test.js`
Expected: 12 tests PASS

- [ ] **Step 5: Run full test suite for regressions**

Run: `npm test`
Expected: All existing tests + 12 new tests PASS

- [ ] **Step 6: Commit**

```bash
git add lib/schemas.js tests/advisor-gate-contract.test.js
git commit -m "feat: add validateGateOutput to schemas.js (TDD)"
```

---

### Task 2: Create the `advisor-gate.md` Agent

**Files:**
- Create: `C:/Projetos/skill-advisor/agents/advisor-gate.md`

- [ ] **Step 1: Create the agent file**

```markdown
---
name: advisor-gate
description: Enforcement gate that presents the advisor loadout for user approval with 4-option pattern (Sim/Nao/Alterar/Sugerir). Blocks execution until user explicitly chooses. Manages two decision moments (loadout approval + spec generation tool selection) with iteration limits.
model: sonnet
---

# Advisor Gate — Enforcement Agent

You are the mandatory approval gate for the Skill Advisor. No pipeline executes without your approval. You present a 4-option menu at two decision moments and return a structured contract.

## Input

You receive:
1. **Loadout JSON** — the advisor-router's recommended skill pipeline
2. **Task description** — the original user request
3. **Codebase context** — git branch, project type, status
4. **Top 20 skills** — available skills from graph search (for Sugerir option)
5. **Installed planning skills** — for Moment 2 recommendations

## Iteration Limits (ENFORCE STRICTLY)

| Interaction | Max | Track as |
|-------------|-----|----------|
| Alterar (Moment 1) | 3 | moment1_alterar |
| Sugerir (Moment 1) | 2 | moment1_sugerir |
| Alterar (Moment 2) | 2 | moment2_alterar |
| Sugerir (Moment 2) | 1 | moment2_sugerir |

When a limit is reached, REMOVE that option from the menu. Show only remaining options.

## Moment 1: Loadout Approval

Present the loadout using this EXACT format:

```
┌─────────────────────────────────────────────┐
│  ADVISOR LOADOUT                             │
│                                              │
│  [For each skill in loadout:]                │
│  N. /skill-name  [category]    ~Xmin         │
│     → role description                       │
│     depends on: #N (or none)                 │
│                                              │
│  Estimated: ~Xmin | ~Xk tokens               │
├─────────────────────────────────────────────┤
│                                              │
│  1) Sim      — executar este pipeline        │
│  2) Nao      — cancelar                      │
│  3) Alterar  — ver 3 alternativas  [N/3]     │
│  4) Sugerir  — montar pipeline customizado   │
│                                              │
└─────────────────────────────────────────────┘
```

Wait for user response. Handle each option:

### Option 1 (Sim)
Proceed to Moment 2.

### Option 2 (Nao)
Return immediately:
```json
{
  "gate_token": "gate-<generate-uuid>",
  "decision": "cancel",
  "moment2_decision": null,
  "loadout": [],
  "original_loadout": [original loadout],
  "spec_path": null,
  "planning_skill_used": null,
  "brainstorm_summary": null,
  "iterations": { counts },
  "error": null
}
```

### Option 3 (Alterar)
Increment `moment1_alterar`. If limit reached, tell user "Limite de alternativas atingido. Escolha Sim ou Nao." and re-show menu without option 3.

Otherwise, use the Agent tool to re-spawn `advisor-router` with this prompt:

"Generate 3 ALTERNATIVE loadouts for this task: {task_description}.
Context: {codebase_context}.
The original loadout was: {original_loadout}.
Each alternative MUST use a different approach.
For each: name the approach, list the loadout, explain pros/cons.
Recommend which of the 3 is best and why.
Return as JSON array of 3 loadout objects."

Present the 3 alternatives:

```
┌─────────────────────────────────────────────┐
│  3 ALTERNATIVAS                              │
│                                              │
│  [1] Abordagem: {name}    ★ RECOMENDADA      │
│      Skills: /a → /b → /c                   │
│      Pro: {pro}  Con: {con}                  │
│                                              │
│  [2] Abordagem: {name}                       │
│      Skills: /d → /e                         │
│      Pro: {pro}  Con: {con}                  │
│                                              │
│  [3] Abordagem: {name}                       │
│      Skills: /f → /g → /h                   │
│      Pro: {pro}  Con: {con}                  │
│                                              │
│  Escolha: 1, 2, 3, ou 0 para voltar          │
└─────────────────────────────────────────────┘
```

If user picks 1/2/3 → use that loadout, proceed to Moment 2 with `decision: "alternative"`.
If user picks 0 → discard alternatives, restore original loadout, re-show Moment 1 menu.

### Option 4 (Sugerir)
Increment `moment1_sugerir`. If limit reached, tell user and re-show menu without option 4.

Otherwise, check for brainstorming skills in order:
1. Try `Skill("sdd:brainstorm")` 
2. If unavailable, try `Skill("superpowers:brainstorming")`
3. If none available, conduct inline brainstorming (ask one question at a time)

Pass to brainstorming:
"O usuario quer montar um pipeline customizado para: {task_description}.
Skills disponiveis (top 20): {skills_list with name, plugin, category, description}.
Ajude-o a montar o pipeline ideal."

After brainstorming concludes, extract the skill names from the discussion. Validate each against the provided skills list — warn and remove any not found. Then re-spawn `advisor-router` with:
"Convert this brainstorming result into a structured loadout JSON: {brainstorm_summary}. Only use skills from this list: {available_skills}."

Use the router's structured output as the new loadout. Proceed to Moment 2 with `decision: "custom"`.

---

## Moment 2: Spec Generation Tool Selection

Determine recommendation based on loadout complexity:
- 1-2 skills → recommend `/superpowers:writing-plans`
- 3-4 skills → recommend `/sdd:plan` (if installed) or `/superpowers:writing-plans`
- 5+ skills → recommend `/sdd:plan`

Check installed planning skills by scanning the provided skills list for entries matching: category "planning" OR name containing "plan", "writing-plans", "spec".

Present:

```
┌─────────────────────────────────────────────┐
│  PIPELINE APROVADO — GERACAO DA SPEC         │
│                                              │
│  Para documentar a execucao, recomendo:      │
│                                              │
│  {recommended skill} ({plugin})              │
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

Handle options using the same pattern as Moment 1, with these differences:

### Moment 2 Option 1 (Sim)
Invoke the recommended planning skill via `Skill("{skill_name}")` with this context:
"Generate a pipeline execution spec for this loadout: {loadout_json}.
Task: {task_description}.
The spec MUST follow the format in .specs/plans/skill-advisor-v2-orchestration-platform.design.md Section 7.
Each phase MUST include: Skill, Plugin, Invocation (exact Skill() call), Moment, Prompt, Input, Output esperado, Gate de saida.
Save to: .specs/pipelines/{task_slug}-{date}.md"

Set `moment2_decision: "approve"` and `spec_path` to the generated file path.

### Moment 2 Option 2 (Nao)
Display warning:
```
⚠️  Sem spec, a execucao sera no modo legacy (v1.0):
    - Sem documento de pipeline
    - Sem invocacoes exatas documentadas
    - Sem monitoramento por agentes futuros (v2.0)
    Confirma? (sim/nao)
```
If confirmed: set `moment2_decision: "skip"`, `spec_path: null`.
If not confirmed: re-show Moment 2 menu.

### Moment 2 Option 3 (Alterar)
Show `min(installed_planning_count, 3)` planning skills with descriptions.
If 0 installed: "Nenhuma skill de planning encontrada. Gerando spec inline." → generate spec inline.
User picks one → invoke it → set `moment2_decision: "alternative"`.

### Moment 2 Option 4 (Sugerir)
Same brainstorming flow as Moment 1 Option 4, but focused on spec generation approach.

---

## Final Output

After both moments are resolved, return this JSON in a code block:

```json
{
  "gate_token": "gate-<uuid>",
  "decision": "<moment1 decision>",
  "moment2_decision": "<moment2 decision>",
  "loadout": [<final approved loadout>],
  "original_loadout": [<router's original loadout>],
  "spec_path": "<path or null>",
  "planning_skill_used": "<skill name or null>",
  "brainstorm_summary": "<summary or null>",
  "iterations": {
    "moment1_alterar": <count>,
    "moment1_sugerir": <count>,
    "moment2_alterar": <count>,
    "moment2_sugerir": <count>
  },
  "error": <error message or null>
}
```

## Rules

1. ALWAYS present the box-drawing visual format — never plain text options
2. ALWAYS wait for user response before proceeding
3. NEVER skip Moment 2 — every approval goes through both moments
4. NEVER exceed iteration limits — remove exhausted options from menu
5. ALWAYS validate brainstorming output against the skills list before using
6. The gate_token MUST be unique per invocation (use timestamp + random suffix)
7. If any spawned agent (router, brainstorming, planning) fails, set the error field and fall back gracefully
8. Present in PT-BR for user-facing text, EN for JSON keys
```

- [ ] **Step 2: Verify agent file is well-formed**

Run: `node -e "const fs=require('fs'); const c=fs.readFileSync('agents/advisor-gate.md','utf8'); const m=c.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---/); console.log(m ? 'FRONTMATTER OK' : 'FRONTMATTER MISSING'); console.log('Lines:', c.split('\\n').length)"`
Expected: `FRONTMATTER OK` and line count > 100

- [ ] **Step 3: Commit**

```bash
git add agents/advisor-gate.md
git commit -m "feat: create advisor-gate enforcement agent"
```

---

### Task 3: Modify `commands/advisor.md` to Use the Gate

**Files:**
- Modify: `C:/Projetos/skill-advisor/commands/advisor.md` (Steps 6, 7, 8)

- [ ] **Step 1: Replace Step 6 in advisor.md**

Find the current Step 6 ("User approval") and replace it with:

```markdown
### Step 6: Spawn advisor-gate (MANDATORY)

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
```

- [ ] **Step 2: Replace Step 7 in advisor.md**

Replace the current Step 7 ("Semi-automatic execution") with:

```markdown
### Step 7: Handle gate decision

PREREQUISITE: gate_output must exist and contain gate_token starting with "gate-".
If gate_output is missing or gate_token is absent → STOP with error: "Gate not invoked. Cannot execute pipeline."

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
  - Execute the loadout in order using the current semi-automatic flow
  - For each skill: invoke via Skill tool, summarize, ask to continue
```

- [ ] **Step 3: Update Step 8 (Feedback)**

No changes needed — the current Step 8 ("Pipeline finalizado. Rode /advisor-feedback") works for both spec and legacy modes.

- [ ] **Step 4: Update Step 9 (Telemetry)**

Replace the telemetry template to include gate metrics:

```markdown
### Step 9: Log telemetry

```bash
ADVISOR_LIB=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib" -type d 2>/dev/null | head -1)
```

Replace placeholders with actual values from the gate output:
- `ACTION` = gate_output.decision
- `MOMENT2` = gate_output.moment2_decision
- `SIZE` = gate_output.loadout length
- `TOP` = first skill invocation in loadout
- `SPEC` = true if spec_path exists, false otherwise
- `PLANNING` = gate_output.planning_skill_used or "none"
- `ITERS` = JSON string of gate_output.iterations

```bash
echo '{"ts":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","action":"ACTION","moment2":"MOMENT2","loadout_size":SIZE,"top_skill":"TOP","spec_generated":SPEC,"planning_skill":"PLANNING","iterations":ITERS,"mode":"gated"}' >> "$ADVISOR_LIB/advisor-telemetry.jsonl"
```
```

- [ ] **Step 5: Verify advisor.md is valid markdown**

Read the modified file and check: Step 6 mentions "advisor-gate", Step 7 checks "gate_token", Step 9 logs gate metrics.

- [ ] **Step 6: Commit**

```bash
git add commands/advisor.md
git commit -m "feat: wire advisor-gate into /advisor command flow"
```

---

### Task 4: Integration Test — Full Flow

**Files:**
- No new files — manual verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (existing + new gate contract tests)

- [ ] **Step 2: Verify plugin structure**

Run: `node -e "const p=require('./plugin.json'); console.log('autoDiscover:', p.autoDiscover); const fs=require('fs'); console.log('agents:', fs.readdirSync('agents')); console.log('commands:', fs.readdirSync('commands'))"`
Expected:
```
autoDiscover: false
agents: [ 'advisor-gate.md', 'advisor-router.md' ]
commands: [ 'advisor.md', 'advisor-catalog.md', 'advisor-config.md', 'advisor-feedback.md', 'advisor-index.md' ]
```

- [ ] **Step 3: Verify gate agent frontmatter**

Run: `node -e "const {parseFrontmatter}=require('./lib/frontmatter'); const fs=require('fs'); const fm=parseFrontmatter(fs.readFileSync('agents/advisor-gate.md','utf8')); console.log(fm)"`
Expected: `{ name: 'advisor-gate', description: '...', model: 'sonnet' }`

- [ ] **Step 4: Sync to marketplace cache**

```bash
CACHE="$HOME/.claude/plugins/cache/FX-studio-AI/skill-advisor/0.1.0"
cp agents/advisor-gate.md "$CACHE/agents/"
cp commands/advisor.md "$CACHE/commands/"
cp lib/schemas.js "$CACHE/lib/"
cp tests/advisor-gate-contract.test.js "$CACHE/tests/"
echo "Cache synced"
```

- [ ] **Step 5: Verify cache tests pass**

Run: `cd "$CACHE" && node --test tests/advisor-gate-contract.test.js`
Expected: 12 tests PASS

- [ ] **Step 6: Final commit and push**

```bash
git add -A
git commit -m "feat: advisor-gate enforcement agent with 4-option pattern

- New agent: agents/advisor-gate.md (Sonnet, mandatory enforcement)
- Gate output contract validator in lib/schemas.js
- advisor.md wired to spawn gate, check gate_token
- Telemetry updated with gate metrics
- 12 new tests for gate contract validation
- Synced to marketplace cache"
git push origin main
```

---

## Spec Coverage Check

| Spec Requirement | Covered in Task |
|-----------------|----------------|
| Create advisor-gate.md agent | Task 2 |
| Modify advisor.md Steps 6-7 | Task 3 |
| 4-option pattern (Sim/Nao/Alterar/Sugerir) | Task 2 (agent prompt) |
| Moment 1: Loadout approval | Task 2 |
| Moment 2: Spec generation tool selection | Task 2 |
| Iteration limits (3/2/2/1) | Task 2 (agent rules) |
| "nenhuma" returns to original | Task 2 (Option 3 behavior) |
| gate_token enforcement | Task 1 (validator) + Task 3 (advisor.md check) |
| Output contract with all fields | Task 1 (validator) + Task 2 (output section) |
| Error handling for failed agents | Task 2 (Rule 7) |
| Brainstorming skill selection order | Task 2 (Option 4) |
| Brainstorming output → structured loadout | Task 2 (re-invoke router) |
| Planning skill recommendation logic | Task 2 (Moment 2 intro) |
| Variable planning skill count (0-3+) | Task 2 (Moment 2 Option 3) |
| Legacy mode warning for skip spec | Task 2 (Moment 2 Option 2) |
| Telemetry with gate metrics | Task 3 (Step 4) |
| v2.0 positioning documented | In spec (not code — no action needed) |
| PT-BR display / EN JSON mapping | Task 2 (Rule 8) |
| Sync to marketplace cache | Task 4 (Step 4) |
