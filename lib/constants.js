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
};
