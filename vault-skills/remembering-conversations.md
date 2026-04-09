---
aliases: [remembering-conversations, lembrar-conversas, memoria-episodica, episodic-memory, memoria-de-conversas, recall-conversations]
type: skill
source: plugin:episodic-memory:remembering-conversations
invocation: /remembering-conversations
category: data
inputs: [current conversation context, user query about past approaches, problem being solved]
outputs: [relevant past conversation snippets, previously successful approaches, historical context]
estimated_tokens: 5000
---

# Remembering Conversations

## Conceitos
- [[data]] — retrieves episodic memory from past conversation history
- [[planning]] — uses historical context to inform current decision-making
- [[debugging]] — recalls previously successful solutions for similar problems

## Workflow
1. Detect when user asks "how should I..." or "what's the best approach..." after exploring code
2. Search episodic memory for relevant past conversations and approaches
3. Surface previously successful solutions and historical context

## Conecta com
- [[knowledge-update]] recebe: conversation insights for knowledge base updates
- [[investigate]] recebe: historical context for current investigations
- [[learn]] recebe: past learning outcomes for continued growth

## Quando usar
- When the user asks "how should I..." or "what's the best approach..." after code exploration
- When you have tried to solve a problem and want to recall past successful approaches
- When historical conversation context would help inform current decisions
