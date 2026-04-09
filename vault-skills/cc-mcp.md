---
aliases: [cc-mcp, mcp-config, configurar-mcp, mcp-setup, cc-toolkit-mcp, mcp-diagnostico]
type: skill
source: plugin:cc-toolkit:cc-mcp
invocation: /cc-mcp
category: utility
inputs: ["MCP server name or URL", "current .claude/settings.json", "desired MCP capabilities"]
outputs: ["configured MCP server entry in settings", "diagnostic report for MCP issues", "optimized MCP configuration"]
estimated_tokens: 5000
---

# CC MCP

## Conceitos
- [[automation]] — automates MCP server configuration and troubleshooting
- [[architecture]] — manages the integration layer between Claude Code and external tools
- [[debugging]] — diagnoses connectivity and configuration issues with MCP servers

## Workflow
1. Identify the target MCP server (add new, diagnose existing, or optimize)
2. Analyze current configuration and test connectivity
3. Apply changes to settings.json with proper parameters and environment variables
4. Verify the MCP server is functional and accessible

## Conecta com
- [[cc-audit]] recebe: MCP configuration status as part of broader audit
- [[mcp-builder]] recebe: custom MCP server specs when built-in config is insufficient
- [[cc-skill]] recebe: skill-to-MCP integration requirements

## Quando usar
- When adding a new MCP server to your Claude Code project
- When an MCP tool is not responding or behaving unexpectedly
- When you need to optimize MCP server startup or reduce resource usage
