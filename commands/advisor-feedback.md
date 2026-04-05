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

### 2. Record feedback

```bash
VAULT_PATH="$HOME/.claude/.claude/obsisian/Skill Advisor Claude code"
META_DIR="$VAULT_PATH/_meta"
mkdir -p "$META_DIR"
```

Append to _meta/feedback.jsonl:
```bash
echo '{"ts":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","helpful_skill":"SKILL","unhelpful_skill":"SKILL_OR_NONE","resolved":"YES_PARTIAL_NO","rating":N,"pipeline_size":SIZE}' >> "$META_DIR/feedback.jsonl"
```

Replace placeholders with actual values from user responses.

### 3. Confirm

Tell the user: "Feedback registrado. Obrigado! Isso ajuda o advisor a melhorar as recomendacoes futuras."
