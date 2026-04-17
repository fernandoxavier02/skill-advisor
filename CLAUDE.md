# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Skill Advisor is a **Claude Code plugin** that acts as an intelligent routing layer across the user's entire toolchain. It scans all installed skills, plugins, MCP servers, and agents, then recommends the optimal combination for any task — with execution order, dependencies, and dry-run preview.

Key constraints: hook must complete in <50ms, zero network calls, all processing runs locally.

## Commands

```bash
# Run all tests (Node.js built-in test runner)
npm test

# Rebuild keyword + semantic index from all installed skills/plugins/MCPs
npm run index
# or: node lib/build-index.js

# Build semantic embeddings (requires @huggingface/transformers, ~2-5min first run)
node lib/build-embeddings.js

# Build Obsidian vault graph from vault-* directories
node lib/build-graph.js

# Scan sources for catalog generation
node lib/build-catalog.js
```

## Architecture

### Data Flow

There are two execution paths:

**Hook path (real-time, <50ms):**
```
User prompt → hooks/advisor-nudge.cjs
  → reads lib/advisor-index-lite.json (<100KB)
  → tokenize + PT-BR synonym expansion
  → semantic search (pre-computed embeddings) || keyword fallback
  → stdout nudge if score > threshold
```

**Command path (/advisor):**
```
/advisor <task> → commands/advisor.md
  → reads lib/advisor-index-full.json
  → gathers git/project context
  → spawns agents/advisor-router.md (Sonnet subagent)
  → router classifies task, matches index, builds loadout JSON
  → presents dry-run (visual context only)
  → spawns agents/advisor-gate.md (Sonnet subagent)
  → gate collects decisions via AskUserQuestion (native arrow-key menus)
  → gate returns structured JSON contract (gate_output)
  → command routes by gate_output.decision / moment2_decision:
      cancel                     → stop
      approve/alternative/custom → execute loadout (spec-driven or legacy)
```

**Prompt-injection surface:** user inputs (task description, git status, index content) flow into both subagent prompts. See `commands/advisor.md` "Prompt-Injection Defenses" section (Step 6) for the escaping contract applied before interpolation.

### Search Pipeline (3 layers, fused in parallel)

All three layers run simultaneously. Results are combined via weighted-average fusion (`FUSION_WEIGHTS`: semantic 0.5, keyword 0.3, graph 0.2).

1. **Semantic search** (`lib/semantic.js`) — cosine similarity of bag-of-words query embedding against pre-computed 384-dim vectors from `advisor-embeddings.json` + `advisor-vocab.json`. Model: `Xenova/all-MiniLM-L6-v2`. Weight: 0.5.

2. **Graph search** (`lib/graph-search.js`) — BFS traversal (max 2 hops) from alias-matched seed nodes in the Obsidian vault graph (`vault-graph/adjacency.json`). Scoring: `SCORE_BY_HOP = [1.0, 0.7, 0.4]`, with convergence boost (+0.15/extra seed) and category boost (+0.2 if task type matches). Weight: 0.2.

3. **Keyword matching** (`hooks/advisor-nudge.cjs`) — tokenize prompt, expand PT-BR→EN via SYNONYMS map (50+ terms), score against skill names (3x weight) and descriptions (2x weight). Weight: 0.3.

**Additional hook-level boosts (undocumented in earlier versions):**
- **Affinity boost** (+20%): skills the user has executed frequently get a score boost from `hookData.affinity`.
- **Context boost** (+10%): skills matching the current git branch category get a boost via `lib/context.js`.
- **Discovery nudge**: low-affinity skills are periodically surfaced with a 30-min cooldown.
- **Replay hint**: recent successful skill combos are suggested when patterns match.
- **Prompt injection sanitization**: invocation fields are stripped of non-alphanumeric characters.

### Two-Tier Index

`lib/build-index.js` generates both indexes by scanning `~/.claude/plugins/cache/`, `~/.claude/skills/`, project `.claude/skills/`, and MCP manifests:

- **Lite** (`advisor-index-lite.json`, <100KB): id, name, truncated description, invocation, category. Used by the hook for fast cold-reads.
- **Full** (`advisor-index-full.json`): all fields including type, source. Used by the /advisor command via the router subagent.

### Obsidian Vault

Four vault directories feed into the graph:
- `vault-skills/` — one .md card per skill with YAML frontmatter + `[[wikilinks]]`
- `vault-concepts/` — theme nodes (debugging, security, testing...)
- `vault-pipelines/` — pre-built step sequences (bugfix, feature, deploy...)
- `vault-graph/` — generated output: `adjacency.json` + `stats.json`

`lib/build-graph.js` parses vault files, resolves `[[wikilinks]]` into edges, builds bidirectional concept-concept edges, and writes the adjacency graph.

### Key Modules

| Module | Responsibility |
|--------|---------------|
| `lib/paths.js` | All path resolution (index, config, telemetry, vault dirs) |
| `lib/build-index.js` | Scans sources, generates lite/full indexes. Exports `parseFrontmatter`, `inferCategory`, `dedup`, `scanSkills` |
| `lib/build-embeddings.js` | One-time embedding generation via `@huggingface/transformers` |
| `lib/semantic.js` | Runtime semantic search using pre-computed embeddings (no model loading) |
| `lib/build-graph.js` | Vault parser + graph builder. Exports `buildGraph`, `parseFrontmatter`, `extractWikilinks` |
| `lib/graph-search.js` | BFS traversal + alias matching + task-type inference. Exports `graphSearch`, `loadGraph`, `matchAliases`, `bfsTraverse` |
| `lib/build-catalog.js` | Scans plugin/skill sources for Obsidian vault card generation |
| `hooks/advisor-nudge.cjs` | UserPromptSubmit hook — ephemeral process, no in-memory cache |

### Plugin Structure

- `plugin.json` — manifest with `autoDiscover: false` (commands, agents, hooks, skills are declared explicitly via their respective config files)
- `hooks/hooks.json` — registers `advisor-nudge.cjs` on `UserPromptSubmit`
- `commands/*.md` — 6 slash commands (advisor, advisor-catalog, advisor-config, advisor-feedback, advisor-index, advisor-stats)
- `agents/advisor-router.md` — Sonnet subagent for task classification + loadout building
- `agents/advisor-gate.md` — Sonnet subagent that runs the two-moment approval gate (Moment 1: loadout / Moment 2: spec generation). Uses `AskUserQuestion` for all user input and returns a structured JSON contract consumed by `commands/advisor.md` Step 6
- `skills/advisor-skill/SKILL.md` — auto-trigger skill for tool guidance

## Conventions

- **CommonJS** (`require`/`module.exports`), not ESM. Exception: `build-embeddings.js` uses dynamic `import()` for `@huggingface/transformers`.
- **No external dependencies** except `@huggingface/transformers` (only for embedding generation, not at runtime).
- **Node.js >= 18** required (uses `node:test`, `node:assert/strict`).
- Tests use Node.js built-in test runner (`node --test`), not Jest/Mocha.
- Test fixtures live in `tests/fixtures/` with sample skills, plugins, and malformed data.
- `parseFrontmatter` is a shared module (`lib/frontmatter.js`) imported by both `build-index.js` and `build-graph.js`. Both re-export it for backwards compatibility.
- The hook (`advisor-nudge.cjs`) must remain a single ephemeral CJS file — no persistent state, no async, no model loading.
- Bilingual PT-BR/EN support is a core requirement — synonym bridge, stopwords, and accent normalization must cover both languages.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
