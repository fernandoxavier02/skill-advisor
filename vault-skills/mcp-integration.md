---
aliases: [mcp-integration, add-mcp, configure-mcp, integracao-mcp]
type: skill
source: plugin-dev-mcp-integration
invocation: /mcp-integration
category: implementation
inputs: [MCP server details, configuration]
outputs: [MCP integration, .mcp.json setup]
estimated_tokens: medium
---

# MCP Integration

## Conceitos
- [[model-context-protocol]] — MCP standard
- [[mcp-server]] — external MCP server configuration
- [[mcp-configuration]] — .mcp.json setup
- [[protocol-implementation]] — MCP compliance
- [[server-integration]] — connecting external services

## Workflow
1. Define MCP server configuration
2. Create .mcp.json file
3. Configure server details
4. Test MCP connection
5. Validate protocol compliance
6. Document available resources
7. Deploy integration

## Conecta com
- [[plugin-dev-plugin-structure]] organizes: MCP in plugin
- [[plugin-dev-hook-development]] uses: MCP resources
- [[update-config]] stores: MCP settings

## Kada koristiti
- Adding MCP servers to plugin
- Integrating external services
- Protocol-based integration
- Model Context Protocol setup
