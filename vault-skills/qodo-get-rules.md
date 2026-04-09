---
aliases: [qodo-get-rules, qodo-rules, regras-qodo, qodo-coding-rules, qodo-best-practices, carregar-regras-qodo]
type: skill
source: "plugin:qodo-skills:qodo-get-rules"
invocation: /qodo-get-rules
category: quality
inputs: ["current coding task description", "codebase context"]
outputs: ["relevant coding rules from Qodo", "best practice guidelines", "rule applicability ranking"]
estimated_tokens: 2000
---

# Qodo Get Rules

## Conceitos
- [[quality]] — loads context-relevant coding rules to enforce best practices
- [[automation]] — semantic search matches rules to the current task automatically
- [[architecture]] — rules cover patterns, anti-patterns, and project conventions

## Workflow
1. Generate a semantic search query from the current coding task context
2. Query Qodo's rule database for the most relevant coding rules
3. Return ranked rules with applicability context for the current task

## Conecta com
- [[customaize-agent-create-rule]] recebe: identified rule gaps when Qodo has no matching rule
- [[code-review-review-local-changes]] recebe: coding rules as review criteria
- [[tdd-fix-tests]] recebe: testing rules for test quality enforcement

## Quando usar
- Before starting a coding task to load relevant best practice rules
- When reviewing code and need project-specific or language-specific guidelines
- When onboarding to a new codebase and need to understand its coding conventions
- When Qodo rules are configured and you want AI-assisted rule retrieval
