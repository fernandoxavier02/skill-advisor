---
aliases: [git:attach-review-to-pr, comentar-pr, line-specific review]
type: skill
source: context-engineering-kit
invocation: /git:attach-review-to-pr
category: quality
inputs: [PR number or URL, review comments with line references]
outputs: [PR review comments, annotated feedback, GitHub API submission]
estimated_tokens: medium
---

# Attach Review to PR

## Conceitos
- [[code-review]] — evaluating implementation quality
- [[line-specific-feedback]] — granular comments
- [[github-api]] — programmatic PR interaction
- [[review-formatting]] — structured feedback

## Workflow
1. Identify target PR by number or URL
2. Gather review comments with line references
3. Format comments for GitHub API
4. Submit line-specific review comments
5. Associate with PR review object
6. Track review state and responses

## Conecta com
- [[git-create-pr]] produces: PRs to review
- [[code-review-review-pr]] can use: similar workflow
- [[sadd-judge]] can output: review format

## Quando usar
- Adding detailed feedback to pull requests
- Attaching code review comments
- Providing line-by-line suggestions
- Submitting formal PR reviews via CLI
