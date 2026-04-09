# Smart Advisor v2.0 — Implementation Handoff

## Status

- Branch: `fix/audit-paths-dedup`
- Phase 0 (Refactoring): **COMPLETE** (6/7 items done, 0.7 autoDiscover toggle pending)
- CEO Review: **PASSED** (9/10 adversarial score, 3 rounds, 26 issues fixed)
- Pipeline completed: `/office-hours` -> `/grill-me` -> `/plan-ceo-review`
- Next step: `/plan-eng-review` (architecture lockdown)

## Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Design Doc (office-hours) | `~/.gstack/projects/fernandoxavier02-skill-advisor/ferna-fix-audit-paths-dedup-design-20260408-220000.md` | Problem statement, demand evidence, 7 features, chosen approach |
| CEO Plan (ceo-review) | `~/.gstack/projects/fernandoxavier02-skill-advisor/ceo-plans/2026-04-08-smart-advisor-v2.md` | Expanded scope (12 features), sub-decisions, constraints, reviewer concerns |
| V2 Design Spec | `.specs/plans/skill-advisor-v2-orchestration-platform.design.md` | Original v2 orchestration platform spec (broader vision, 6 agents) |

## 12 Features (Final Scope)

| # | Feature | Priority | Effort | Depends On | Status |
|---|---------|----------|--------|------------|--------|
| F1 | Feedback Loop (affinity scores) | HIGH | M | existing telemetry | TODO |
| F1.3 | "Why this?" Explainer | HIGH | S | F1 | TODO |
| F1.4 | Skill Discovery Nudge | HIGH | S | F1 | TODO |
| F2 | Context-Aware Scoring | HIGH | M | F1 | TODO |
| F3 | Combo Discovery | MEDIUM | M | F1 | TODO |
| F3.2 | Pipeline Replay | MEDIUM | S | F3.1 | TODO |
| F7 | Workflow Templates | MEDIUM | S | F3 | TODO |
| F6 | Session Analytics | MEDIUM | M | F1 | TODO |
| F6.2 | Affinity Heat Map | MEDIUM | S | F6 | TODO |
| F4 | User Profile | MEDIUM | S | F1+F3 | TODO |
| F5 | Obsidian Vault Enriched | LOW | M | F1 | TODO |
| F8 | Collision Detection | LOW | S | semantic.js | TODO |

**Sequence:** F1 -> F1.3 -> F1.4 -> F2 -> F3 -> F3.2 -> F7 -> F6 -> F6.2 -> F4 -> F5 -> F8

## Key Decisions (Grill-Me + CEO Review)

### Technical Decisions
- **F1.1**: Pre-compute affinity scores at build time (`advisor-affinity.json`), not parse JSONL at runtime
- **F1.2**: Canonical storage in `~/.claude/advisor/`
- **F2.1**: Hook uses only branch name + file extensions (git diff/status only in /advisor command)
- **F2.2**: Branch mapping hardcoded: `fix->debug, feat->impl, chore->utility, release->deploy`
- **F2.3**: Unmatched branch patterns fall back to `general` category (no category boost)
- **F3.1**: Enrich `/advisor-feedback` with `executed_sequence` field
- **F6.1**: 90-day rolling retention
- **F7.1**: Syntax: `/advisor --template bugfix` (explicit flag)

### Expansion Decisions (CEO Review)
- **F1.3**: "Why this?" explainer — in `/advisor` output only, not hook. Fields: skill name, score, contributing layer, top terms, context boost
- **F1.4**: Discovery nudge — trigger when `affinityScore > 0.6 AND usageCount == 0`. Max 1 per 30-min window. Pre-computed `advisor-discovery.json` (max 10 entries). Pruned at `/advisor-index` time
- **F3.2**: Pipeline Replay — branch prefix exact match + 50% file extension overlap. Pre-computed `advisor-replay-candidate.json`. Always requires user confirmation
- **F6.2**: Heat map — markdown table in `/advisor-stats`. Trend: `up` if 7d > 30d/4, `down` if 7d==0 AND 30d>0, else `flat`. Vault write only if `vault-pipelines/` exists
- **F8**: Collision detection — cosine_similarity > 0.85, reuses `advisor-embeddings.json`. Warnings-only in v2 (config subcommand deferred)

### Code Quality Decisions
- Extract `lib/jsonl.js` with `readJSONL(path)` and `writeJSON(path, data)` (DRY for 4+ build modules)
- Rename `collision-detect.js` to `build-collisions.js` (follows `build-*` naming convention)

## Constraints

- **Hook budget: <50ms** — `advisor-nudge.cjs` is ephemeral CJS. No async, no model loading, no network
- **Description IS the trigger** — skill routing via `description` field. No separate metadata
- **Zero runtime deps** — only `@huggingface/transformers` at build-time
- **CommonJS** — all `lib/*.js` use `require`/`module.exports`
- **Pre-computed JSON pattern** — each feature = new `build-*.js` module + new JSON output file

## Architecture (V2 additions)

### New Build Modules
```
lib/jsonl.js          — shared JSONL read/write utility (DRY extraction)
lib/build-affinity.js — feedback.jsonl + telemetry.jsonl -> advisor-affinity.json
lib/build-combos.js   — feedback.jsonl (executed_sequence) -> advisor-combos.json
lib/build-discovery.js — affinity.json -> advisor-discovery.json (top 10 unused)
lib/build-replay.js   — combos.json -> advisor-replay-candidate.json
lib/build-collisions.js — embeddings pairwise -> advisor-collisions.json
lib/context.js        — git branch/diff context signals for scoring
```

### New JSON Files (pre-computed at build time)
```
advisor-affinity.json        — [{skillId, affinityScore, usageCount, avgRating, lastUsed}]
advisor-combos.json          — [{branchPrefix, sequence: [skillId], count, fileTypes}]
advisor-discovery.json       — [{skillId, affinityScore, name, invocation}] (max 10)
advisor-discovery-seen.json  — {lastNudgeTs: ISO8601, seen: {skillId: lastSeenTs}}
advisor-replay-candidate.json — [{branchPrefix, sequence, fileTypes, count}]
advisor-collisions.json      — [[skillId1, skillId2, similarity]]
```

### Hook Changes (advisor-nudge.cjs)
- Read 4 new files (affinity, discovery, discovery-seen, replay-candidate)
- Apply affinity boost to scoring
- Branch-name context boost (F2)
- Discovery nudge logic (F1.4) with 30-min session cap
- Replay hint (F3.2) one-liner

### New Commands
- `/advisor-stats` (F6) — session analytics + heat map (F6.2)

### Enhanced Commands
- `/advisor` — score explainer (F1.3), `--template` flag (F7), combo suggestions (F3)
- `/advisor-feedback` — `executed_sequence` field (F3.1)
- `/advisor-index` — runs new build modules, collision detection warnings (F8)

## Tests Needed

8 new test files (TDD: write failing tests first):
1. `tests/jsonl.test.js` — readJSONL, writeJSON, error handling
2. `tests/build-affinity.test.js` — affinity computation, cold start, malformed input
3. `tests/build-combos.test.js` — combo extraction, min threshold (3), sequence dedup
4. `tests/build-discovery.test.js` — candidate filtering, ranking, max 10
5. `tests/build-replay.test.js` — candidate generation, branch matching
6. `tests/build-collisions.test.js` — pairwise similarity, threshold, grouping
7. `tests/context.test.js` — branch mapping, fallback, file extension extraction
8. `tests/advisor-stats.test.js` — analytics aggregation, heat map, 90d rolling

## Reviewer Concerns (minor, resolve during implementation)

1. F3.2 tie-breaker when multiple replay candidates match same branch prefix (use most recent)
2. `lastNudgeTs` in `advisor-discovery-seen.json` is top-level field, not per-skill
3. F7 Workflow Templates needs fuller spec before implementation (schema, storage, output)
4. F3.2 hook hint needs branch name — use `git rev-parse` or env var within 50ms budget

## Deferred Items (TODOS.md)

- Onboarding Flow: guided 5-min tour for cold start (blocked by: F1+F2 maturity)
- Export/Import Affinity Profiles: portability (blocked by: F1+F3+F4 data)
- Zero-Command Auto-Activation: risk too high without proven accuracy
- Time-of-day scoring signal: speculative, no evidence of predictive value
- F8 config subcommand (`/advisor-config default`): deferred, F8 v2 is warnings-only

## Pending from Phase 0

- Task 0.7: Change `autoDiscover` from `true` to `false` in `.claude-plugin/plugin.json`
  (hook already respects disabled-by-default config, just the manifest flag remains)

---

## Prompt Inicial para Amanha

```
Continuar a implementacao do Skill Advisor v2.0 (Smart Advisor).

Contexto: O pipeline de planejamento esta completo:
1. /office-hours — design doc APROVADO
2. /grill-me — 9 decisoes tecnicas resolvidas
3. /plan-ceo-review — PASSED (9/10, SCOPE EXPANSION, 12 features)

O documento de handoff com todas as decisoes esta em:
docs/SMART-ADVISOR-V2-HANDOFF.md

O CEO plan detalhado esta em:
~/.gstack/projects/fernandoxavier02-skill-advisor/ceo-plans/2026-04-08-smart-advisor-v2.md

Faltam 2 opcoes de proximo passo:

OPCAO A: Rodar /plan-eng-review para travar a arquitetura com rigor de engenharia
(testes, edge cases, performance bounds). Recomendado antes de implementar.

OPCAO B: Ir direto para implementacao, comecando por F1 (Feedback Loop):
1. Criar lib/jsonl.js (utility DRY para read/write JSONL+JSON)
2. Criar lib/build-affinity.js (feedback.jsonl + telemetry -> advisor-affinity.json)
3. Integrar affinity boost no scoring do advisor-nudge.cjs e advisor-router.md
4. TDD: testes primeiro para cada modulo

Tambem pendente: finalizar Task 0.7 (autoDiscover: false no plugin.json).

Qual opcao preferir?
```
