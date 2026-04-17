# TODOS

Deferred items from v2.0 planning pipeline.

## From adversarial-fixes pipeline (2026-04-16)

- **Rename `gate_token` → `gate_invocation_id` (R-9 deferred)**: current name has `_token` suffix but field is invocation correlation ID, not a security token. Rename would touch 5 files (`commands/advisor.md`, `agents/advisor-gate.md`, `lib/schemas.js`, `tests/advisor-gate-contract.test.js`, any new consumer). Deferred because severity is LOW — mitigation notes added to advisor.md pre-check 5 and advisor-gate Rule 6 clarifying that it is NOT a security token. Reconsider if/when touching the gate contract for other reasons.
- **Add `score_breakdown`/`matched_terms` to router Output Format (R-10 partial)**: Step 5 "Score Explainer" in `commands/advisor.md` currently renders only `confidence` (what the router actually emits). Per-layer breakdowns from the hook path would enrich the dry-run but require router.md Output Format extension first.
- **Add JSDoc/comment to `lib/schemas.js` at gate_token validation**: note "not a security token — see agents/advisor-gate.md Rule 6" so future validators find the disclaimer at the point of first contact.
- **Canonicalize gate_token disclaimer**: two disclaimers exist in `commands/advisor.md` Step 7 pre-check 5 and `agents/advisor-gate.md` Rule 6. Pick one as canonical and have the other cross-reference it to avoid drift.

## From CEO Review (2026-04-08)

- **Onboarding Flow**: guided 5-min tour for cold start bootstrap
  - Blocked by: F1+F2 maturity (~20 uses before recommendations improve)
  - Context: new users have no execution history; community aggregate data could bootstrap

- **Export/Import Affinity Profiles**: portability for new machines/team sharing
  - Blocked by: F1+F3+F4 data (no data to export yet)

- **Zero-Command Auto-Activation**: hook auto-executes loadout at high confidence
  - Status: SKIPPED (risk of annoying users without proven accuracy)

- **Time-of-day scoring signal**: morning=planning, afternoon=implementation?
  - Status: SKIPPED (speculative, no evidence of predictive value)

- **F8 config subcommand** (`/advisor-config default`): let user set default per collision group
  - Blocked by: F8 v2 is warnings-only; config subcommand deferred

## From Eng Review (2026-04-09)

- **Signal Fusion v2 (learned weights)**: use feedback data to optimize fusion weights
  - Blocked by: F0 (basic fusion) + F1 (feedback loop) + ~50 feedbacks
  - Context: currently FUSION_WEIGHTS are static (0.5/0.3/0.2); learned weights would adapt

- **Hook timing benchmark**: script to measure actual cold-start timing on Windows with antivirus
  - Blocked by: nothing (can run anytime)
  - Context: Codex flagged 50ms budget may already be exceeded; no measurement exists

- **Commands bash to cross-platform**: .md commands use find, date -u, mkdir -p
  - Blocked by: nothing, but low priority
  - Context: Claude Code translates bash internally; risk increases as commands get more complex

- **F5 Vault Enrichment**: extend build-catalog.js with v2 metadata
  - Blocked by: F1 maturity (needs affinity data to enrich cards)
  - Context: add input/output contracts, execution time estimates, composition edges, user ratings to vault cards
  - Effort: M (catalog schema changes, validateSkillCardV2 update)
