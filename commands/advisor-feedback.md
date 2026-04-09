---
name: advisor-feedback
description: Record feedback about the last advisor pipeline execution. Helps the advisor learn which skills and combinations work best. Use after completing an /advisor pipeline.
---

# /advisor-feedback — Record Pipeline Feedback

## Steps

### 1. Ask feedback questions

Present to the user directly in your response:

"Como foi o ultimo pipeline do advisor?"

1. Qual skill mais ajudou? (nome ou numero do step)
2. Alguma skill nao serviu ou atrapalhou? (nome ou "nenhuma")
3. O pipeline como um todo resolveu o problema? (sim / parcialmente / nao)
4. Nota geral de 1-5 para a recomendacao

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
