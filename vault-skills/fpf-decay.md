---
aliases: [fpf:decay, decadência-evidência, evidence staleness]
type: skill
source: context-engineering-kit
invocation: /fpf:decay
category: planning
inputs: [knowledge base, decision history, timestamp data]
outputs: [staleness report, governance actions, refresh priorities]
estimated_tokens: medium
---

# Evidence Freshness Management

## Conceitos
- [[evidence-staleness]] — measuring decision currency
- [[governance-actions]] — what to do with stale decisions
- [[refresh-priorities]] — which assumptions need updating
- [[decision-lifecycle]] — aging of evidence quality

## Workflow
1. Analyze knowledge base for evidence age
2. Identify decisions becoming outdated
3. Rate staleness by domain and impact
4. Generate governance recommendations
5. Prioritize refresh activities
6. Track decision decay patterns

## Conecta com
- [[fpf-actualize]] feeds from: decay analysis
- [[fpf-query]] reads: freshness metadata
- [[kaizen-why]] can use: hypothesis lifecycle insights

## Quando usar
- Regular knowledge base maintenance cycles
- Before making decisions dependent on old assumptions
- Identifying technical debt in decision records
- Planning architectural reviews
