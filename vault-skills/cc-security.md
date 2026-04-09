---
aliases: [cc-security, seguranca-cc, claude-code-security, seguranca-claude-code, cc-permissions, permissoes-cc]
type: skill
source: plugin:cc-toolkit:cc-security
invocation: /cc-security
category: quality
inputs: [current Claude Code permissions config, security requirements, sandbox mode preferences]
outputs: [configured permissions settings, allow/deny rules, security audit report, sandbox configuration]
estimated_tokens: 5000
---

# CC Security

## Conceitos
- [[security]] — configures Claude Code permissions, sandbox mode, and access control
- [[quality]] — audits security settings to ensure safe operation
- [[automation]] — automates permission rule setup and security configuration

## Workflow
1. Analyze current Claude Code permissions and security settings
2. Configure sandbox mode, allow/deny rules based on security requirements
3. Audit and validate the security configuration for safe operation

## Conecta com
- [[cc-expert-router]] recebe: security-specific questions routed from general queries
- [[security-auditor]] recebe: security findings for deeper audit
- [[cc]] recebe: security status for the main toolkit overview

## Quando usar
- When you need to configure Claude Code permissions and sandbox mode
- When setting up allow/deny rules for Claude Code operations
- When auditing your current Claude Code security settings
