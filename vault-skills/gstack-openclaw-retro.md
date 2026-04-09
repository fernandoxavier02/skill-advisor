---
aliases: [gstack-openclaw-retro, retrospectiva-semanal, retro, retrospectiva-engenharia, weekly-retro, engineering-retrospective]
type: skill
source: global:gstack-openclaw-retro
invocation: /gstack-openclaw-retro
category: quality
inputs: [git commit history, work patterns data, code quality metrics, persistent history from previous retros]
outputs: [weekly retrospective report, commit analysis summary, quality trend metrics, improvement recommendations]
estimated_tokens: 10000
---

# GStack OpenClaw Retro

## Conceitos
- [[quality]] — analyzes code quality metrics and trends over time
- [[observability]] — tracks work patterns and engineering velocity
- [[planning]] — uses historical data to inform future sprint planning
- [[automation]] — automates the retrospective analysis process

## Workflow
1. Analyze commit history and work patterns from the past week
2. Compute code quality metrics and compare against persistent historical data
3. Generate retrospective report with trends, highlights, and improvement areas

## Conecta com
- [[git-commit]] recebe: commit history and conventional commit metadata
- [[retro]] recebe: quality metrics and trend data for team discussion
- [[write-plan]] recebe: improvement recommendations for next sprint planning

## Quando usar
- At the end of each week to review engineering output and quality
- When you need data-driven insights into development patterns
- When tracking quality trends across multiple sprints with persistent history
