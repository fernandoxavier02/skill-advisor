---
aliases: [hook-development, create-hook, custom-hook, desenvolvimento-hook]
type: skill
source: plugin-dev-hook-development
invocation: /hook-development
category: implementation
inputs: [hook requirements, event type]
outputs: [hook code, configuration]
estimated_tokens: medium
---

# Hook Development

## Conceitos
- [[pre-tool-use]] — hooks before tool execution
- [[post-tool-use]] — hooks after tool execution
- [[stop-hooks]] — pre-execution validation
- [[prompt-hooks]] — prompt modification
- [[event-driven]] — trigger-based execution

## Workflow
1. Define hook type (pre/post/stop)
2. Specify trigger conditions
3. Implement hook logic
4. Validate tool interactions
5. Test hook execution
6. Configure in plugin
7. Monitor hook behavior

## Conecta com
- [[plugin-dev-agent-development]] uses: for agent hooks
- [[writing-hookify-rules]] creates: automation hooks
- [[plugin-dev-plugin-structure]] organizes: hook structure

## Quando usar
- Creating automation hooks
- Tool validation logic
- Prompt modification hooks
- Event-driven automation
- Pre-execution validation
