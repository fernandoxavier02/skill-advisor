---
aliases: [git:commit, commit-command, conventional commits]
type: skill
source: context-engineering-kit
invocation: /git:commit
category: deployment
inputs: [staged changes, commit message intent, optional flags]
outputs: [formatted commit, conventional message, signed if configured]
estimated_tokens: small
---

# Commit

## Conceitos
- [[conventional-commits]] — structured commit messages
- [[emoji-conventions]] — visual commit categorization
- [[commit-hygiene]] — clean, focused commits
- [[pre-commit-hooks]] — validation before commit

## Workflow
1. Stage changes with git add
2. Compose commit message following conventional format
3. Optionally add emoji for category
4. Submit with /git:commit or skip hooks if needed
5. Sign if GPG configured
6. Create well-formatted commit

## Conecta com
- [[git-create-pr]] uses: commit history
- [[spec-lifecycle]] integrates: commits as milestones
- [[land-and-deploy]] follows: commit creation

## Quando usar
- Creating commits from staged changes
- Following conventional commit standards
- Signing commits with GPG
- Grouping related changes into logical units
