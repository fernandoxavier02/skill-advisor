---
aliases: [github, github-mcp, servidor-github, github-server, integracao-github, github-integration]
type: skill
source: mcp:github
invocation: /github
category: utility
inputs: [GitHub repository URL, issue/PR number, search query, repository owner/name]
outputs: [repository data, issue details, PR information, commit history, GitHub API responses]
estimated_tokens: 5000
---

# GitHub MCP

## Conceitos
- [[tooling]] — MCP server providing direct GitHub API access for repository operations
- [[automation]] — automates GitHub workflows including issues, PRs, and releases
- [[data]] — retrieves repository data, commit history, and collaboration information

## Workflow
1. Connect to GitHub via MCP server with authenticated API access
2. Execute GitHub operations (read/write issues, PRs, commits, releases)
3. Return structured GitHub API responses for further processing

## Conecta com
- [[git-create-pr]] recebe: GitHub context for pull request creation
- [[git-attach-review-to-pr]] recebe: GitHub API access for posting review comments
- [[git-analyze-issue]] recebe: issue data for analysis workflows

## Quando usar
- When you need to interact with GitHub repositories, issues, or pull requests
- When automating GitHub workflows like creating issues, reviewing PRs, or managing releases
- When retrieving repository data, commit history, or collaboration information from GitHub
