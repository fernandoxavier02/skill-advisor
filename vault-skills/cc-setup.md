---
aliases: [cc-setup, setup-claude-code, instalar-claude-code, configurar-claude-code, claude-code-setup, claude-code-install]
type: skill
source: plugin:cc-toolkit:cc-setup
invocation: /cc-setup
category: utility
inputs: [target environment (CLI/desktop/VS Code/JetBrains), current OS, existing configuration]
outputs: [installed Claude Code CLI, configured IDE integration, troubleshooting report, environment validation]
estimated_tokens: 5000
---

# CC Setup

## Conceitos
- [[deployment]] — installs and configures Claude Code across different environments
- [[debugging]] — troubleshoots installation and integration issues
- [[automation]] — streamlines setup process for CLI, desktop, and IDE integrations

## Workflow
1. Detect target environment and check prerequisites (Node.js, IDE version, OS compatibility)
2. Install and configure Claude Code CLI, desktop app, or IDE integration
3. Validate the setup works correctly and troubleshoot any issues

## Conecta com
- [[cc-agent]] recebe: working CLI environment for agent execution
- [[cc-hooks]] recebe: configured environment where hooks can be registered
- [[plugin-settings]] recebe: plugin configuration capabilities after setup

## Quando usar
- When setting up Claude Code for the first time on a new machine
- When integrating Claude Code with VS Code or JetBrains IDEs
- When troubleshooting installation or configuration issues
