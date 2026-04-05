---
aliases: [investigate, debugging, investigacao-sistematica, root-cause-analysis]
type: skill
source: investigate
invocation: /investigate
category: debugging
inputs: [error message, failing test, unexpected behavior]
outputs: [root cause analysis, fix recommendation]
estimated_tokens: large
---

# Investigate

## Conceitos
- [[root-cause-analysis]] — systematic debugging methodology
- [[hypothesis-testing]] — validating theories about failures
- [[code-tracing]] — following execution flow
- [[error-analysis]] — understanding failure modes

## Workflow
1. **Investigate** — Gather evidence and context
2. **Analyze** — Review logs, stack traces, code paths
3. **Hypothesize** — Form theories about root cause
4. **Implement** — Apply fix and verify

## Conecta com
- [[health]] recebe: project metrics
- [[review]] recebe: code changes to validate
- [[qa]] pode descobrir issues para investigar

## Quando usar
- Debugging production errors
- Understanding test failures
- Tracking down intermittent bugs
- Performance investigations
- After QA finds a bug
