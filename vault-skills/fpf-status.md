---
aliases: [fpf:status, status-fpf, knowledge state]
type: skill
source: context-engineering-kit
invocation: /fpf:status
category: planning
inputs: [none required]
outputs: [knowledge base state, hypothesis count, freshness metrics]
estimated_tokens: small
---

# Status Check

## Conceitos
- [[knowledge-state]] — current FPF state
- [[hypothesis-inventory]] — what hypotheses exist
- [[freshness-metrics]] — how current is evidence
- [[state-summary]] — high-level overview

## Workflow
1. Query FPF knowledge base state
2. Count stored hypotheses and decisions
3. Analyze evidence freshness
4. Calculate staleness percentages
5. Identify refresh priorities
6. Display status dashboard

## Conecta com
- [[fpf-decay]] provides: staleness data
- [[fpf-actualize]] uses: status output
- [[fpf-query]] reads: inventory

## Quando usar
- Before starting new exploration work
- Monitoring knowledge base health
- Deciding when to refresh assumptions
- Planning knowledge maintenance activities
