'use strict';

/**
 * pipeline-config.js — Single source of truth for pipeline owners,
 * canonical flows, and pipeline fingerprints, with lazy user-extension
 * merging.
 *
 * Architecture role (Skill_Advisor_Pipeline_Config, design.md §"utils"):
 *   - Owns base data: PIPELINE_OWNERS, CANONICAL_FLOWS, PIPELINE_FINGERPRINTS.
 *   - Owns merge functions: mergeOwners, mergeFlows, mergeFingerprints.
 *   - Exposes loadEffectivePipelineConfig(): a lazy resolver that reads
 *     ~/.claude/advisor/pipeline-owners-user.json (or
 *     SKILL_ADVISOR_USER_CONFIG_PATH override) ON DEMAND, memoizing by
 *     mtime so a session of N calls performs at most 1 read per mtime.
 *
 * Invariants:
 *   - DI-1 (Module Load Purity): require('./pipeline-config') triggers
 *     ZERO filesystem reads. The user-config read is deferred to the
 *     first invocation of loadEffectivePipelineConfig().
 *   - All exported data containers are deeply Object.freeze'd.
 *   - Merge contract is APPEND-ONLY: user owners colliding with the base
 *     list are rejected with a stderr warning; user flows/fingerprints
 *     for owners outside the allowed list are silently dropped.
 *
 * Requirements: 2.3, 2.4, 2.5
 */

// Note: lib/user-config.js is required lazily inside loadEffectivePipelineConfig
// so a require() of pipeline-config does not transitively load fs through it
// (user-config itself imports node:fs, but module load is side-effect-free —
// the fs reads happen only when loadUserConfig() is called).

// ---------------------------------------------------------------------------
// Base data — frozen, immutable, no I/O
// ---------------------------------------------------------------------------

/**
 * Plugins whose skills act as end-to-end orchestrators. A loadout may
 * contain skills from at most ONE pipeline owner; cross-owner loadouts
 * are invalid. Maintained by hand when a new orchestrated plugin is
 * installed. Kiro is tagged via an exception rule in lib/loadout.js.
 *
 * @type {ReadonlyArray<string>}
 */
const PIPELINE_OWNERS = Object.freeze([
  'superpowers',
  'pipeline-orchestrator',
  'kiro',
  'sdd',
  'compound-engineering',
]);

/**
 * Canonical native flow per pipeline owner. Used by the gate when a
 * pipeline-owned skill is picked at any step — the entire loadout is
 * collapsed to this array.
 *
 * PARITY INVARIANT: Object.keys(CANONICAL_FLOWS).sort() must deep-equal
 * PIPELINE_OWNERS.slice().sort().
 *
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
const CANONICAL_FLOWS = Object.freeze({
  'superpowers': Object.freeze([
    '/superpowers:brainstorming',
    '/superpowers:writing-plans',
    '/superpowers:executing-plans',
    '/superpowers:verification-before-completion',
  ]),
  'pipeline-orchestrator': Object.freeze([
    '/pipeline-orchestrator:pipeline',
  ]),
  'kiro': Object.freeze([
    '/kiro-discovery',
    '/kiro-spec-quick',
    '/kiro-impl',
    '/kiro-validate-impl',
  ]),
  'sdd': Object.freeze([
    '/sdd:brainstorm',
    '/sdd:plan',
    '/sdd:implement',
  ]),
  'compound-engineering': Object.freeze([
    '/compound-engineering:ce-brainstorm',
    '/compound-engineering:ce-plan',
    '/compound-engineering:ce-work',
    '/compound-engineering:ce-commit',
  ]),
});

/**
 * Triage-first recognition fingerprints per pipeline owner. The router
 * matches the task description against best_for + typical_tasks AND the
 * declared task_complexity ∈ complexity_match to decide whether to emit
 * the canonical flow directly instead of composing standalone skills.
 *
 * PARITY INVARIANT: Object.keys(PIPELINE_FINGERPRINTS).sort() must
 * deep-equal PIPELINE_OWNERS.slice().sort().
 *
 * @type {Readonly<Record<string, Readonly<{ best_for: string, typical_tasks: ReadonlyArray<string>, not_for: ReadonlyArray<string>, complexity_match: ReadonlyArray<string> }>>>}
 */
const PIPELINE_FINGERPRINTS = Object.freeze({
  'superpowers': Object.freeze({
    best_for: 'Multi-step feature development with brainstorm-plan-execute-verify discipline.',
    typical_tasks: Object.freeze([
      'design new feature',
      'refactor with planning',
      'systematic implementation',
    ]),
    not_for: Object.freeze([
      'one-line fixes',
      'quick lookups',
      'simple bug fixes',
    ]),
    complexity_match: Object.freeze(['medium', 'complex']),
  }),
  'pipeline-orchestrator': Object.freeze({
    best_for: 'Task with formal classification, gates, and adversarial review (bug fix / feature / audit / security).',
    typical_tasks: Object.freeze([
      'bug fix with root cause analysis',
      'feature with review batches',
      'code audit',
    ]),
    not_for: Object.freeze([
      'exploratory work',
      'plain implementation without quality gates',
    ]),
    complexity_match: Object.freeze(['medium', 'complex']),
  }),
  'kiro': Object.freeze({
    best_for: 'Kiro-style Spec-Driven Development — requirements → design → tasks → impl with 3-phase approvals.',
    typical_tasks: Object.freeze([
      'new spec',
      'validate implementation gap',
      'structured feature dev',
    ]),
    not_for: Object.freeze([
      'ad-hoc fixes',
      'projects without .kiro/ scaffolding',
    ]),
    complexity_match: Object.freeze(['complex']),
  }),
  'sdd': Object.freeze({
    best_for: 'Spec-Driven Development with LLM-as-Judge verification.',
    typical_tasks: Object.freeze([
      'brainstorm → plan → implement with automated quality checks',
    ]),
    not_for: Object.freeze([
      'simple edits',
      'work that does not benefit from judge verification',
    ]),
    complexity_match: Object.freeze(['medium', 'complex']),
  }),
  'compound-engineering': Object.freeze({
    best_for: 'Full compound workflow (brainstorm → plan → work → commit → PR).',
    typical_tasks: Object.freeze([
      'feature with structured delivery',
      'end-to-end development loop',
    ]),
    not_for: Object.freeze([
      'diagnostic-only tasks',
      'refactors without commit scope',
    ]),
    complexity_match: Object.freeze(['medium', 'complex']),
  }),
});

// ---------------------------------------------------------------------------
// Merge functions — pure, no I/O, semantics preserved bit-for-bit from
// the original implementation in lib/constants.js (pre-Slice-1.2).
// ---------------------------------------------------------------------------

/**
 * Append user-declared owners to the base list, dropping collisions.
 *
 * @param {ReadonlyArray<string>} base
 * @param {{ pipeline_owners?: ReadonlyArray<string> }} userExt
 * @returns {ReadonlyArray<string>}
 */
function mergeOwners(base, userExt) {
  const filtered = (userExt.pipeline_owners || []).filter((owner) => {
    if (base.includes(owner)) {
      process.stderr.write(
        `[skill-advisor] user-config owner "${owner}" is reserved by base list — ignored\n`,
      );
      return false;
    }
    return true;
  });
  return Object.freeze([...base, ...filtered]);
}

/**
 * Append user-declared flows for owners present in `allowedOwners`,
 * leaving base flows untouched.
 *
 * @param {Readonly<Record<string, ReadonlyArray<string>>>} base
 * @param {{ canonical_flows?: Record<string, ReadonlyArray<string>> }} userExt
 * @param {ReadonlyArray<string>} allowedOwners
 * @returns {Readonly<Record<string, ReadonlyArray<string>>>}
 */
function mergeFlows(base, userExt, allowedOwners) {
  const merged = { ...base };
  for (const [owner, flow] of Object.entries(userExt.canonical_flows || {})) {
    if (base[owner]) continue;
    if (!allowedOwners.includes(owner)) continue;
    merged[owner] = Object.freeze([...flow]);
  }
  return Object.freeze(merged);
}

/**
 * Append user-declared fingerprints for owners present in
 * `allowedOwners`, leaving base fingerprints untouched.
 *
 * @param {Readonly<Record<string, object>>} base
 * @param {{ pipeline_fingerprints?: Record<string, object> }} userExt
 * @param {ReadonlyArray<string>} allowedOwners
 * @returns {Readonly<Record<string, object>>}
 */
function mergeFingerprints(base, userExt, allowedOwners) {
  const merged = { ...base };
  for (const [owner, fp] of Object.entries(userExt.pipeline_fingerprints || {})) {
    if (base[owner]) continue;
    if (!allowedOwners.includes(owner)) continue;
    merged[owner] = Object.freeze({
      best_for: fp.best_for || '',
      typical_tasks: Object.freeze([...(fp.typical_tasks || [])]),
      not_for: Object.freeze([...(fp.not_for || [])]),
      complexity_match: Object.freeze([...(fp.complexity_match || [])]),
    });
  }
  return Object.freeze(merged);
}

// ---------------------------------------------------------------------------
// Lazy effective-config resolver — memoized by user-config mtime
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EffectivePipelineConfig
 * @property {ReadonlyArray<string>} owners
 * @property {Readonly<Record<string, ReadonlyArray<string>>>} flows
 * @property {Readonly<Record<string, object>>} fingerprints
 */

/** @type {{ mtimeMs: number, path: string, value: EffectivePipelineConfig } | null} */
let _memo = null;

/**
 * Resolve the effective pipeline configuration: base + user extension
 * merged into a single frozen view. The user-config file is read only
 * on first call, and re-read only when its mtime changes (or its path
 * changes — e.g. the SKILL_ADVISOR_USER_CONFIG_PATH env var was flipped).
 *
 * Fail-soft: a missing file, malformed JSON, or schema violations all
 * degrade silently to base-only with a stderr warning emitted by
 * lib/user-config.js.
 *
 * Idempotence (Property P3): for any sequence of calls without an
 * intervening mtime change, the user-config file is read at most once.
 *
 * @returns {EffectivePipelineConfig}
 */
function loadEffectivePipelineConfig() {
  // Lazy require — keeps require('./pipeline-config') side-effect-free.
  const { loadUserConfig, defaultUserConfigPath } = require('./user-config.js');
  const fs = require('node:fs');

  const currentPath = process.env.SKILL_ADVISOR_USER_CONFIG_PATH || defaultUserConfigPath();

  let currentMtimeMs = 0;
  try {
    currentMtimeMs = fs.statSync(currentPath).mtimeMs;
  } catch {
    // File missing — represent as mtime 0 so cache key stays stable until
    // a real file appears.
    currentMtimeMs = 0;
  }

  if (
    _memo
    && _memo.path === currentPath
    && _memo.mtimeMs === currentMtimeMs
  ) {
    return _memo.value;
  }

  const userExt = loadUserConfig(currentPath);
  const owners = mergeOwners(PIPELINE_OWNERS, userExt);
  const flows = mergeFlows(CANONICAL_FLOWS, userExt, owners);
  const fingerprints = mergeFingerprints(PIPELINE_FINGERPRINTS, userExt, owners);

  const value = Object.freeze({ owners, flows, fingerprints });
  _memo = { path: currentPath, mtimeMs: currentMtimeMs, value };
  return value;
}

// Test-only helper (not part of the public surface): clear the lazy memo.
// Allows tests to simulate a fresh process when toggling fixtures.
function _resetMemoForTests() {
  _memo = null;
}

module.exports = {
  PIPELINE_OWNERS,
  CANONICAL_FLOWS,
  PIPELINE_FINGERPRINTS,
  mergeOwners,
  mergeFlows,
  mergeFingerprints,
  loadEffectivePipelineConfig,
  // Internal back-compat aliases for callers historically importing
  // _mergeOwners / _mergeFlows / _mergeFingerprints from constants.js.
  _mergeOwners: mergeOwners,
  _mergeFlows: mergeFlows,
  _mergeFingerprints: mergeFingerprints,
  _resetMemoForTests,
};
