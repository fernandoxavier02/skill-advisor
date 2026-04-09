---
aliases: [complexidade-kiro, kiro-complexity, simples-media-complexa, pipeline-complexity, classificacao-complexidade]
type: concept
---

# Kiro Complexity Classification

Classificação de complexidade usada pelo sistema Kiro para rotear skills e pipelines.

## Níveis

| Nível | Pasta Pipeline | Critérios |
|---|---|---|
| **SIMPLES** | `Pre-Simples-action/` | 1-2 arquivos, operação direta, sem pipeline pesado |
| **MEDIA** | `Pre-Medium-action/` | Múltiplos arquivos, agentes especializados, revisão estruturada |
| **COMPLEXA** | `Pre-Complexa-action/` | Pipeline completo, múltiplos agentes sequenciais, alta dependência |

## Mapeamento Skills → Complexidade

### SIMPLES
- [[document-release]] — doc pós-ship, aditiva e focada
- [[steering-custom]] — cria UM steering doc dedicado (ideal para SSOT)
- [[steering]] — CRUD de steering docs
- [[write-concisely]] — polimento de escrita, pós-processamento
- [[grill-me]] — interativo sem artefato permanente (pode escalar para MEDIA)

### MEDIA
- [[plan-eng-review]] — revisão focada: arquitetura, data flow, edge cases
- [[plan-ceo-review]] — revisão alto nível, desafia premissas
- [[update-docs]] — multi-agent para atualizar docs
- [[executing-plans]] — depende do plano (pode escalar para COMPLEXA)

### COMPLEXA
- [[writing-plans]] — plano multi-step com dependências e arquitetura
- [[autoplan]] — 4 reviews sequenciais (CEO+design+eng+DX)
- [[sdd-plan]] — spec draft → plano parallelizado com verificação

## Conecta com
- [[analysis-context-pipeline]] usa esta classificação para selecionar skills
- [[debugging]] — bugs simples = SIMPLES, multi-arquivo = MEDIA/COMPLEXA

## Regra de Escalonamento
Uma skill SIMPLES pode escalar para MEDIA se o contexto exigir (ex: grill-me em design complexo).
Uma skill MEDIA pode escalar para COMPLEXA se o plano tiver muitas dependências.
