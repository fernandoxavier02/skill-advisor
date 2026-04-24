'use strict';

/**
 * constants.js — Single source of truth for all tunable parameters.
 *
 * Groups:
 *   SEARCH_WEIGHTS — keyword scoring weights
 *   GRAPH_PARAMS   — BFS traversal scoring
 *   WALK_LIMITS    — filesystem traversal bounds
 *   THRESHOLDS     — relevance cutoffs and budgets
 *   TRUNCATION     — text length limits
 *   EMBEDDING      — vector configuration
 *
 * All groups are frozen to prevent accidental mutation.
 */

const SEARCH_WEIGHTS = Object.freeze({
  NAME_WEIGHT: 3,
  DESC_WEIGHT: 2,
  DEFAULT_TOP_N: 5,
  MAX_SEMANTIC_RESULTS: 10,
  MAX_DISPLAY_RESULTS: 3,
});

const GRAPH_PARAMS = Object.freeze({
  SCORE_BY_HOP: Object.freeze([1.0, 0.7, 0.4]),
  CONVERGENCE_BOOST: 0.15,
  CATEGORY_BOOST: 0.2,
});

const WALK_LIMITS = Object.freeze({
  MAX_ENTRIES: 10000,
  MAX_DEPTH: 6,
});

const THRESHOLDS = Object.freeze({
  DEFAULT_SCORE: 0.20,
  STALENESS_DAYS: 7,
  SEMANTIC_MIN: 0.15,
  LITE_INDEX_BUDGET_KB: 100,
});

const TRUNCATION = Object.freeze({
  LITE_DESC: 120,
  CONTENT: 2000,
});

const EMBEDDING = Object.freeze({
  DIMENSIONS: 384,
});

const CATEGORIES = Object.freeze({
  PLANNING: 'planning',
  IMPLEMENTATION: 'implementation',
  QUALITY: 'quality',
  DEBUGGING: 'debugging',
  DEPLOYMENT: 'deployment',
  DOCUMENTATION: 'documentation',
  DATA: 'data',
  UTILITY: 'utility',
});

const BRANCH_MAP = Object.freeze({
  fix: CATEGORIES.DEBUGGING,
  bugfix: CATEGORIES.DEBUGGING,
  hotfix: CATEGORIES.DEBUGGING,
  feat: CATEGORIES.IMPLEMENTATION,
  feature: CATEGORIES.IMPLEMENTATION,
  chore: CATEGORIES.UTILITY,
  release: CATEGORIES.DEPLOYMENT,
  deploy: CATEGORIES.DEPLOYMENT,
  docs: CATEGORIES.DOCUMENTATION,
  doc: CATEGORIES.DOCUMENTATION,
  test: CATEGORIES.QUALITY,
  refactor: CATEGORIES.QUALITY,
});

const AFFINITY_PARAMS = Object.freeze({
  RATING_BOOST_PER_5STAR: 0.1,
  CANCEL_PENALTY: 0.05,
  MIN_FEEDBACK_COUNT: 1,
  DECAY_HALF_LIFE_DAYS: 30,
});

const DISCOVERY_PARAMS = Object.freeze({
  MIN_AFFINITY_SCORE: 0.6,
  MAX_CANDIDATES: 10,
  NUDGE_COOLDOWN_MS: 30 * 60 * 1000,
  SEEN_EXPIRY_DAYS: 7,
});

const COMBO_PARAMS = Object.freeze({
  MIN_OCCURRENCE_COUNT: 3,
  FILE_TYPE_OVERLAP_THRESHOLD: 0.5,
});

const COLLISION_PARAMS = Object.freeze({
  SIMILARITY_THRESHOLD: 0.85,
});

const FUSION_WEIGHTS = Object.freeze({
  SEMANTIC: 0.5,
  KEYWORD: 0.3,
  GRAPH: 0.2,
});

const COMPLEXITY_BOUNDS = Object.freeze({
  simple:  { min: 1, max: 2 },
  medium:  { min: 3, max: 3 },
  complex: { min: 4, max: 5 },
});

// Plugins whose skills act as end-to-end orchestrators. A loadout may
// contain skills from at most ONE pipeline owner; cross-owner loadouts
// are invalid. Maintained by hand when a new orchestrated plugin is
// installed. Kiro is tagged via an exception rule in lib/loadout.js:
// skills whose id contains `kiro:` or whose invocation begins with
// `/kiro-` are tagged as `kiro`, regardless of their originating plugin.
const PIPELINE_OWNERS = Object.freeze([
  'superpowers',
  'pipeline-orchestrator',
  'kiro',
  'sdd',
  'compound-engineering',
]);

// Canonical native flow per pipeline owner. Used by the gate when a
// pipeline-owned skill is picked at any step — the entire loadout is
// collapsed to this array.
//
// PARITY INVARIANT: Object.keys(CANONICAL_FLOWS).sort() must deep-equal
// PIPELINE_OWNERS.slice().sort(). Enforced by test T7.
//
// Every invocation listed here must exist in
// tests/fixtures/advisor-index-full.fixture.json (enforced by test T6).
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

// Triage-first recognition. Each owner carries a functional fingerprint
// used by the router to recognize — from the task description alone —
// whether the work maps end-to-end onto a pipelined plugin. When a
// fingerprint matches AND the declared task_complexity ∈ complexity_match,
// the router emits the canonical flow directly instead of composing
// standalone skills.
//
// PARITY INVARIANT: Object.keys(PIPELINE_FINGERPRINTS).sort() must
// deep-equal PIPELINE_OWNERS.slice().sort(). Enforced by test T9.
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

module.exports = {
  SEARCH_WEIGHTS,
  GRAPH_PARAMS,
  WALK_LIMITS,
  THRESHOLDS,
  TRUNCATION,
  EMBEDDING,
  CATEGORIES,
  BRANCH_MAP,
  AFFINITY_PARAMS,
  DISCOVERY_PARAMS,
  COMBO_PARAMS,
  COLLISION_PARAMS,
  FUSION_WEIGHTS,
  PIPELINE_OWNERS,
  CANONICAL_FLOWS,
  PIPELINE_FINGERPRINTS,
  COMPLEXITY_BOUNDS,
};
