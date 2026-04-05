---
aliases: [plugin-settings, plugin-config, user-configuration, configuracoes-plugin]
type: skill
source: plugin-dev-plugin-settings
invocation: /plugin-settings
category: implementation
inputs: [plugin configuration needs]
outputs: [settings configuration, .local.md files]
estimated_tokens: small
---

# Plugin Settings

## Conceitos
- [[plugin-state]] — persistent plugin state
- [[user-configuration]] — user-specific settings
- [[local-overrides]] — .local.md file configuration
- [[settings-persistence]] — saving user preferences
- [[configuration-management]] — managing complex settings

## Workflow
1. Define plugin settings schema
2. Create .local.md files for user config
3. Store user preferences
4. Load settings on startup
5. Allow runtime configuration changes
6. Validate setting values
7. Export/import settings

## Conecta com
- [[plugin-dev-plugin-structure]] organizes: settings structure
- [[update-config]] updates: plugin configuration
- [[plugin-dev-agent-development]] uses: settings in agents

## Kada koristiti
- Storing plugin configuration
- User-configurable features
- Persistent plugin state
- Settings management
