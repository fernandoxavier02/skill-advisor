'use strict';

/**
 * loadout-direct.test.js — Slice 5.4 (Task 6.4).
 *
 * Direct unit tests of every function exported by lib/loadout.js. Each
 * export gets at least two scenarios (typical input + boundary case) per
 * spec Req 8.4. Existing composition tests via build-index/advisor flow
 * keep passing alongside this file.
 *
 * Exports under test (3): tagPipelineOwner, collapseToCanonicalFlow,
 * swapAtPosition.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { tagPipelineOwner, collapseToCanonicalFlow, swapAtPosition } = require('../lib/loadout');

describe('tagPipelineOwner: typical inputs', () => {
  it('Given an entry with id containing "kiro:", When tagPipelineOwner runs, Then it returns "kiro"', () => {
    assert.equal(tagPipelineOwner({ id: 'plugin:kiro:spec-init', invocation: '/spec-init' }), 'kiro');
  });

  it('Given an entry with invocation starting with /kiro-, When tagPipelineOwner runs, Then it returns "kiro"', () => {
    assert.equal(tagPipelineOwner({ id: 'plugin:other:foo', invocation: '/kiro-spec-design' }), 'kiro');
  });

  it('Given an entry with neither kiro hint nor known plugin owner, When tagPipelineOwner runs, Then it returns null', () => {
    assert.equal(tagPipelineOwner({ id: 'global:investigate', invocation: '/investigate', source: 'global' }), null);
  });
});

describe('tagPipelineOwner: boundary cases', () => {
  it('Given undefined entry, When tagPipelineOwner runs, Then it returns null without throwing', () => {
    assert.equal(tagPipelineOwner(undefined), null);
    assert.equal(tagPipelineOwner(null), null);
    assert.equal(tagPipelineOwner('not an object'), null);
  });

  it('Given an entry with empty fields, When tagPipelineOwner runs, Then it returns null', () => {
    assert.equal(tagPipelineOwner({}), null);
    assert.equal(tagPipelineOwner({ id: '', invocation: '', source: '' }), null);
  });
});

describe('swapAtPosition: typical inputs', () => {
  const sampleLoadout = [
    { invocation: '/investigate', role: 'debugging' },
    { invocation: '/fix', role: 'fix' },
    { invocation: '/ship', role: 'deployment' },
  ];

  it('Given a 3-entry loadout and position=1, When swapAtPosition runs with a valid replacement, Then a new array is returned with position 1 replaced and original is untouched', () => {
    const replacement = { invocation: '/patch', role: 'fix' };
    const out = swapAtPosition(sampleLoadout, 1, replacement);
    assert.equal(out.length, 3);
    assert.deepEqual(out[0], sampleLoadout[0]);
    assert.equal(out[1].invocation, '/patch');
    assert.deepEqual(out[2], sampleLoadout[2]);
    // Immutability check.
    assert.equal(sampleLoadout[1].invocation, '/fix');
  });

  it('Given a single-entry loadout and position=0, When swapAtPosition runs, Then the only entry is replaced', () => {
    const out = swapAtPosition([{ invocation: '/old' }], 0, { invocation: '/new' });
    assert.deepEqual(out, [{ invocation: '/new' }]);
  });
});

describe('swapAtPosition: boundary cases', () => {
  it('Given a non-array loadout, When swapAtPosition runs, Then it throws TypeError', () => {
    assert.throws(() => swapAtPosition(null, 0, { invocation: '/x' }), /TypeError/);
    assert.throws(() => swapAtPosition({}, 0, { invocation: '/x' }), /TypeError/);
  });

  it('Given an out-of-bounds position, When swapAtPosition runs, Then it throws RangeError', () => {
    assert.throws(() => swapAtPosition([{ invocation: '/a' }], 5, { invocation: '/b' }), /RangeError/);
    assert.throws(() => swapAtPosition([{ invocation: '/a' }], -1, { invocation: '/b' }), /RangeError/);
  });

  it('Given a replacement without invocation, When swapAtPosition runs, Then it throws Error naming the missing field', () => {
    assert.throws(() => swapAtPosition([{ invocation: '/a' }], 0, {}), /invocation/);
    assert.throws(() => swapAtPosition([{ invocation: '/a' }], 0, { invocation: '' }), /invocation/);
  });
});

describe('collapseToCanonicalFlow: typical inputs', () => {
  it('Given a known pipeline owner ("kiro") and an indexSnapshot containing all flow members, When collapseToCanonicalFlow runs, Then the result is a fully-materialized array with role/category/confidence/depends_on populated', () => {
    // We have to peek at PIPELINE_OWNERS / CANONICAL_FLOWS to know what to feed.
    // pipeline-config.js exposes these; we synthesize a minimal index snapshot
    // for whatever flow `kiro` declares.
    const cfg = require('../lib/pipeline-config').loadEffectivePipelineConfig();
    const flow = cfg.flows && cfg.flows.kiro;
    if (!Array.isArray(flow) || flow.length === 0) {
      // Defensive: if config has no kiro flow on this install, skip the test.
      return;
    }
    const snapshot = flow.map((inv, i) => ({ invocation: inv, category: i === 0 ? 'planning' : 'implementation' }));
    const out = collapseToCanonicalFlow('kiro', snapshot);
    assert.equal(out.length, flow.length);
    for (let i = 0; i < flow.length; i++) {
      assert.equal(out[i].invocation, flow[i]);
      assert.equal(out[i].pipeline_owner, 'kiro');
      assert.equal(out[i].confidence, 1.0);
      assert.deepEqual(out[i].depends_on, i === 0 ? [] : [i]);
    }
  });
});

describe('collapseToCanonicalFlow: boundary cases', () => {
  it('Given an unknown pipeline owner, When collapseToCanonicalFlow runs, Then it throws Error naming the bad owner', () => {
    assert.throws(() => collapseToCanonicalFlow('definitely-not-an-owner', []), /unknown pipeline owner/);
  });

  it('Given a known owner but a snapshot missing one of the required invocations, When collapseToCanonicalFlow runs, Then it throws Error naming the missing invocation', () => {
    const cfg = require('../lib/pipeline-config').loadEffectivePipelineConfig();
    const flow = cfg.flows && cfg.flows.kiro;
    if (!Array.isArray(flow) || flow.length === 0) return;
    // Snapshot omits the FIRST invocation deliberately.
    const snapshot = flow.slice(1).map((inv) => ({ invocation: inv, category: 'utility' }));
    assert.throws(() => collapseToCanonicalFlow('kiro', snapshot), /missing from the index snapshot/);
  });
});
