---
aliases: [writing-clearly-and-concisely, escrita-clara-concisa, strunk-rules, clear-writing, concise-writing, redacao-tecnica, technical-writing-style]
type: skill
source: "plugin:elements-of-style:writing-clearly-and-concisely"
invocation: /writing-clearly-and-concisely
category: documentation
inputs: ["prose text to improve (docs, commit messages, error messages, comments, explanations)"]
outputs: ["revised text following Strunk's rules", "clarity improvements", "conciseness edits"]
estimated_tokens: 2000
---

# Writing Clearly and Concisely

## Conceitos
- [[documentation]] — applies Strunk's Elements of Style rules to all human-facing prose
- [[quality]] — enforces clarity, brevity, and precision in written communication
- [[planning]] — structures text for maximum comprehension with minimum words

## Workflow
1. Analyze the input text for verbosity, ambiguity, passive voice, and weak constructions
2. Apply Strunk's rules: omit needless words, use active voice, prefer specific over general
3. Return revised text with explanations of key changes

## Conecta com
- [[docs-update-docs]] recebe: clear, concise text for documentation updates
- [[git-create-pr]] recebe: well-written PR descriptions and summaries
- [[tech-writer]] recebe: style-guide-compliant prose for technical documentation

## Quando usar
- When writing or editing documentation that humans will read
- When crafting commit messages, PR descriptions, or changelog entries
- When improving error messages or user-facing text for clarity
- When review feedback says text is "too verbose" or "unclear"
- When writing explanations, comments, or README content
