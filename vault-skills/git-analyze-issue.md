---
aliases: [git:analyze-issue, analisar-issue, issue technical spec]
type: skill
source: context-engineering-kit
invocation: /git:analyze-issue
category: planning
inputs: [GitHub issue number]
outputs: [technical specification, acceptance criteria, implementation plan]
estimated_tokens: medium
---

# Analyze Issue

## Conceitos
- [[issue-parsing]] — extracting technical requirements
- [[specification-generation]] — creating actionable specs
- [[acceptance-criteria]] — defining done conditions
- [[implementation-planning]] — task breakdown

## Workflow
1. Fetch issue details from GitHub using gh CLI
2. Parse requirements and acceptance criteria
3. Identify affected files and systems
4. Generate technical specification
5. Create implementation plan
6. Output structured spec with task breakdown

## Conecta com
- [[git-create-pr]] produces: PR from implemented spec
- [[sdd-developer]] uses: detailed spec output
- [[spec-lifecycle]] integrates with: spec generation

## Quando usar
- Converting GitHub issues into implementation specs
- Planning complex feature work
- Breaking down issues into actionable tasks
- Creating technical specifications before coding
