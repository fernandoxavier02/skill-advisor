---
aliases: [search-conversations, buscar-conversas, pesquisar-conversas, memory-search, episodic-memory, memoria-sessoes, conversation-history]
type: skill
source: plugin:episodic-memory:agent:search-conversations
invocation: /search-conversations
category: utility
inputs: [search query keywords, date range filter, conversation topic, project context]
outputs: [matching conversation excerpts, session metadata, relevant context from past sessions]
estimated_tokens: 5000
---

# Search Conversations

## Conceitos
- [[observability]] — provides cross-session memory and context recall
- [[documentation]] — retrieves past decisions and reasoning for reference
- [[planning]] — informs current tasks with historical context from past conversations

## Workflow
1. Parse the search query and optional filters (date, topic, project)
2. Search through episodic memory index of past conversation sessions
3. Return matching excerpts with metadata, ranked by relevance

## Conecta com
- [[reflexion-memorize]] recebe: conversation excerpts to persist as long-term memory
- [[investigate]] recebe: historical context from past sessions for current investigation
- [[researcher]] recebe: past research findings and decisions for reference

## Quando usar
- When you need to recall a decision or discussion from a previous session
- When context from past conversations is relevant to the current task
- When you want to find what was previously discussed about a specific topic or file
