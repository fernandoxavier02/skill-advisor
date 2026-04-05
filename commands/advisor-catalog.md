---
name: advisor-catalog
description: Generate or rebuild the Obsidian vault knowledge base. Scans all installed skills, plugins, and MCPs, then uses LLM subagents to create rich skill cards and concept notes in the vault. Run after installing new plugins or to refresh the catalog.
---

# /advisor-catalog — Generate Vault Knowledge Base

Build or rebuild the Obsidian vault catalog with rich skill cards and concept notes.

## Steps

### 1. Scan sources and plan batches

```bash
CATALOG_SCRIPT=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/build-catalog.js" 2>/dev/null | head -1)
[ -z "$CATALOG_SCRIPT" ] && echo "ERROR: build-catalog.js not found" || node "$CATALOG_SCRIPT"
```

Report the scan results to the user: total sources, existing cards, pending cards, batch count.

### 2. Ensure vault directories exist

```bash
VAULT_PATH="$HOME/.claude/.claude/obsisian/Skill Advisor Claude code"
mkdir -p "$VAULT_PATH/concepts" "$VAULT_PATH/skills" "$VAULT_PATH/pipelines" "$VAULT_PATH/_graph" "$VAULT_PATH/_meta"
```

### 3. Generate skill cards via LLM subagents

For each batch of 10 pending skills, use the Agent tool (model: haiku) with this prompt:

"You are generating Obsidian skill cards for the Skill Advisor knowledge base.

For each skill below, create a markdown file with this EXACT format:

---
aliases: [name, name-pt-br, name-variation, ...]
type: skill
source: {source}
invocation: /{name}
category: {one of: debugging, quality, deployment, implementation, documentation, planning, data, utility}
inputs: [what this skill needs to start]
outputs: [what this skill produces]
estimated_tokens: {estimate}
---

# {Name}

## Conceitos
- [[concept1]] — brief explanation
- [[concept2]] — brief explanation

## Workflow
1. Step 1
2. Step 2

## Conecta com
- [[other-skill]] recebe: {output_name}

## Quando usar
- Scenario 1
- Scenario 2

RULES:
- aliases MUST include PT-BR translations and common variations
- concepts should be general themes (debugging, security, testing), NOT skill names
- inputs/outputs should be concrete data types
- category must be one of the 8 listed above
- Write each card between === CARD: filename.md === markers"

After receiving each batch response, parse the cards and write them to the vault skills/ directory.

### 4. Generate concept notes

After all skill cards are written, use the Agent tool (model: sonnet) to analyze all skill cards and generate concept notes with comprehensive aliases (PT-BR + EN + informal).

### 5. Build graph cache

```bash
GRAPH_SCRIPT=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/build-graph.js" 2>/dev/null | head -1)
[ -z "$GRAPH_SCRIPT" ] && echo "ERROR: build-graph.js not found" || node "$GRAPH_SCRIPT"
```

### 6. Generate pipeline templates

Use the Agent tool (model: haiku) to generate 8-10 common pipeline templates (bugfix, feature-dev, security-audit, code-review, deployment, refactoring, testing, documentation).

### 7. Validate and report

Read stats.json and report: total nodes, edges, aliases, orphans, dead links. Save catalog version to _meta/catalog-version.json.
