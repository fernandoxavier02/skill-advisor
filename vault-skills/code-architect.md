---
aliases: [code-architect, arquiteto-de-codigo, feature-architect, architecture-designer-code, design-feature]
type: skill
source: plugin:feature-dev:agent:code-architect
invocation: /code-architect
category: planning
inputs: ["feature requirements or user story", "existing codebase", "project conventions and patterns"]
outputs: ["architecture design document", "implementation plan with file mappings", "component interaction diagrams", "convention-aligned code structure"]
estimated_tokens: 10000
---

# Code Architect

## Conceitos
- [[architecture]] — designs feature architectures that align with existing codebase patterns
- [[planning]] — produces comprehensive implementation plans before coding starts
- [[quality]] — ensures new features follow established conventions and SOLID principles

## Workflow
1. Analyze existing codebase patterns, conventions, and directory structure
2. Map feature requirements to architectural components and data flows
3. Design the feature architecture with clear boundaries and integration points
4. Deliver implementation plan with file-by-file guidance and dependency order

## Conecta com
- [[write-plan]] recebe: architectural blueprint to convert into step-by-step plan
- [[execute-plan]] recebe: implementation-ready architecture with file mappings
- [[gstack-openclaw-ceo-review]] recebe: architecture for high-level review

## Quando usar
- When starting a new feature that spans multiple files or modules
- When you need to understand how a feature should integrate with existing code
- When the codebase has strong conventions and you need architecture that respects them
