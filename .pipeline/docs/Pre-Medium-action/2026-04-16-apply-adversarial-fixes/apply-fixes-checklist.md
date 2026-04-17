# Apply Adversarial Fixes — Checklist

**Pipeline:** bugfix-light (MEDIA)
**Source review:** `.pipeline/docs/review-only/2026-04-16-advisor-gate-delegation/final-adversarial-report.md`
**Total findings addressed:** 23 → 11 prioritized recommendations (R-1 to R-11)
**Batches:** 3 (2-3 fixes each + adversarial review)

---

## Batch 1 — CRITICAL + HIGH (SSOT + security)

- [x] **R-1 (CRITICAL)** — Sanitization contract for user inputs interpolated into subagent prompt
  - `commands/advisor.md:154-182` (Agent spawn block) → new Section 6.1 with 5-rule escaping contract
  - `commands/advisor.md:49-58` (git/ls context — cross-link to CLAUDE.md:71 sanitization note) → rule 5 of 6.1
  - Clarify `Agent({...})` is documentation, not literal JS eval → new "PSEUDOCODE" header + BEGIN/END markers
- [x] **R-2 (HIGH)** — Consolidate `decision → action` mapping into ONE authoritative table
  - Added "Decision Routing Contract (SSOT)" table after Step 6
  - Removed `"cancel"` from Step 9 enum (kept `"cancelled"`)
  - Added `"gate_error"` and `"cooldown_update_failed"` to Step 10 checkpoint list
  - Renamed `cancelled_moment2` → `moment2_back_out` (preview of R-11)
- [x] **R-3 (HIGH)** — Single SSOT for clarification+planning enforcement
  - `commands/advisor.md` Step 3b marked as "SSOT — enforcement owner"
  - `agents/advisor-gate.md` Rule 10 → "non-destructive cross-check only"; never mutates loadout
  - Step 0 template path now runs Step 3b validation before dry-run
- [x] **R-4 (HIGH)** — Update `CLAUDE.md` to reflect advisor-gate subagent
  - Command-path diagram extended with gate subagent step + routing branches
  - Agents listing now includes `advisor-gate.md`
  - Added prompt-injection surface callout linking to `commands/advisor.md` Section 6.1
- [x] **Batch 1 — Adversarial review** (security + architecture, parallel) — 15 findings returned
- [x] **Batch 1 — Fix pass 1** (endereçando HIGH findings do review antes de fechar batch):
  - [x] SEC-3/ARCH-1: orphan `cancelled_moment2` (linha 302 do advisor.md) → removido, lista sincronizada com enum SSOT
  - [x] SEC-1: cross-ref CLAUDE.md:71 errada (linha 79 real + escopo limitado a invocation fields) → substituída por referência por seção nomeada com escopo correto
  - [x] SEC-2: downstream escaping gap (gate re-interpola em sub-spawns sem re-escape) → adicionado contrato explícito no advisor.md 6.1 ("Downstream escaping obligation") + nova Rule 12 em advisor-gate.md
  - [x] SEC-8: cross-field backtick concatenação → nova regra 6 em 6.1 (pass adicional sobre prompt assembled)
  - [x] SEC-5/ARCH-4: Decision Routing Contract com gaps (approve+null, cancel+non-null) → adicionadas 2 rows explícitas na tabela; footnote prose eliminada
- [x] **Batch 1 — Sync cache** (SSOT → `~/.claude/plugins/cache/.../0.3.0/`): 3/3 files verified (re-synced after fix-pass 1)
- Findings MEDIUM/LOW adiados para Batch 2/3 (conforme natureza):
  - SEC-4 (pseudocode block may be materialized): endereço parcial via "PSEUDOCODE" header; tratamento completo (tabela em vez de code fence) vai para Batch 3 se necessário
  - SEC-6 (loadout_json truncation produces invalid JSON): vai para Batch 2 como extensão de R-6
  - ARCH-2 (skill name lists distribuídas): vai para Batch 3 como polish
  - ARCH-5 (SRP de Step 6): rejeitado — as duas subseções 6.1/6.2 são naturalmente agrupadas sob "gate delegation"; split seria over-engineering
  - ARCH-7 (moment2_back_out na enum "live"): aceito o risco — marcado como "reserved" na tabela; enum mantém consistência
  - RISK-1/ARCH-6 (line-number coupling entre docs): endereço parcial via §-name ref; enforcement completa requer convention change fora de escopo

## Batch 2 — MEDIUM hardening

- [x] **R-5 (MEDIUM)** — Retry cap on Step 7 re-spawn logic
  - `commands/advisor.md` — new "Re-spawn Retry Policy (SSOT)" section with `gate_respawn_count` (max 2) and `last_error` hint field
- [x] **R-6 (MEDIUM)** — Extend Step 7 pre-check
  - Pre-check expanded from 4 to 8 items
  - Added: 5 (gate_invocation_id presence), 6 (iterations counter structure), 7 (spec_path non-null when moment2≠skip), 8 (loadout invocations match index — defense-in-depth)
- [x] **R-7 (MEDIUM)** — Remove `|| true` error silencing
  - `commands/advisor.md` Step 10 — `|| true` removed; capture `NODE_STDERR`, set `COOLDOWN_UPDATE_STATUS` flag, append secondary telemetry line with `action: "cooldown_update_failed"` on failure
- [x] **R-8 (MEDIUM)** — Cap "Other" free-text retries
  - `agents/advisor-gate.md` — new 4-step "Other retry cap" protocol: semantic mapping first (PT/EN keyword match), max 2 retries with same menu, fall through to Option 2 (Cancel) on exhaustion; tracked per Moment (reset between)
- [x] **Batch 2 — Adversarial review** (security + correctness, parallel) — 16 findings, 3 HIGH showstoppers
- [x] **Batch 2 — Fix pass 1** (findings crítcos aplicados antes de fechar batch):
  - [x] CORR-01 SHOWSTOPPER: pre-check 5 referenciava `gate_invocation_id` mas gate emite `gate_token` → revertido para `gate_token` com nota sobre R-9 pendente no batch 3
  - [x] CORR-02 HIGH: `last_error` hint sem handler no gate → novo campo opcional "6. Optional: last_error" no Input do advisor-gate com 4 regras de correção
  - [x] CORR-03 HIGH: Rule 12 bolted-on sem execução nos spawn sites → inline explícito do BEGIN/END wrapping em Option 3 Alterar, Option 4 Sugerir (2 spawns), Moment 2 Option 1 Sim
  - [x] SEC-2 HIGH: `last_error` flows unescaped → 6.1 escaping obrigatório antes de interpolar, documentado na Re-spawn Retry Policy
  - [x] SEC-4 HIGH: shell injection via `$SEEN_FILE` dentro de `node -e` → path agora passado via env var `SEEN_FILE_PATH` lido com `process.env`
  - [x] SEC-7/CORR-07 HIGH: "Other" mapping aceitava negações → novo protocolo 6-step com negation short-circuit (step 2), accent-fold + dominance check (step 3), priority Cancel>Approve>Alterar>Sugerir (step 4)
  - [x] SEC-8 HIGH: Other fallback `error` field sem escape → 6.1 escaping obrigatório antes de write
  - [x] SEC-5 MEDIUM: `$SESSION_ID` não sobrevive entre Bash calls → persistido em `$SESSION_ID_FILE` tempfile; Step 10 re-source do arquivo
  - [x] SEC-6 MEDIUM: `NODE_STDERR` não sanitizado → novo `NODE_STDERR_SAFE` com strip ANSI + control chars + cap 200
  - [x] CORR-04 MEDIUM: `moment1_other_fallbacks`/`moment2_other_fallbacks` faltavam no schema → adicionados ao Final Output template
  - [x] CORR-05 MEDIUM: pre-check 8 sem contrato de match → especificado "strict string equality after trimming; case-sensitive; Step-1 snapshot, no re-read"
  - [x] CORR-06 LOW: secondary telemetry schema drift → flag `auxiliary: true` + comentário discriminador
  - [x] CORR-08 LOW: pre-check 7 motivation unclear → re-worded como "Defense-in-depth: catches crashed planning spawn"
  - [x] Adicionado first-attempt hard-stop: gate_token missing na 1ª tentativa → stop sem retry
  - [x] Persistência de `gate_respawn_count` via telemetry line para sobreviver context compaction
  - [x] Path-traversal defense no `task_slug` do spec_path ([a-z0-9-] whitelist, truncate 60, sem `/`, `\`, `..`)
- [x] **Batch 2 — Sync cache** (3/3 arquivos re-synced após fix-pass)
- Findings adiados/rejeitados (com justificativa):
  - SEC-1 (index race Step 1 → Step 7): requer design change maior; documentado "Step-1 snapshot" como política explícita; hardening completo (hash+mtime comparison) vai para issue de follow-up fora deste pipeline
  - SEC-3 (gate_respawn_count persistence): endereçado parcial via telemetry; in-memory LLM state é limitação conhecida do harness — documented
  - CORR-05 index normalization: aceita apenas "strict trimmed equality"; acento/case divergence = bug do router (fix no router, não aqui)

## Batch 3 — LOW polish

- [x] **R-9 (LOW)** — Clarity sobre `gate_token` (rename rejeitado — vide justificativa)
  - **Alternativa conservadora aplicada**: manter `gate_token` (toca 5 arquivos + testes para rename atômico é risk > reward para LOW); adicionada nota explícita em `commands/advisor.md` pre-check 5 e em `agents/advisor-gate.md` Rule 6 dizendo "NÃO é security token, apesar do sufixo `_token`; é invocation correlation ID para telemetry joins/log dedup"
  - Endereça o **espírito** do R-9 (naming clarity, misleading label) sem o rename cost
- [x] **R-10 (LOW)** — Reconcile Step 5 score explainer com router contract
  - `commands/advisor.md` Step 5 reescrito como "best-effort": define `score` como required, `score_breakdown` e `matched_terms` como optional; rules explícitas de rendering (se presente mostra, se ausente não inventa)
  - Elimina a expectativa de campos que o router pode não emitir
- [x] **R-11 (LOW)** — Rename `cancelled_moment2` → non-terminal name
  - ✅ Antecipado no Batch 1 fix-pass (todos os orphans removidos em `commands/advisor.md:302`); enum SSOT usa `moment2_back_out`
- [x] **Batch 3 — Adversarial review** (maintainability-reviewer) — 5 findings (1 MED + 4 LOW)
- [x] **Batch 3 — Fix pass 1** (endereçando MED e LOW acionáveis):
  - [x] MAINT-B3-01 MED: Step 5 inventava contrato do router (`score`) que NÃO existe — router emite `confidence`. Step 5 reescrito para usar `confidence` (real); per-layer breakdowns marcados como "future extension, router.md deve ratificar primeiro"
  - [x] MAINT-B3-05 LOW: prefixo `F1.3` obscuro (sem definição) → removido do heading
  - [x] MAINT-B3-02/03/04 LOW: 3 tech debts registradas em `TODOS.md` → gate_token rename deferido, JSDoc em lib/schemas.js, canonicalize disclaimer
- [x] **Batch 3 — Sync cache** (2/2 arquivos)

## Phase 3 — Closure

- [x] **Sanity check** (SSOT↔cache parity + grep for leftover issues)
  - 3/3 arquivos SSOT == cache
  - 0 orphans (`cancelled_moment2`, wrong CLAUDE.md:71 ref, forward `gate_invocation_id` ref)
  - `npm test` → **431/431 passes, 0 fails**
- [x] **Final adversarial review** (opt-in) — **SKIPPED** por escolha do usuário (logged as SOFT gate, confidence_impact -0.15). Justificativa: 3 rounds adversariais paralelas já cobriram security+architecture+correctness+maintainability; finding residuals já em TODOS.md
- [x] **Pa de Cal (final-validator)** — **GO** ✅
  - MEDIA criteria: tests pass, SSOT consistent, no open HIGH findings
  - Confidence: ~0.82 (1.0 class + 1.0 info + N/A tdd + 0.95 quality + -0.15 gate_penalty + 1.0 sanity)
- [ ] **Commit + PR proposal** (finishing-branch) — aguardando decisão do usuário

## Summary

**11 recomendações (R-1..R-11) aplicadas em 3 batches + 3 fix-passes adversarial-driven:**
- 4 arquivos modificados: `commands/advisor.md`, `agents/advisor-gate.md`, `CLAUDE.md`, `TODOS.md`
- 316 insertions, 138 deletions
- 36 findings totais detectados em 3 rounds de adversarial review (security + architecture + correctness + maintainability)
- Tech debt rastreável: 4 items em `TODOS.md` (gate_token rename, router contract extension, schemas.js comment, disclaimer canonicalization)

**Não foi aplicado cegamente.** Justificativas registradas para cada rejeição/deferral.
