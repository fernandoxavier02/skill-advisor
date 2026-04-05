# Skill Advisor v2.0 — Intelligent Cross-Plugin Orchestration Platform

## Status: APPROVED
## Date: 2026-04-05
## Author: Fernando Xavier + Claude (brainstorm session)

---

## 1. Vision

Transform Skill Advisor from a recommendation engine with manual execution into a **meta-orchestrator** that composes and executes skills from ANY installed plugin, guided by a semantic knowledge graph.

The advisor becomes an expert in the user's entire toolchain — 200+ skills across plugins like SDD, Superpowers, Gstack, Pipeline Orchestrator, Reflexion, TDD, Git, and platform-specific plugins (Stripe, Supabase, Notion, etc). It knows which skills to combine, in what order, with what prompts, and executes them automatically.

---

## 2. Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Executor location | **Inside skill-advisor** | Self-contained, no cross-plugin coupling |
| Evolution strategy | **Refactoring first, features after** | Solid base prevents cascading debt |
| Execution autonomy | **Hybrid configurable** (`--auto` / `--gated` default) | User chooses full bypass or per-phase approval |
| Number of agents | **6** (router, clarifier, planner, executor, monitor, documenter) | Specialized agents produce better output |
| Skill invocation | **Sub-agent via Agent tool + Skill tool** | Isolates context, enables parallel execution |
| autoDiscover | **false** | Invoked only via `/advisor` command |
| Hook nudge | **Disabled by default**, opt-in via `/advisor-config enable` | Zero noise, user controls |
| Output style | **Mixed** — box-drawing for compact, markdown for reports | Best of both worlds |
| Pipeline documentation | **Living spec document** — generated before, updated during, report after | Full traceability |
| Embeddings | **Pluggable adapter** — default local MiniLM, auto-detect API keys, any OpenAI-compatible endpoint | User chooses quality/cost tradeoff |
| Semantic graph | **Hybrid edges** — strong (>0.8) materialized at build-time, weak (0.5-0.8) discovered at query-time | Speed + discovery |
| Indexing mode | **Manual default**, architecture prepared for lazy/auto modes | Simple now, extensible later |
| Deep analysis model | **Sonnet** | Quality at indexer level prevents cascading quality loss |
| Execution memory | **JSONL + vault notes** | Structured data for code, graph-integrated notes for Obsidian |
| Skill spec format | **Each skill uses its own format** — advisor pipeline spec is a meta-document (orchestration envelope) | Respects each plugin's workflow |
| Embedding provider swap | **Auto re-embed on provider change** — `_meta` validation prevents cross-model contamination | Different models produce incompatible vectors |
| Development methodology | **SDD + TDD** | Specs first, tests first, implementation last |

---

## 3. The 6 Agents

### 3.1 advisor-router (existing, evolve)
- **Model:** Sonnet
- **Input:** Task description + top 15-20 skills from graph search
- **Output:** JSON loadout with ranked skills, context mapping, complexity classification
- **Change:** Receives richer vault cards v2, consults execution memory for proven combinations

### 3.2 advisor-clarifier (new)
- **Model:** Sonnet
- **Input:** Loadout + original task
- **Output:** Complete brief with zero ambiguities
- **Behavior:** Asks questions one at a time until all gaps resolved. Blocks pipeline until complete.

### 3.3 advisor-planner (new)
- **Model:** Sonnet
- **Input:** Brief + loadout + vault cards of selected skills
- **Output:** Pipeline spec document (`.specs/pipelines/<name>.md`)
- **Behavior:** Decomposes loadout into ordered phases. Generates specific prompt for each skill. Defines gates and success criteria.

### 3.4 advisor-executor (new)
- **Model:** Sonnet
- **Input:** Pipeline spec document
- **Output:** Execution results per phase
- **Behavior:** Spawns disposable sub-agents that invoke skills via Skill tool. Resolves `{phase_N.result}` context references. Manages `--auto` vs `--gated` modes.

### 3.5 advisor-monitor (new)
- **Model:** Haiku
- **Input:** Skill output + vault card contract (declared inputs/outputs)
- **Output:** Gate decision (pass/fail/retry/escalate)
- **Behavior:** Validates outputs against declared contracts. In `--auto` mode, decides gates. In `--gated` mode, presents results and defers to user.

### 3.6 advisor-documenter (new)
- **Model:** Haiku
- **Input:** Completed phase + gate decision
- **Output:** Updated pipeline spec document
- **Behavior:** Updates the living document after each phase: what ran, output produced, gate decisions, timing. Generates final summary.

### Agent Flow

```
router ──→ clarifier ──→ planner ──→ [pipeline spec document]
                                          │
                                          ▼
                                    ┌─ executor ─┐
                                    │     │       │
                                    │     ▼       │
                                    │  sub-agent  │──→ monitor ──→ gate decision
                                    │  (Skill X)  │         │
                                    │             │         ▼
                                    │             │    documenter
                                    │             │    (updates spec)
                                    │             │
                                    │  next       │◄── if pass: next phase
                                    │  phase...   │◄── if fail: retry or abort
                                    └─────────────┘
```

---

## 4. Vault Schema v2 — Enriched Skill Cards

### Template

```yaml
---
# Identity
aliases: [investigate, investigar, depurar, debug-root-cause]
type: skill
source: superpowers
plugin: superpowers
invocation: /investigate
category: debugging

# I/O Contract
inputs:
  - error_description
  - failing_test_or_log
  - reproduction_steps
outputs:
  - root_cause_diagnosis
  - affected_files
  - fix_hypothesis

# Behavior
workflow_steps: 4
workflow_summary: "gather evidence -> analyze patterns -> form hypothesis -> verify"
requires_user_input: true
spawns_subagents: false
modifies_files: false
destructive: false
autonomy: gated

# Composition (explicit pipeline edges)
works_well_with:
  - "[[fix]]"
  - "[[tdd-fix-tests]]"
  - "[[root-cause-tracing]]"
often_precedes:
  - "[[fix]]"
  - "[[implement]]"
often_follows:
  - "[[brainstorming]]"
  - "[[plan]]"
incompatible_with:
  - "[[ship]]"

# Cost
estimated_minutes: 10
estimated_tokens: 5000
complexity: medium
---
```

### New Fields Purpose

| Field | Used by | Purpose |
|-------|---------|---------|
| `works_well_with` | router | Cross-plugin composition |
| `often_precedes/follows` | planner | Phase ordering |
| `requires_user_input` | executor/gate | Know when to pause |
| `workflow_summary` | planner | Understand internal flow |
| `modifies_files/destructive` | monitor | Risk assessment |
| `inputs/outputs` | monitor | Contract validation |
| `complexity` | router | Match to task complexity |
| `autonomy` | executor | `auto` or `gated` per skill |

---

## 5. Three Types of Graph Edges

### Explicit (wikilinks in markdown)
```
investigate ──works_well_with──→ fix
investigate ──often_precedes──→ implement
investigate ──concept──→ debugging
```

### Semantic Strong (similarity >0.8, build-time)
```
investigate ──0.87──→ root-cause-tracing
investigate ──0.83──→ systematic-debugging
```

### Semantic Weak (0.5-0.8, query-time discovery)
```
investigate ──0.72──→ office-hours
investigate ──0.65──→ security-audit
```

---

## 6. Embedding Adapter Architecture

### Interface
```
embed(text: string) → float[]
```

### Auto-configuration
1. **Zero config** — local MiniLM works out of box
2. **Auto-detect** — if `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `COHERE_API_KEY` found in environment, offer upgrade
3. **Custom endpoint** — any OpenAI-compatible API (`/advisor-config embeddings url <url>`)

### Provider Swap Safety
- `advisor-embeddings.json` includes `_meta` with provider, model, dimensions, timestamp
- On provider mismatch: block search, require `/advisor-index` re-embed
- Re-embed is automatic when user changes provider via `/advisor-config`

### Setup Wizard (first run)
```
1. Auto-detect API key → offer upgrade (yes/no)
2. Enable hook nudge? (yes/no)
3. Configure custom embedding model? (yes/no)
   → If yes: guided step-by-step (provider, model, API key/URL)
```

### Config
```json
{
  "embeddings": {
    "provider": "local",
    "model": "minilm-l6",
    "dimensions": 384
  },
  "indexing": {
    "mode": "manual",
    "deep_analysis_model": "sonnet",
    "semantic_edge_threshold": 0.8,
    "weak_edge_threshold": 0.5
  }
}
```

---

## 7. Pipeline Spec Document — The Living Document

### Lifecycle
```
PLANNED → CLARIFIED → EXECUTING (phase N/M) → COMPLETED | PARTIAL | FAILED
```

### Template Structure
```markdown
---
pipeline_id: <task>-<date>-<time>
task: "description"
status: PLANNED
mode: gated | auto
created_at: ISO8601
updated_at: ISO8601
total_phases: N
completed_phases: 0
estimated_minutes: N
estimated_tokens: N
---

# Pipeline: <Title>

## Original Context
> User's request

## Clarification
| # | Question | Answer |
|---|----------|--------|

## Phases

### Phase N: <Name>
| Field | Value |
|-------|-------|
| Skill | /skill-name |
| Plugin | plugin-name |
| Prompt | "Complete prompt with {phase_N.result} references" |
| Depends on | Phase N-1 |
| Gate | success criteria |
| Status | PENDING |

**Result:** _(filled by documenter)_
**Gate Decision:** _(filled by monitor)_

## Execution Summary
| Phase | Skill | Status | Duration | Tokens |
```

### Key Properties
1. Each phase has the **complete prompt** — executor doesn't invent
2. **Context chaining** — `{phase_N.result}` resolved by executor before invocation
3. **Explicit gates** — monitor knows exactly what to validate
4. **Inline results** — documenter inserts output, transforming spec into report

---

## 8. Execution Memory

### JSONL Store (`lib/advisor-memory.jsonl`)
```json
{
  "ts": "2026-04-05T...",
  "task_type": "payment-integration",
  "loadout": ["stripe", "security-audit", "tdd"],
  "phases_completed": 5,
  "phases_total": 5,
  "score": 9,
  "user_feedback": "excellent",
  "duration_minutes": 32
}
```

### Vault Execution Notes
One note per execution in `vault-pipelines/executions/`, with `[[backlinks]]` to skills used. Integrates into the semantic graph — successful executions reinforce edges.

### Memory-Aware Router
Router queries memory to prioritize combinations with proven track records. Skills with high historical scores get a boost in the loadout ranking.

---

## 9. Indexation Pipeline

```
/advisor-index
  1. SCAN      — detect skills/plugins/MCPs in filesystem (existing)
  2. DIFF      — compare mtime/hash against current index (new)
  3. DEEP      — Sonnet reads full .md, extracts schema v2 (new)
  4. EMBED     — generate vectors via adapter (evolved)
  5. LINK      — pairwise similarity, materialize edges >0.8 (new)
  6. GRAPH     — merge wikilinks + semantic edges (evolved)
  7. REPORT    — new, updated, orphans, edges added (new)
```

---

## 10. Implementation Roadmap

### Phase 0 — Refactoring (prerequisite)
- 0.1: Unify `parseFrontmatter` into `lib/frontmatter.js`
- 0.2: Centralize constants in `lib/constants.js`
- 0.3: Extract `lib/text.js` (tokenize, accents, stopwords, synonyms)
- 0.4: Structured error handling with `ADVISOR_DEBUG`
- 0.5: JSDoc schemas in `lib/schemas.js`
- 0.6: Tests for graph-search, semantic, build-catalog
- 0.7: `autoDiscover: false` + hook disabled by default

### Phase 1 — Embedding Adapter + Semantic Network
- 1.1-1.3: Adapter with local + OpenAI-compatible providers
- 1.4-1.5: `_meta` validation + auto re-embed on provider swap
- 1.6-1.7: Materialized strong edges + query-time weak edges
- 1.8: Setup wizard

### Phase 2 — Vault Schema v2 + Deep Indexer
- 2.1: Skill card v2 template
- 2.2: Deep analysis agent (Sonnet)
- 2.3: Diff detection (mtime/hash)
- 2.4: Complete indexation pipeline
- 2.5: Reindex existing 348 skills
- 2.6: Indexation config

### Phase 3 — The 6 Agents
- 3.1: Evolve advisor-router
- 3.2: Create advisor-clarifier
- 3.3: Create advisor-planner
- 3.4: Create advisor-executor
- 3.5: Create advisor-monitor
- 3.6: Create advisor-documenter

### Phase 4 — Orchestrated Execution
- 4.1: Rewrite `/advisor` command
- 4.2: `--gated` mode (default)
- 4.3: `--auto` mode
- 4.4: Context chaining (`{phase_N.result}`)
- 4.5: Mixed visual output
- 4.6: Living pipeline spec document

### Phase 5 — Memory + Feedback Loop
- 5.1: Execution memory JSONL
- 5.2: Vault execution notes
- 5.3: Memory-aware router
- 5.4: Evolved `/advisor-feedback`

---

## 11. Cross-Plugin Composition Examples

### Example 1: "Add rate limiting with tests"
```
Phase 1: /investigate (superpowers) — analyze current architecture
Phase 2: /tdd:test-driven-development (tdd) — write failing tests
Phase 3: /sdd:implement (context-engineering-kit) — implement
Phase 4: /reflexion:critique (context-engineering-kit) — adversarial review
Phase 5: /git:commit (git) — commit changes
```

### Example 2: "Build new payment feature"
```
Phase 1: /sdd:brainstorm (context-engineering-kit) — refine idea
Phase 2: /pipeline:adversarial-review (pipeline-orchestrator) — challenge design
Phase 3: /superpowers:brainstorming (superpowers) — analyze results
Phase 4: /office-hours (gstack) — product validation
Phase 5: /sdd:add-task + /sdd:plan (context-engineering-kit) — spec
Phase 6: /pipeline:executor (pipeline-orchestrator) — execute plan
Phase 7: /reflexion:critique (context-engineering-kit) — final review
```

### Example 3: "Fix Stripe checkout on Supabase backend"
```
Phase 1: /investigate (superpowers) — diagnose
Phase 2: /stripe (stripe plugin) — check integration
Phase 3: /supabase (supabase plugin) — verify functions
Phase 4: /security-audit (cso) — payment security
Phase 5: /tdd:fix-tests (tdd) — fix and verify
Phase 6: /browse (gstack) — QA in browser
```

---

## 12. Development Methodology

- **SDD (Specification-Driven Development):** Design spec (this document) → task files → implementation
- **TDD (Test-Driven Development):** Write failing tests FIRST for each module → implement until green → refactor

Every phase starts with tests that define the expected behavior. Implementation follows to make tests pass. No code without a failing test first.
