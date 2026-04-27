'use strict';

/**
 * advisor-nudge-early-exit.feature.js — BDD tier (Slice 5.5 / Task 6.5).
 *
 * Locks the early-exit contract from Slice 2.2: when prompt length is below
 * threshold, the core returns earlyExit:true without invoking ANY of the
 * injected loaders. This is the BDD-tier wrapper for the property already
 * tested in tests/advisor-nudge-core.test.js — placing it here satisfies
 * the spec language "BDD scenarios in the features directory".
 */

const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { runNudge } = require('../../lib/advisor-nudge-core');

const SAMPLE_INDEX = path.resolve(__dirname, '..', 'fixtures', 'sample-index-lite.json');

describe('Feature: advisor-nudge core early-exit', () => {
  it('Given a prompt of length 5 with threshold 12, When runNudge runs, Then earlyExit is true and no loader is invoked', () => {
    const embeddingsLoader = mock.fn(() => null);
    const graphLoader = mock.fn(() => null);
    const hookDataLoader = mock.fn(() => null);
    const discoveryStateLoader = mock.fn(() => ({}));
    const result = runNudge({
      prompt: 'short',
      indexLitePath: SAMPLE_INDEX,
      embeddingsLoader,
      graphLoader,
      hookDataLoader,
      discoveryStateLoader,
      threshold: 12,
      env: {},
      now: () => 1700000000000,
    });
    assert.equal(result.earlyExit, true);
    assert.equal(embeddingsLoader.mock.callCount(), 0);
    assert.equal(graphLoader.mock.callCount(), 0);
    assert.equal(hookDataLoader.mock.callCount(), 0);
    assert.equal(discoveryStateLoader.mock.callCount(), 0);
  });
});
