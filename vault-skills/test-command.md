---
aliases: [test-command, comando-teste, test-plugin-command, comando-de-teste, qa-command]
type: skill
source: plugin:test-plugin:cmd:test-command
invocation: /test-command
category: quality
inputs: [test parameters, verification target]
outputs: [test execution results, QA verification report]
estimated_tokens: 2000
---

# Test Command

## Conceitos
- [[testing]] — QA verification command for testing plugin workflows
- [[quality]] — validates that plugin systems are functioning correctly
- [[automation]] — automated test execution for plugin verification

## Workflow
1. Invoke the test command with target parameters
2. Execute QA verification checks against the plugin system
3. Return test results confirming plugin functionality

## Conecta com
- [[customaize-agent-test-skill]] recebe: test infrastructure for skill testing
- [[qa]] recebe: test results for quality assurance workflows

## Quando usar
- When verifying that a plugin system is working correctly
- When running QA checks on Claude Code plugin infrastructure
- When debugging plugin command execution issues
