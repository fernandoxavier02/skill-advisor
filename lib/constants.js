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
  SCORE_BY_HOP: [1.0, 0.7, 0.4],
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

module.exports = {
  SEARCH_WEIGHTS,
  GRAPH_PARAMS,
  WALK_LIMITS,
  THRESHOLDS,
  TRUNCATION,
  EMBEDDING,
};
