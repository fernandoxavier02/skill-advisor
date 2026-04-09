---
aliases: [qodo-pr-resolver, resolver-pr, qodo-review, pr-resolver, resolver-pull-request, revisao-pr-qodo]
type: skill
source: plugin:qodo-skills:qodo-pr-resolver
invocation: /qodo-pr-resolver
category: quality
inputs: ["pull request URL or number", "repository context", "PR diff and comments"]
outputs: ["list of PR issues with severity", "AI-powered fix suggestions", "resolved code changes", "review summary"]
estimated_tokens: 10000
---

# Qodo PR Resolver

## Conceitos
- [[quality]] — AI-powered code review that catches issues humans might miss
- [[debugging]] — identifies bugs and logic errors in PR diffs
- [[security]] — flags security concerns in proposed changes

## Workflow
1. Fetch the pull request diff, comments, and review issues from GitHub/GitLab/Bitbucket
2. Analyze each issue with AI-powered code understanding
3. Present issues interactively with suggested fixes
4. Apply selected fixes to resolve PR review comments

## Conecta com
- [[code-review-review-pr]] recebe: PR context for complementary manual review
- [[git-create-pr]] recebe: fixed PR ready for re-review
- [[security-reviewer]] recebe: security-related findings for deeper analysis

## Quando usar
- When you have unresolved PR review comments and need help fixing them
- When you want AI-assisted triage of code review feedback
- When working across GitHub, GitLab, or Bitbucket and need unified PR resolution
