const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  SEARCH_WEIGHTS,
  GRAPH_PARAMS,
  WALK_LIMITS,
  THRESHOLDS,
  TRUNCATION,
  EMBEDDING,
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
