'use strict';

/**
 * constants-merge.test.js — Invariants for the base+user merge in constants.js.
 *
 * The refactor introduced in v0.3.5 makes PIPELINE_OWNERS, CANONICAL_FLOWS,
 * and PIPELINE_FINGERPRINTS the MERGED product of:
 *   - a private hardcoded base (_BASE_*)
 *   - a user extension loaded from ~/.claude/advisor/pipeline-owners-user.json
 *
 * These tests verify the merge contract WITHOUT relying on the user's actual
 * filesystem: they exercise `mergeOwners`, `mergeFlows`, `mergeFingerprints`
 * directly with synthetic extension objects.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  PIPELINE_OWNERS,
  CANONICAL_FLOWS,
  PIPELINE_FINGERPRINTS,
  _BASE_PIPELINE_OWNERS,
  _BASE_CANONICAL_FLOWS,
  _BASE_PIPELINE_FINGERPRINTS,
  _mergeOwners,
  _mergeFlows,
  _mergeFingerprints,
} = require('../lib/constants.js');

const { EMPTY_EXTENSION } = require('../lib/user-config.js');

describe('constants merge — base-only state', () => {
  it('exports _BASE_PIPELINE_OWNERS with the 5 canonical owners', () => {
    assert.deepEqual(
      _BASE_PIPELINE_OWNERS.slice().sort(),
      ['compound-engineering', 'kiro', 'pipeline-orchestrator', 'sdd', 'superpowers']
    );
  });

  it('PIPELINE_OWNERS includes every base owner', () => {
    for (const owner of _BASE_PIPELINE_OWNERS) {
      assert.ok(PIPELINE_OWNERS.includes(owner), `missing base owner ${owner}`);
    }
  });

  it('CANONICAL_FLOWS keys parity with PIPELINE_OWNERS', () => {
    assert.deepEqual(
      Object.keys(CANONICAL_FLOWS).sort(),
      PIPELINE_OWNERS.slice().sort()
    );
  });

  it('PIPELINE_FINGERPRINTS keys parity with PIPELINE_OWNERS', () => {
    assert.deepEqual(
      Object.keys(PIPELINE_FINGERPRINTS).sort(),
      PIPELINE_OWNERS.slice().sort()
    );
  });
});

describe('constants merge — immutability', () => {
  it('PIPELINE_OWNERS is frozen', () => {
    assert.throws(() => PIPELINE_OWNERS.push('x'), TypeError);
  });

  it('CANONICAL_FLOWS is frozen', () => {
    assert.throws(() => { CANONICAL_FLOWS['new-owner'] = []; }, TypeError);
  });
});

describe('_mergeOwners', () => {
  it('returns base when user extension is empty', () => {
    const merged = _mergeOwners(_BASE_PIPELINE_OWNERS, EMPTY_EXTENSION);
    assert.deepEqual(merged.slice().sort(), _BASE_PIPELINE_OWNERS.slice().sort());
  });

  it('appends new user owners after base', () => {
    const ext = {
      pipeline_owners: ['my-custom'],
      canonical_flows: { 'my-custom': ['/my-custom:run'] },
      pipeline_fingerprints: { 'my-custom': { best_for: 'x' } },
    };
    const merged = _mergeOwners(_BASE_PIPELINE_OWNERS, ext);
    assert.ok(merged.includes('my-custom'));
    for (const base of _BASE_PIPELINE_OWNERS) {
      assert.ok(merged.includes(base));
    }
  });

  it('filters out user owner that collides with base (base wins)', () => {
    const ext = {
      pipeline_owners: ['superpowers', 'my-custom'],
      canonical_flows: {
        'superpowers': ['/superpowers:fake'],
        'my-custom': ['/my-custom:run'],
      },
      pipeline_fingerprints: {
        'superpowers': { best_for: 'fake' },
        'my-custom': { best_for: 'real' },
      },
    };
    const merged = _mergeOwners(_BASE_PIPELINE_OWNERS, ext);
    // Only one 'superpowers' entry (from base)
    const sp = merged.filter((o) => o === 'superpowers');
    assert.equal(sp.length, 1);
    assert.ok(merged.includes('my-custom'));
  });

  it('merge result is frozen', () => {
    const ext = {
      pipeline_owners: ['my-custom'],
      canonical_flows: { 'my-custom': ['/a'] },
      pipeline_fingerprints: { 'my-custom': { best_for: 'x' } },
    };
    const merged = _mergeOwners(_BASE_PIPELINE_OWNERS, ext);
    assert.throws(() => merged.push('y'), TypeError);
  });
});

describe('_mergeFlows', () => {
  it('returns base when extension is empty', () => {
    const merged = _mergeFlows(_BASE_CANONICAL_FLOWS, EMPTY_EXTENSION, _BASE_PIPELINE_OWNERS);
    assert.deepEqual(Object.keys(merged).sort(), Object.keys(_BASE_CANONICAL_FLOWS).sort());
  });

  it('appends new owner flow', () => {
    const ext = {
      pipeline_owners: ['x'],
      canonical_flows: { x: ['/x:a', '/x:b'] },
      pipeline_fingerprints: { x: { best_for: '' } },
    };
    const allowedOwners = [..._BASE_PIPELINE_OWNERS, 'x'];
    const merged = _mergeFlows(_BASE_CANONICAL_FLOWS, ext, allowedOwners);
    assert.deepEqual(merged['x'], ['/x:a', '/x:b']);
    // base still present
    assert.ok(merged['superpowers']);
  });

  it('base flow wins when user tries to override', () => {
    const ext = {
      pipeline_owners: ['superpowers'],
      canonical_flows: { superpowers: ['/fake:one-step'] },
      pipeline_fingerprints: { superpowers: { best_for: 'fake' } },
    };
    const merged = _mergeFlows(_BASE_CANONICAL_FLOWS, ext, _BASE_PIPELINE_OWNERS);
    // merged['superpowers'] is still the base 4-step flow, not the fake 1-step
    assert.equal(merged['superpowers'].length, _BASE_CANONICAL_FLOWS['superpowers'].length);
  });

  it('ignores user flow for owner not in allowed list', () => {
    const ext = {
      pipeline_owners: ['ghost'],
      canonical_flows: { ghost: ['/ghost:run'] },
      pipeline_fingerprints: { ghost: { best_for: '' } },
    };
    const merged = _mergeFlows(_BASE_CANONICAL_FLOWS, ext, _BASE_PIPELINE_OWNERS);
    assert.equal(merged['ghost'], undefined);
  });
});
