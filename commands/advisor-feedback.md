---
name: advisor-feedback
description: Record feedback about the last advisor pipeline execution. Helps the advisor learn which skills and combinations work best. Use after completing an /advisor pipeline.
---

# /advisor-feedback — Record Pipeline Feedback

## Interaction Policy

Collect feedback via the **AskUserQuestion** tool — never via prose prompts asking the user to type answers. The tool renders a selectable list (arrow-key navigation) and automatically appends an "Other" option so the user can still enter free text when none of the presented choices fit. Do NOT add "Outra" / "Texto livre" manually to the `options` array.

## Steps

### 1. Load loadout context (for option building)

Read the last `/advisor` loadout so the skill-selection questions can offer the actual skills the user ran:

```bash
ADVISOR_DATA="$HOME/.claude/advisor"
LAST_LOADOUT_SKILLS=$(tail -1 "$ADVISOR_DATA/telemetry.jsonl" 2>/dev/null | grep -oE '"invocation":"[^"]+"' | cut -d'"' -f4)
```

If no loadout is found, the "Qual skill ajudou" question should fall back to a generic placeholder — the user can still type an answer via the automatic "Other" option.

### 2. Ask feedback questions (batched)

Invoke **AskUserQuestion** ONCE with all four questions batched (tool supports up to 4). Build the options dynamically — for the skill questions, use the skills from the last loadout (max 4 options per question, so if the loadout is longer, show the top 3 by position and let "Other" cover the rest).

```json
{
  "questions": [
    {
      "question": "Qual skill mais ajudou no ultimo pipeline?",
      "header": "Melhor skill",
      "multiSelect": false,
      "options": [
        { "label": "{skill 1 do loadout}", "description": "Step 1 — {role}" },
        { "label": "{skill 2 do loadout}", "description": "Step 2 — {role}" },
        { "label": "{skill 3 do loadout}", "description": "Step 3 — {role}" },
        { "label": "Nenhuma em especifico", "description": "Todas contribuiram por igual" }
      ]
    },
    {
      "question": "Alguma skill nao serviu ou atrapalhou?",
      "header": "Pior skill",
      "multiSelect": false,
      "options": [
        { "label": "Nenhuma (Recomendado)", "description": "Todas foram uteis" },
        { "label": "{skill 1 do loadout}", "description": "Step 1 — {role}" },
        { "label": "{skill 2 do loadout}", "description": "Step 2 — {role}" },
        { "label": "{skill 3 do loadout}", "description": "Step 3 — {role}" }
      ]
    },
    {
      "question": "O pipeline resolveu o problema?",
      "header": "Resolveu?",
      "multiSelect": false,
      "options": [
        { "label": "Sim", "description": "Problema totalmente resolvido" },
        { "label": "Parcialmente", "description": "Resolveu parte do problema" },
        { "label": "Nao", "description": "Nao resolveu / resolveu errado" }
      ]
    },
    {
      "question": "Nota geral para a recomendacao?",
      "header": "Nota",
      "multiSelect": false,
      "options": [
        { "label": "Excelente (5)", "description": "Acima das expectativas" },
        { "label": "Bom (4)", "description": "Atingiu expectativas" },
        { "label": "OK (3)", "description": "Mediano, deu para usar" },
        { "label": "Ruim (1-2)", "description": "Abaixo das expectativas" }
      ]
    }
  ]
}
```

Map answers back to values when recording:
- Resolveu: `Sim` → `YES`, `Parcialmente` → `PARTIAL`, `Nao` → `NO`
- Nota: `Excelente (5)` → `5`, `Bom (4)` → `4`, `OK (3)` → `3`, `Ruim (1-2)` → `2` (midpoint of 1-2 band; if the user picked "Other" and typed a specific number, use that)
- Melhor/Pior skill: use the label verbatim; if `Nenhuma` was picked, record the literal string `nenhuma`

### 2. Find latest session_id

Check the last telemetry entry to find the session_id of the most recent /advisor run:

```bash
ADVISOR_DATA="$HOME/.claude/advisor"
mkdir -p "$ADVISOR_DATA"
LAST_SESSION=$(tail -1 "$ADVISOR_DATA/telemetry.jsonl" 2>/dev/null | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "LAST_SESSION: ${LAST_SESSION:-none}"
```

If no session found, tell user: "Nenhuma sessao anterior encontrada. O feedback sera registrado sem vinculo a uma sessao especifica."

### 3. Record feedback

```bash
ADVISOR_DATA="$HOME/.claude/advisor"
mkdir -p "$ADVISOR_DATA"
```

Append to feedback.jsonl:
```bash
echo '{"ts":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","session_id":"SESSION_ID","helpful_skill":"SKILL","unhelpful_skill":"SKILL_OR_NONE","resolved":"YES_PARTIAL_NO","rating":N,"pipeline_size":SIZE}' >> "$ADVISOR_DATA/feedback.jsonl"
```

Replace placeholders with actual values from user responses.

### 4. Confirm

Tell the user: "Feedback registrado. Obrigado! Isso ajuda o advisor a melhorar as recomendacoes futuras."
