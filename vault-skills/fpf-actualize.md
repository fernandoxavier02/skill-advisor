---
aliases: [fpf:actualize, atualizar-base-conhecimento, knowledge sync]
type: skill
source: context-engineering-kit
invocation: /fpf:actualize
category: planning
inputs: [repository state, recent changes, decision history]
outputs: [updated knowledge base, refreshed assumptions, state reconciliation]
estimated_tokens: medium
---

# Actualize Knowledge Base

## Conceitos
- [[knowledge-base-maintenance]] — keeping assumptions current
- [[repository-alignment]] — syncing decisions with code
- [[evidence-freshness]] — tracking decision currency
- [[assumption-tracking]] — monitoring decision validity

## Workflow
1. Scan repository for recent changes
2. Identify affected previous decisions
3. Verify assumptions against current state
4. Update knowledge base with fresh evidence
5. Mark stale decisions for review
6. Reconcile FPF state with reality

## Conecta com
- [[fpf-decay]] produces: evidence freshness data
- [[fpf-status]] can use: updated knowledge state
- [[fpf-query]] reads: refreshed hypotheses

## Quando usar
- After major code changes or refactoring
- Syncing team decisions with implementation
- Updating architectural decisions
- Refreshing assumption tracking before new features
