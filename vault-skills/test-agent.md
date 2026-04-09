---
aliases: [test-agent, agente-teste, agente-revisao-codigo, test-review-agent, code-quality-agent]
type: skill
source: plugin:test-plugin:agent:test-agent
invocation: /test-agent
category: quality
inputs: [codebase path, files to review, quality criteria]
outputs: [code review findings, quality analysis report, improvement suggestions]
estimated_tokens: 5000
---

# Test Agent

## Conceitos
- [[quality]] — performs automated code review and quality analysis
- [[testing]] — validates code against quality standards and best practices
- [[architecture]] — identifies structural issues and design pattern violations

## Workflow
1. Receive code files or diff for review and quality analysis
2. Analyze code against quality criteria (style, complexity, patterns, bugs)
3. Generate review findings with specific improvement suggestions

## Conecta com
- [[code-review-review-local-changes]] recebe: local changes for targeted review
- [[tdd-write-tests]] recebe: quality findings that inform test coverage priorities
- [[reflexion-critique]] recebe: code analysis for multi-perspective evaluation

## Quando usar
- When you need an automated code review before submitting changes
- When assessing overall code quality in a module or file
- When you want a second opinion on code structure and patterns
