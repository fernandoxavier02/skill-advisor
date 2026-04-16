<p align="center">
  <img src="assets/logo.png" alt="Skill Advisor" width="120" height="120" style="border-radius: 50%;" />
</p>

<h1 align="center">Skill Advisor</h1>

<p align="center">
  <strong>The AI that learns which AI tools to use</strong>
</p>

<p align="center">
  <a href="#installation"><img src="https://img.shields.io/badge/platform-Claude_Code-7C3AED?style=flat-square" alt="Platform" /></a>
  <img src="https://img.shields.io/badge/version-2.0.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/skills_indexed-344-brightgreen?style=flat-square" alt="Skills Indexed" />
  <img src="https://img.shields.io/badge/tests-424_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square" alt="Node" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

<p align="center">
  You have 200+ skills installed. You use 10. Skill Advisor finds the other 190.
</p>

---

## What it does

Skill Advisor is a **Claude Code plugin** that watches how you work, learns what tools help, and recommends the right combination for any task.

```
You type:  "quero corrigir um bug no login"

Advisor:   [Advisor] Considere /advisor -- detectei relevancia com:
           /investigate (87%), /fix (74%), /review (68%)

           [Advisor] Voce sabia? /cso tem alta relevancia mas nunca
           foi usado. Experimente!

           [Advisor] Pipeline anterior: investigate -> fix -> review
           (usado 5x). Rode /advisor para replay.
```

Three lines. Zero configuration. It knew your branch is `fix/`, found your debugging tools, suggested one you never tried, and remembered your usual sequence.

---

## How it works

```
                         YOUR PROMPT
                             |
                    +--------v--------+
                    |  advisor-nudge  |  <50ms, runs on every prompt
                    |    (hook)       |
                    +--------+--------+
                             |
              +--------------+--------------+
              |              |              |
        +-----v-----+  +----v----+  +------v------+
        |  Semantic  |  | Keyword |  |   Graph     |
        |  Search    |  | Match   |  |   BFS       |
        | (50% wt)   |  | (30% wt)|  |  (20% wt)  |
        +-----+------+  +----+----+  +------+------+
              |              |              |
              +--------------+--------------+
                             |
                    +--------v--------+
                    |  Signal Fusion  |  weighted average
                    +--------+--------+
                             |
              +--------------+--------------+
              |              |              |
        +-----v-----+  +----v----+  +------v------+
        | Affinity   |  | Context |  | Discovery   |
        | Boost      |  | Boost   |  | Nudge       |
        | (from      |  | (branch |  | (unused     |
        |  history)  |  |  type)  |  |  skills)    |
        +-----+------+  +----+----+  +------+------+
              |              |              |
              +--------------+--------------+
                             |
                    +--------v--------+
                    |   OUTPUT        |
                    | skill matches + |
                    | discovery nudge |
                    | + replay hint   |
                    +-----------------+
```

**Three search layers** find relevant skills. **Three boost layers** personalize the results. All local, all <50ms.

---

## Key Features

### It learns from you (v2.0)

Every time you run `/advisor-feedback`, the system records what worked and what didn't. Over time:

- Skills you rate highly get boosted
- Skills you mark as unhelpful get demoted
- Skill sequences you repeat become replay suggestions
- Skills you've never tried but match your patterns get surfaced

### It understands context

| Signal | What it does |
|--------|-------------|
| Branch name | `fix/` boosts debugging skills, `feat/` boosts implementation |
| Execution history | Skills you use often rank higher |
| Skill combos | `investigate -> fix -> review` repeated 3x? It remembers |
| Unused skills | High relevance + never used = discovery nudge |

### It detects duplicates

When you run `/advisor-index`, it finds near-identical skills across plugins:

```
global:Hook Development          plugin:plugin-dev:hook-development    99.7%
global:MCP Integration           plugin:plugin-dev:mcp-integration     99.8%
```

Helps you clean up redundant installations.

### Bilingual (PT-BR / EN)

50+ synonym mappings bridge Portuguese and English:

```
"auditar seguranca"          -> audit, review, security
"corrigir bug no login"      -> fix, debug, bug, auth, login
```

---

## Installation

### Option 1: GitHub (recommended)

```bash
# Clone the repo
git clone https://github.com/fernandoxavier02/skill-advisor.git

# Copy to Claude Code plugins directory
mkdir -p ~/.claude/plugins/local/
cp -r skill-advisor ~/.claude/plugins/local/

# Install build dependency (one-time, for semantic embeddings)
cd ~/.claude/plugins/local/skill-advisor
npm install
```

Then restart Claude Code or run `/reload-plugins`.

### Option 2: Manual install

1. Download from [Releases](https://github.com/fernandoxavier02/skill-advisor/releases)
2. Extract to `~/.claude/plugins/local/skill-advisor/`
3. Run `npm install` in that directory
4. Restart Claude Code

### First-time setup

After installation, run these two commands in Claude Code:

```
/advisor-index      # Scans all your skills/plugins/MCPs, builds the search index
                    # First run takes ~2 min (downloads 23MB embedding model)

/advisor-catalog    # (Optional) Builds the Obsidian vault knowledge graph
```

### Verify it works

```
/advisor-config status    # Should show: enabled: false, indexed: true

/advisor fix a bug        # Should return a loadout with debugging skills
```

---

## Commands

| Command | What it does |
|---------|-------------|
| `/advisor <task>` | Recommend the best skill combination for a task |
| `/advisor --template bugfix` | Load a saved workflow template |
| `/advisor-index` | Rebuild search index + semantic embeddings + v2 data pipeline |
| `/advisor-catalog` | Generate Obsidian vault knowledge graph |
| `/advisor-stats` | Show usage analytics + skill heat map (7d/30d/90d) |
| `/advisor-feedback` | Record what worked/didn't after a pipeline |
| `/advisor-config enable` | Turn on automatic prompt suggestions |
| `/advisor-config disable` | Turn off suggestions |
| `/advisor-config threshold 0.3` | Adjust suggestion sensitivity (0.0 - 1.0) |

---

## Architecture

```
skill-advisor/
|
+-- hooks/
|   +-- advisor-nudge.cjs          # Real-time hook (<50ms, zero network)
|
+-- commands/                       # 6 slash commands
|   +-- advisor.md                  # Main recommendation engine
|   +-- advisor-index.md            # Index + v2 build pipeline
|   +-- advisor-catalog.md          # Obsidian vault generator
|   +-- advisor-stats.md            # Analytics + heat map
|   +-- advisor-feedback.md         # Feedback collector
|   +-- advisor-config.md           # Configuration
|
+-- agents/
|   +-- advisor-router.md           # Sonnet subagent for task classification
|
+-- lib/                            # 21 modules
|   +-- paths.js                    # Path resolution (D1: ~/.claude/advisor/)
|   +-- constants.js                # Frozen config (8 categories, fusion weights)
|   +-- text.js                     # Tokenizer + PT-BR/EN synonyms
|   +-- jsonl.js                    # Defensive JSONL reader/writer
|   +-- frontmatter.js              # YAML frontmatter parser
|   +-- errors.js                   # Structured error handling
|   +-- schemas.js                  # Data schema validators
|   +-- semantic.js                 # Cosine similarity search
|   +-- graph-search.js             # BFS traversal + scoring
|   +-- context.js                  # Branch -> category mapping
|   +-- build-index.js              # Skill/plugin/MCP scanner
|   +-- build-embeddings.js         # 384-dim vectors (transformers.js)
|   +-- build-graph.js              # Vault -> adjacency graph
|   +-- build-catalog.js            # Plugin source scanner
|   +-- build-affinity.js           # Feedback + telemetry -> scores
|   +-- build-combos.js             # Sequence pattern discovery
|   +-- build-discovery.js          # Unused skill candidates
|   +-- build-replay.js             # Replay candidates
|   +-- build-collisions.js         # Duplicate skill detection
|   +-- build-hook-data.js          # Bundle for hook consumption
|   +-- advisor-stats.js            # Analytics computation
|
+-- vault-skills/                   # 348 Obsidian skill cards
+-- vault-concepts/                 # 45 concept nodes
+-- vault-pipelines/                # 8 pipeline templates
+-- vault-graph/                    # adjacency.json (401 nodes, 2803 edges)
|
+-- tests/                          # 424 tests, 0 failures
|   +-- fixtures/                   # Deterministic test data
|
+-- ~/.claude/advisor/              # User data (survives reinstalls)
    +-- feedback.jsonl              # User feedback
    +-- telemetry.jsonl             # Session telemetry
    +-- cache/                      # Pre-computed data
        +-- advisor-affinity.json
        +-- advisor-combos.json
        +-- advisor-discovery.json
        +-- advisor-collisions.json
        +-- advisor-hook-data.json
        +-- advisor-replay-candidate.json
```

### Data flow

```
  SOURCES                    BUILD PIPELINE              RUNTIME
  (your plugins)             (on /advisor-index)         (on every prompt)

  ~/.claude/skills/    -+
  ~/.claude/plugins/    |-> build-index ---------> advisor-index-lite.json -+
  .mcp.json files      |                                                   |
                       -+-> build-embeddings ----> advisor-embeddings.json -+
                                                                           |
                            build-collisions ----> advisor-collisions.json |
                                                                           |
  feedback.jsonl --------> build-affinity -------> advisor-affinity.json --+
  telemetry.jsonl -------> build-combos ---------> advisor-combos.json    |
                        +-> build-discovery -----> advisor-discovery.json -+
                        +-> build-replay --------> advisor-replay.json   -+
                                                                          |
                            build-hook-data ------> advisor-hook-data.json
                                                          |
                                                          v
                                                   advisor-nudge.cjs
                                                   (hook, <50ms)
```

---

## Configuration

### Hook sensitivity

| Threshold | Behavior |
|-----------|----------|
| `0.15` | Very sensitive -- suggests often |
| `0.20` | **Default** -- balanced |
| `0.35` | Conservative -- strong matches only |
| `0.50` | Minimal -- near-exact matches only |

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ADVISOR_ENABLED` | (config file) | Override hook on/off |
| `ADVISOR_THRESHOLD` | `0.20` | Override suggestion threshold |
| `ADVISOR_BRANCH` | (auto) | Override branch name for context |
| `ADVISOR_DEBUG` | off | Enable debug logging to stderr |

---

## Performance

| Metric | Target | Actual |
|--------|--------|--------|
| Hook latency | <50ms | ~20-35ms |
| Lite index size | <100KB | 96.9KB |
| Semantic search | <20ms | ~15ms |
| Graph BFS | <10ms | ~5ms |
| Network calls at runtime | 0 | 0 |
| Runtime dependencies | 0 | 0 |
| Tests | -- | 424 pass, 0 fail |

---

## Privacy

- **Everything runs locally.** No network calls at runtime, ever.
- Embedding model downloaded once (~23MB), cached locally.
- Your feedback and telemetry stay in `~/.claude/advisor/` on your machine.
- No data leaves your computer.

---

## Dependencies

| Package | When | Purpose |
|---------|------|---------|
| `@huggingface/transformers` | Build-time only | Generate 384-dim embeddings |
| Node.js >= 18 | Runtime | Built-in test runner, ES features |

Zero runtime dependencies. The hook and all commands run on pure Node.js.

---

## Contributing

```bash
git clone https://github.com/fernandoxavier02/skill-advisor.git
cd skill-advisor
npm install
npm test                    # 424 tests must pass
```

1. Create a feature branch (`git checkout -b feat/my-feature`)
2. Write tests first (TDD -- `node --test`)
3. Run `npm test` -- all 424+ must pass
4. Commit with conventional messages
5. Open a Pull Request

---

## See also — FX-Studio-AI suite

skill-advisor is one of three plugins in the **FX-Studio-AI marketplace**. They form a coherent workflow:

1. **[cc-toolkit](https://github.com/fernandoxavier02/cc-mastery)** — onboarding and diagnostics. Get your Claude Code setup in order.
2. **skill-advisor** (this repo) — discovery and routing. Use the tools you already have, effectively.
3. **[pipeline-orchestrator](https://github.com/fernandoxavier02/Pipeline-Orchestrator)** — adversarial review. Ship production code safely.

Install the marketplace once, use any combination.

---

## License

MIT

---

<p align="center">
  <strong>Built by <a href="https://github.com/fernandoxavier02">Fernando Xavier</a></strong>
  <br />
  <a href="https://fxstudioai.com">FX Studio AI</a>
</p>
