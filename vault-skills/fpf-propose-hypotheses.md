---
aliases: [fpf:propose-hypotheses, gerar-hipóteses, hypothesis generation]
type: skill
source: context-engineering-kit
invocation: /fpf:propose-hypotheses
category: planning
inputs: [problem statement, domain context, constraints]
outputs: [hypothesis set, verification plan, trust metrics]
estimated_tokens: large
---

# Propose Hypotheses

## Conceitos
- [[hypothesis-generation]] — creating testable theories systematically
- [[first-principles-reasoning]] — abduction-deduction cycle
- [[verification-planning]] — designing validation experiments
- [[trust-metrics]] — confidence scoring for hypotheses

## Workflow
1. Parse problem statement and constraints
2. Execute FPF cycle: abduction → deduction → validation
3. Generate multiple hypothesis candidates
4. Design verification experiments for each
5. Calculate initial trust scores
6. Output ranked hypothesis set with validation plans

## Conecta com
- [[fpf-agent]] calls: this skill internally
- [[fpf-query]] stores: generated hypotheses
- [[sadd-judge]] can evaluate: hypothesis quality

## Quando usar
- Generating architectural hypotheses before implementation
- Validating technology choices with evidence
- Breaking down complex problems into testable parts
- Building decision records with confidence metrics
