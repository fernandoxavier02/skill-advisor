const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
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
} = require('../lib/constants');

describe('constants.js', () => {
  describe('SEARCH_WEIGHTS', () => {
    it('exports NAME_WEIGHT = 3', () => assert.equal(SEARCH_WEIGHTS.NAME_WEIGHT, 3));
    it('exports DESC_WEIGHT = 2', () => assert.equal(SEARCH_WEIGHTS.DESC_WEIGHT, 2));
    it('exports DEFAULT_TOP_N = 5', () => assert.equal(SEARCH_WEIGHTS.DEFAULT_TOP_N, 5));
    it('exports MAX_SEMANTIC_RESULTS = 10', () => assert.equal(SEARCH_WEIGHTS.MAX_SEMANTIC_RESULTS, 10));
    it('exports MAX_DISPLAY_RESULTS = 3', () => assert.equal(SEARCH_WEIGHTS.MAX_DISPLAY_RESULTS, 3));
  });

  describe('GRAPH_PARAMS', () => {
    it('exports SCORE_BY_HOP = [1.0, 0.7, 0.4]', () => {
      assert.deepEqual(GRAPH_PARAMS.SCORE_BY_HOP, [1.0, 0.7, 0.4]);
    });
    it('exports CONVERGENCE_BOOST = 0.15', () => assert.equal(GRAPH_PARAMS.CONVERGENCE_BOOST, 0.15));
    it('exports CATEGORY_BOOST = 0.2', () => assert.equal(GRAPH_PARAMS.CATEGORY_BOOST, 0.2));
  });

  describe('WALK_LIMITS', () => {
    it('exports MAX_ENTRIES = 10000', () => assert.equal(WALK_LIMITS.MAX_ENTRIES, 10000));
    it('exports MAX_DEPTH = 6', () => assert.equal(WALK_LIMITS.MAX_DEPTH, 6));
  });

  describe('THRESHOLDS', () => {
    it('exports DEFAULT_SCORE = 0.20', () => assert.equal(THRESHOLDS.DEFAULT_SCORE, 0.20));
    it('exports STALENESS_DAYS = 7', () => assert.equal(THRESHOLDS.STALENESS_DAYS, 7));
    it('exports SEMANTIC_MIN = 0.15', () => assert.equal(THRESHOLDS.SEMANTIC_MIN, 0.15));
    it('exports LITE_INDEX_BUDGET_KB = 100', () => assert.equal(THRESHOLDS.LITE_INDEX_BUDGET_KB, 100));
  });

  describe('TRUNCATION', () => {
    it('exports LITE_DESC = 120', () => assert.equal(TRUNCATION.LITE_DESC, 120));
    it('exports CONTENT = 2000', () => assert.equal(TRUNCATION.CONTENT, 2000));
  });

  describe('EMBEDDING', () => {
    it('exports DIMENSIONS = 384', () => assert.equal(EMBEDDING.DIMENSIONS, 384));
  });

  describe('CATEGORIES', () => {
    it('has 8 categories', () => {
      assert.equal(Object.keys(CATEGORIES).length, 8);
    });
    it('includes all expected categories', () => {
      const expected = ['planning', 'implementation', 'quality', 'debugging', 'deployment', 'documentation', 'data', 'utility'];
      assert.deepEqual(Object.values(CATEGORIES).sort(), expected.sort());
    });
    it('is frozen', () => assert.ok(Object.isFrozen(CATEGORIES)));
  });

  describe('BRANCH_MAP', () => {
    it('maps fix to debugging', () => assert.equal(BRANCH_MAP.fix, CATEGORIES.DEBUGGING));
    it('maps feat to implementation', () => assert.equal(BRANCH_MAP.feat, CATEGORIES.IMPLEMENTATION));
    it('maps chore to utility', () => assert.equal(BRANCH_MAP.chore, CATEGORIES.UTILITY));
    it('maps release to deployment', () => assert.equal(BRANCH_MAP.release, CATEGORIES.DEPLOYMENT));
    it('maps docs to documentation', () => assert.equal(BRANCH_MAP.docs, CATEGORIES.DOCUMENTATION));
    it('maps test to quality', () => assert.equal(BRANCH_MAP.test, CATEGORIES.QUALITY));
    it('is frozen', () => assert.ok(Object.isFrozen(BRANCH_MAP)));
  });

  describe('AFFINITY_PARAMS', () => {
    it('has RATING_BOOST_PER_5STAR', () => assert.equal(typeof AFFINITY_PARAMS.RATING_BOOST_PER_5STAR, 'number'));
    it('has DECAY_HALF_LIFE_DAYS', () => assert.equal(AFFINITY_PARAMS.DECAY_HALF_LIFE_DAYS, 30));
    it('is frozen', () => assert.ok(Object.isFrozen(AFFINITY_PARAMS)));
  });

  describe('DISCOVERY_PARAMS', () => {
    it('has MIN_AFFINITY_SCORE = 0.6', () => assert.equal(DISCOVERY_PARAMS.MIN_AFFINITY_SCORE, 0.6));
    it('has MAX_CANDIDATES = 10', () => assert.equal(DISCOVERY_PARAMS.MAX_CANDIDATES, 10));
    it('has NUDGE_COOLDOWN_MS = 30min', () => assert.equal(DISCOVERY_PARAMS.NUDGE_COOLDOWN_MS, 30 * 60 * 1000));
    it('is frozen', () => assert.ok(Object.isFrozen(DISCOVERY_PARAMS)));
  });

  describe('COMBO_PARAMS', () => {
    it('has MIN_OCCURRENCE_COUNT = 3', () => assert.equal(COMBO_PARAMS.MIN_OCCURRENCE_COUNT, 3));
    it('has FILE_TYPE_OVERLAP_THRESHOLD = 0.5', () => assert.equal(COMBO_PARAMS.FILE_TYPE_OVERLAP_THRESHOLD, 0.5));
    it('is frozen', () => assert.ok(Object.isFrozen(COMBO_PARAMS)));
  });

  describe('COLLISION_PARAMS', () => {
    it('has SIMILARITY_THRESHOLD = 0.85', () => assert.equal(COLLISION_PARAMS.SIMILARITY_THRESHOLD, 0.85));
    it('is frozen', () => assert.ok(Object.isFrozen(COLLISION_PARAMS)));
  });

  describe('FUSION_WEIGHTS', () => {
    it('weights sum to 1.0', () => {
      const sum = FUSION_WEIGHTS.SEMANTIC + FUSION_WEIGHTS.KEYWORD + FUSION_WEIGHTS.GRAPH;
      assert.ok(Math.abs(sum - 1.0) < 0.001);
    });
    it('is frozen', () => assert.ok(Object.isFrozen(FUSION_WEIGHTS)));
  });

  describe('freeze behavior', () => {
    it('SEARCH_WEIGHTS is frozen', () => assert.ok(Object.isFrozen(SEARCH_WEIGHTS)));
    it('GRAPH_PARAMS is frozen', () => assert.ok(Object.isFrozen(GRAPH_PARAMS)));
    it('WALK_LIMITS is frozen', () => assert.ok(Object.isFrozen(WALK_LIMITS)));
    it('THRESHOLDS is frozen', () => assert.ok(Object.isFrozen(THRESHOLDS)));
    it('TRUNCATION is frozen', () => assert.ok(Object.isFrozen(TRUNCATION)));
    it('EMBEDDING is frozen', () => assert.ok(Object.isFrozen(EMBEDDING)));

    it('mutation attempt does not change value', () => {
      const original = SEARCH_WEIGHTS.NAME_WEIGHT;
      'use strict';
      try { SEARCH_WEIGHTS.NAME_WEIGHT = 99; } catch {}
      assert.equal(SEARCH_WEIGHTS.NAME_WEIGHT, original);
    });
  });
});
