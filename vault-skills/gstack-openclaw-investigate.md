---
aliases: [gstack-openclaw-investigate, openclaw-investigate, investigacao-sistematica, investigar-bug, systematic-investigation, gstack-investigate]
type: skill
source: global:gstack-openclaw-investigate
invocation: /gstack-openclaw-investigate
category: debugging
inputs: ["bug report or error description", "codebase path", "reproduction steps or logs"]
outputs: ["root cause analysis", "hypothesis ranking", "fix implementation", "verification results"]
estimated_tokens: 10000
---

# GStack OpenClaw Investigate

## Conceitos
- [[debugging]] — systematic four-phase investigation methodology for root cause discovery
- [[observability]] — leverages logs, traces, and error patterns to narrow hypotheses
- [[architecture]] — analyzes system structure to trace error propagation paths
- [[quality]] — enforces Iron Law discipline to prevent premature fixes

## Workflow
1. **Investigate** — gather evidence from logs, stack traces, reproduction steps, and affected code paths
2. **Analyze** — map the evidence to system components, identify patterns and anomalies
3. **Hypothesize** — generate ranked hypotheses with confidence levels, test each systematically
4. **Implement** — apply the fix for the validated root cause, verify no regressions

## Conecta com
- [[tdd-fix-tests]] recebe: root cause analysis and fix implementation for test validation
- [[kaizen-why]] recebe: initial symptom description for deeper root cause drilling
- [[kaizen-cause-and-effect]] recebe: problem statement for fishbone category analysis
- [[reflexion-reflect]] recebe: investigation outcome for self-refinement

## Quando usar
- When a bug defies simple inspection and requires structured investigation
- When multiple potential root causes exist and need systematic elimination
- When production incidents require disciplined triage before jumping to fixes
- When the Iron Law applies: never guess, always prove with evidence
