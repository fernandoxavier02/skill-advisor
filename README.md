<p align="center">
  <img src="assets/fx-studio-ai-logo.jpg" alt="FX Studio AI" width="80" height="80" style="border-radius: 50%;" />
</p>

<h1 align="center">Skill Advisor</h1>

<p align="center">
  <strong>Intelligent Toolchain Orchestrator for Claude Code</strong>
</p>

<p align="center">
  <a href="#installation"><img src="https://img.shields.io/badge/platform-Claude_Code-7C3AED?style=flat-square" alt="Platform" /></a>
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square" alt="Node" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/marketplace-FX--studio--AI-orange?style=flat-square" alt="Marketplace" />
</p>

<p align="center">
  <em>Stop guessing which skill to use. Let the Advisor find the optimal loadout for your task.</em>
</p>

---

## Overview

Skill Advisor is a Claude Code plugin that acts as an **intelligent routing layer** across your entire toolchain. It scans all installed skills, plugins, MCP servers, and agents, then recommends the optimal combination for any given task — with execution order, dependencies, and a dry-run preview.

### Key Features

- **Real-time nudging** — a lightweight hook (<50ms) suggests relevant skills as you type
- **Semantic search** — local embeddings via `transformers.js` for meaning-aware matching
- **Bilingual engine** — full PT-BR / EN synonym bridge with 50+ term mappings
- **Obsidian vault** — generates a navigable knowledge base with 348+ skill cards
- **Graph-aware routing** — 2,800+ edges connecting skills, concepts, and pipelines
- **Zero network calls** — everything runs locally, no data leaves your machine

---

## How It Works

### Automatic Mode (Hook)

Every prompt you type is analyzed in real-time:

```
You type a prompt
       |
  advisor-nudge.cjs (<50ms)
       |
  Tokenize + synonym expansion (PT-BR <-> EN)
       |
  Semantic search (embeddings) -> keyword fallback
       |
  Score > threshold?
    YES -> "[Advisor] Considere /advisor — /investigate (85%), /fix (72%)"
    NO  -> (silent)
```

### Manual Mode (`/advisor`)

```
/advisor fix authentication bug on the login page

  1. Load full index (500+ entries)
  2. Gather context (git branch, project type, recent changes)
  3. Spawn advisor-router subagent (Sonnet)
  4. Classify task -> select 3-5 skills -> resolve dependencies
  5. Present dry-run:

  +-----------------------------------------+
  |  ADVISOR LOADOUT                        |
  |                                         |
  |  1. /investigate  [debugging]    ~5min  |
  |     -> Diagnose root cause              |
  |                                         |
  |  2. /fix          [impl]        ~10min  |
  |     -> Apply targeted fix               |
  |     depends on: #1                      |
  |                                         |
  |  3. /review       [quality]      ~5min  |
  |     -> Validate the fix                 |
  |     depends on: #2                      |
  |                                         |
  |  Estimated: ~20min | ~8K tokens         |
  |  Risk: low                              |
  +-----------------------------------------+

  6. You approve, modify, or cancel
```

---

## Commands

| Command | Description |
|---------|-------------|
| `/advisor <task>` | Analyze task and recommend skill loadout |
| `/advisor-index` | Rebuild keyword index + semantic embeddings |
| `/advisor-catalog` | Generate Obsidian vault with skill cards |
| `/advisor-config status` | Show current configuration |
| `/advisor-config enable` | Enable automatic hook |
| `/advisor-config disable` | Disable automatic hook |
| `/advisor-config threshold 0.3` | Adjust sensitivity (0.0 - 1.0) |
| `/advisor-feedback` | Record feedback on last recommendation |

---

## Architecture

```
skill-advisor/
|
|-- commands/                 # Slash commands
|   |-- advisor.md            # Main recommendation engine
|   |-- advisor-catalog.md    # Obsidian vault generator
|   |-- advisor-config.md     # Configuration manager
|   |-- advisor-feedback.md   # Feedback collector
|   |-- advisor-index.md      # Index rebuilder
|
|-- agents/
|   |-- advisor-router.md     # Sonnet subagent — task classifier + loadout builder
|
|-- skills/
|   |-- advisor-skill/
|       |-- SKILL.md           # Auto-trigger when user needs tool guidance
|
|-- hooks/
|   |-- advisor-nudge.cjs     # UserPromptSubmit hook (<50ms, zero network)
|   |-- hooks.json            # Hook configuration
|
|-- lib/                      # Core engine (Node.js)
|   |-- paths.js              # Path resolution
|   |-- build-index.js        # Keyword index generator (lite + full)
|   |-- build-embeddings.js   # Semantic embeddings via transformers.js
|   |-- build-catalog.js      # Source scanner for Obsidian vault
|   |-- build-graph.js        # Graph builder (skills <-> concepts)
|   |-- graph-search.js       # Adjacency-based graph search
|   |-- semantic.js           # Embedding-based semantic search engine
|
|-- vault-skills/             # 348 Obsidian skill cards
|-- vault-concepts/           # 45 concept notes with backlinks
|-- vault-pipelines/          # 8 pipeline templates
|-- vault-graph/              # Graph cache (401 nodes, 2803 edges)
|
|-- tests/                    # Unit tests
|-- assets/                   # Branding assets
|-- plugin.json               # Plugin manifest (autoDiscover: true)
|-- package.json              # Dependencies
```

---

## Obsidian Knowledge Base

The `/advisor-catalog` command generates a full Obsidian vault:

| Component | Count | Description |
|-----------|-------|-------------|
| Skill cards | 348 | One `.md` per skill with YAML frontmatter, aliases, concepts |
| Concept notes | 45 | Theme nodes (debugging, security, testing, AI/ML, ...) |
| Pipeline templates | 8 | Pre-built sequences (bugfix, feature, deploy, security, ...) |
| Graph nodes | 401 | Skills + concepts + pipelines |
| Graph edges | 2,803 | Connections via `[[backlinks]]` |
| Aliases | 549 | PT-BR + EN + variations for semantic matching |

Open the vault in Obsidian at `~/.claude/.claude/obsisian/Skill Advisor Claude code/` to explore the graph visually.

---

## Installation

### From FX-studio-AI Marketplace

The plugin is distributed via the **FX-studio-AI** marketplace for Claude Code.

### Verify Installation

```bash
# Should show: "skill-advisor@FX-studio-AI": true
grep "skill-advisor" ~/.claude/settings.json
```

### First-time Setup

```
/advisor-index        # Build keyword + semantic index
/advisor-catalog      # (Optional) Generate Obsidian vault
```

---

## Configuration

### Hook Sensitivity

The threshold controls how aggressively the hook suggests `/advisor`. Lower = more suggestions.

| Value | Behavior |
|-------|----------|
| `0.15` | Very sensitive — suggests often |
| `0.20` | **Default** — balanced |
| `0.35` | Conservative — only strong matches |
| `0.50` | Minimal — near-exact matches only |

```
/advisor-config threshold 0.25
```

### Disable Hook

```
/advisor-config disable
```

### Environment Variables

```bash
ADVISOR_ENABLED=false     # Disable hook entirely
ADVISOR_THRESHOLD=0.35    # Override threshold
```

---

## Technical Details

### Search Pipeline

The hook uses a two-stage search strategy:

1. **Semantic search** (primary) — pre-computed embeddings via `@huggingface/transformers` compare prompt meaning against all skill descriptions. Runs in ~15ms using cached vectors.

2. **Keyword matching** (fallback) — tokenizes the prompt, expands PT-BR synonyms to EN equivalents, and scores against skill names (3x weight) and descriptions (2x weight).

### Synonym Bridge

The bilingual engine maps 50+ Portuguese terms to English equivalents:

```
auditar    -> [audit, review]
corrigir   -> [fix, debug]
implantar  -> [deploy, ship]
refatorar  -> [refactor, simplify]
seguranca  -> [security, safe]
```

### Performance Constraints

| Metric | Target | Actual |
|--------|--------|--------|
| Hook latency | <50ms | ~15-30ms |
| Index size (lite) | <100KB | ~80KB |
| Embeddings model | ~23MB | First run only |
| Network calls | 0 | 0 |

---

## Privacy

- All processing runs **locally** on your machine
- No data is sent to external servers
- Telemetry is stored in `lib/advisor-telemetry.jsonl` (local file only)
- Telemetry records: timestamp, action taken, loadout size, top skill

---

## Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `@huggingface/transformers` | Local semantic embeddings | ~23MB (first run) |
| Node.js >= 18 | Runtime | System |

---

## Current Limitations (v0.1.0)

- Pipeline execution is manual (you run each skill in the suggested order)
- Vault skill cards have basic metadata (future: richer descriptions, examples)
- Graph connections use static backlinks (future: weighted dynamic edges)
- Embeddings must be pre-computed via `/advisor-index`

---

## Roadmap

- [ ] Semi-automatic pipeline execution with context passing between steps
- [ ] Dynamic graph weights based on usage telemetry
- [ ] Richer skill cards with workflow examples and token estimates
- [ ] Plugin marketplace publishing (public access)

---

## License

MIT

---

<p align="center">
  <img src="assets/fx-studio-ai-logo.jpg" alt="FX Studio AI" width="36" height="36" style="border-radius: 50%;" />
  <br />
  <strong>Built by <a href="https://github.com/fernandoxavier02">Fernando Xavier</a></strong>
  <br />
  <a href="https://github.com/fernandoxavier02">FX Studio AI</a>
</p>
