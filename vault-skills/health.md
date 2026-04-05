---
aliases: [health, code-quality-dashboard, dashboard-qualidade-codigo]
type: skill
source: gstack, health
invocation: /health
category: quality
inputs: [project root, build tools available]
outputs: [quality dashboard, metrics summary]
estimated_tokens: medium
---

# Health

## Conceitos
- [[quality-metrics]] — type checking, linting, test coverage
- [[dead-code-detection]] — unused code analysis
- [[shell-linting]] — shell script validation
- [[project-dashboard]] — real-time code health visualization

## Workflow
1. Detect available project tools (type checker, linter, test runner)
2. Run all quality checks in parallel
3. Aggregate results into dashboard
4. Display metrics and trends

## Conecta com
- [[investigate]] recebe: findings to debug
- [[retro]] recebe: metrics for retrospective analysis

## Quando usar
- Before shipping to verify code quality
- Weekly check-in on project health
- After major refactoring to ensure quality maintained
- As part of CI/CD pipeline validation
