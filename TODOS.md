# TODOS

Deferred items from v2.0 planning pipeline.

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
