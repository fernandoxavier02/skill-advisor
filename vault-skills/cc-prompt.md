---
aliases: [cc-prompt, claude-code-prompt, otimizar-prompt, prompt-optimization, claude-api-config, configuracao-prompt]
type: skill
source: "plugin:cc-toolkit:cc-prompt"
invocation: /cc-prompt
category: utility
inputs: ["current prompt or instruction text", "target use case (tool use, vision, thinking, caching)", "model preference"]
outputs: ["optimized prompt", "API configuration recommendations", "model selection guidance", "prompt caching strategy"]
estimated_tokens: 5000
---

# CC Prompt

## Conceitos
- [[quality]] — systematic prompt optimization for better Claude API results
- [[automation]] — configures tool use, extended thinking, prompt caching, and vision settings
- [[architecture]] — understands Claude API capabilities and model-specific strengths
- [[planning]] — strategic model selection and prompt structure design

## Workflow
1. Analyze current prompt structure and target use case
2. Optimize prompt text — clarity, specificity, format, instruction ordering
3. Configure API parameters — model selection, tool use, thinking, caching, vision settings

## Conecta com
- [[cc-context]] recebe: optimized prompts for context integration
- [[customaize-agent-test-prompt]] recebe: optimized prompt for verification testing
- [[customaize-agent-context-engineering]] recebe: prompt patterns for context system design

## Quando usar
- When optimizing prompts for Claude API usage
- When choosing between Claude models for a specific task
- When configuring tool use, extended thinking, or prompt caching
- When setting up vision or multimodal prompts
- When prompt responses are inconsistent or low quality
