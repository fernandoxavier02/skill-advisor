---
aliases: [figma, figma-mcp, figma-server, design-figma, integracao-figma, figma-integration]
type: skill
source: mcp:figma
invocation: /figma
category: implementation
inputs: ["Figma file URL or file key", "node ID (optional)", "design intent or implementation target"]
outputs: ["design context and code reference", "screenshots", "component metadata", "code connect mappings"]
estimated_tokens: 5000
---

# Figma

## Conceitos
- [[architecture]] — bridges design files to code implementation via MCP server
- [[quality]] — ensures design fidelity by reading actual Figma component data
- [[automation]] — automates design-to-code workflow with Code Connect mappings

## Workflow
1. Parse Figma URL to extract fileKey and nodeId
2. Fetch design context (code, screenshots, hints) via get_design_context
3. Adapt the reference output to the target project's stack, components, and conventions

## Conecta com
- [[sdd-brainstorm]] recebe: design context for implementation planning
- [[react-expert]] recebe: React+Tailwind reference code from Figma designs
- [[elite-frontend-ux]] recebe: design specifications for pixel-perfect implementation

## Quando usar
- When implementing UI from a Figma design file
- When the user shares a figma.com URL and wants code generated from it
- When mapping Figma components to codebase components via Code Connect
- When creating diagrams in FigJam
- When checking design tokens, variables, or component documentation
