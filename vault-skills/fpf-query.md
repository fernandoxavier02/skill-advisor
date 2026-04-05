---
aliases: [fpf:query, consultar-hipóteses, hypothesis search]
type: skill
source: context-engineering-kit
invocation: /fpf:query
category: planning
inputs: [search terms, hypothesis filters, domain scope]
outputs: [matched hypotheses, assurance details, evidence links]
estimated_tokens: small
---

# Query Knowledge

## Conceitos
- [[knowledge-search]] — semantic search over hypotheses
- [[assurance-information]] — confidence and evidence metadata
- [[hypothesis-details]] — complete decision context
- [[evidence-linking]] — traceability to source data

## Workflow
1. Accept search query or filter criteria
2. Search knowledge base for matching hypotheses
3. Retrieve full hypothesis details with evidence
4. Calculate assurance scores from trust data
5. Format results with source references
6. Display ranked by relevance and confidence

## Conecta com
- [[fpf-actualize]] feeds: updated knowledge
- [[fpf-propose-hypotheses]] stores: new hypotheses
- [[fpf-status]] reads: knowledge state

## Quando usar
- Finding previous decisions on related topics
- Verifying assumptions before architectural changes
- Searching for evidence on technology choices
- Reviewing decision history and trust metrics
