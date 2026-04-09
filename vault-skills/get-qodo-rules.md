---
aliases: [get-qodo-rules, regras-qodo, qodo-rules, carregar-regras-qodo, qodo-coding-rules]
type: skill
source: plugin:qodo-skills:get-qodo-rules
invocation: /get-qodo-rules
category: quality
inputs: [organization ID, repository path, Qodo configuration]
outputs: [org-level coding rules, repo-level coding rules, merged rule set for code generation]
estimated_tokens: 2000
---

# Get Qodo Rules

## Conceitos
- [[quality]] — enforces organization and repository coding standards
- [[architecture]] — ensures generated code follows established patterns and conventions
- [[automation]] — loads rules automatically before code tasks begin

## Workflow
1. Connect to Qodo and fetch organization-level coding rules
2. Fetch repository-level coding rules and merge with org rules
3. Apply merged rule set as constraints for all subsequent code generation and modification

## Conecta com
- [[conventions]] recebe: coding standards that align with Qodo rules
- [[code-review-review-local-changes]] recebe: rule set for validating changes
- [[sdd-implement]] recebe: coding constraints for implementation tasks

## Quando usar
- Before starting any code generation or modification task in a Qodo-managed repo
- When you need to ensure code follows organization-wide standards
- When onboarding to a new repository with Qodo coding rules configured
