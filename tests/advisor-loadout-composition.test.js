'use strict';

/**
 * advisor-loadout-composition.test.js — T1-T10 regression suite for
 * per-step loadout picker with complexity-aware sizing and
 * pipeline-owner isolation (.specs/plans/per-step-loadout-picker.design.md).
 *
 * All tests run against the hand-curated fixture at
 * tests/fixtures/advisor-index-full.fixture.json — never against the
 * live-generated lib/advisor-index-full.json.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'advisor-index-full.fixture.json');
const FIXTURE_INDEX = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));

// T1: build-index tagging
describe('T1: pipeline_owner tagging', () => {
  const { tagPipelineOwner } = require('../lib/loadout');

  it('tags plugin:superpowers skills as "superpowers"', () => {
    const owner = tagPipelineOwner({
      id: 'plugin:superpowers:brainstorming',
      invocation: '/superpowers:brainstorming',
      source: 'plugin:superpowers',
    });
    assert.equal(owner, 'superpowers');
  });

  it('tags plugin:sdd skills as "sdd"', () => {
    const owner = tagPipelineOwner({
      id: 'plugin:sdd:plan',
      invocation: '/sdd:plan',
      source: 'plugin:sdd',
    });
    assert.equal(owner, 'sdd');
  });

  it('tags plugin:compound-engineering skills as "compound-engineering"', () => {
    const owner = tagPipelineOwner({
      id: 'plugin:compound-engineering:ce-plan',
      invocation: '/compound-engineering:ce-plan',
      source: 'plugin:compound-engineering',
    });
    assert.equal(owner, 'compound-engineering');
  });

  it('tags plugin:pipeline-orchestrator skills as "pipeline-orchestrator"', () => {
    const owner = tagPipelineOwner({
      id: 'plugin:pipeline-orchestrator:pipeline',
      invocation: '/pipeline-orchestrator:pipeline',
      source: 'plugin:pipeline-orchestrator',
    });
    assert.equal(owner, 'pipeline-orchestrator');
  });

  it('tags kiro skills by invocation prefix /kiro-', () => {
    const owner = tagPipelineOwner({
      id: 'plugin:cc-mastery:kiro-discovery',
      invocation: '/kiro-discovery',
      source: 'plugin:cc-mastery',
    });
    assert.equal(owner, 'kiro');
  });

  it('tags kiro skills by id containing "kiro:"', () => {
    const owner = tagPipelineOwner({
      id: 'plugin:someplugin:kiro:spec',
      invocation: '/someplugin:kiro:spec',
      source: 'plugin:someplugin',
    });
    assert.equal(owner, 'kiro');
  });

  it('does NOT tag cc-mastery non-kiro skills as kiro', () => {
    const owner = tagPipelineOwner({
      id: 'plugin:cc-mastery:other-skill',
      invocation: '/cc-mastery:other-skill',
      source: 'plugin:cc-mastery',
    });
    assert.equal(owner, null);
  });

  it('tags global skills as null (standalone)', () => {
    const owner = tagPipelineOwner({
      id: 'global:investigate',
      invocation: '/investigate',
      source: 'global',
    });
    assert.equal(owner, null);
  });

  it('tags project skills as null (standalone)', () => {
    const owner = tagPipelineOwner({
      id: 'project:custom',
      invocation: '/custom',
      source: 'project',
    });
    assert.equal(owner, null);
  });

  it('tags mcp entries as null', () => {
    const owner = tagPipelineOwner({
      id: 'mcp:serena',
      invocation: 'mcp:serena',
      source: 'mcp',
    });
    assert.equal(owner, null);
  });

  it('integration: scanSkills-like entries get a pipeline_owner field', () => {
    const entry = { id: 'plugin:sdd:plan', invocation: '/sdd:plan', source: 'plugin:sdd' };
    const tagged = { ...entry, pipeline_owner: tagPipelineOwner(entry) };
    assert.equal(tagged.pipeline_owner, 'sdd');
  });
});

// T7: CANONICAL_FLOWS parity with PIPELINE_OWNERS
describe('T7: CANONICAL_FLOWS parity invariant', () => {
  const { PIPELINE_OWNERS, CANONICAL_FLOWS } = require('../lib/constants');

  it('Object.keys(CANONICAL_FLOWS) equals PIPELINE_OWNERS as a set', () => {
    const canonicalKeys = Object.keys(CANONICAL_FLOWS).slice().sort();
    const owners = PIPELINE_OWNERS.slice().sort();
    assert.deepEqual(canonicalKeys, owners);
  });

  it('every CANONICAL_FLOWS value is a non-empty array of strings', () => {
    for (const [owner, flow] of Object.entries(CANONICAL_FLOWS)) {
      assert.ok(Array.isArray(flow), `${owner} flow must be an array`);
      assert.ok(flow.length > 0, `${owner} flow must not be empty`);
      for (const invocation of flow) {
        assert.equal(typeof invocation, 'string', `${owner} flow contains non-string invocation`);
        assert.ok(invocation.startsWith('/'), `${owner} invocation must start with '/'`);
      }
    }
  });
});

// T9: PIPELINE_FINGERPRINTS parity with PIPELINE_OWNERS
describe('T9: PIPELINE_FINGERPRINTS parity invariant', () => {
  const { PIPELINE_OWNERS, PIPELINE_FINGERPRINTS } = require('../lib/constants');

  it('Object.keys(PIPELINE_FINGERPRINTS) equals PIPELINE_OWNERS as a set', () => {
    const fingerprintKeys = Object.keys(PIPELINE_FINGERPRINTS).slice().sort();
    const owners = PIPELINE_OWNERS.slice().sort();
    assert.deepEqual(fingerprintKeys, owners);
  });

  it('every fingerprint entry has best_for/typical_tasks/not_for/complexity_match', () => {
    const COMPLEXITIES = ['simple', 'medium', 'complex'];
    for (const [owner, fp] of Object.entries(PIPELINE_FINGERPRINTS)) {
      assert.equal(typeof fp.best_for, 'string', `${owner}.best_for must be string`);
      assert.ok(Array.isArray(fp.typical_tasks), `${owner}.typical_tasks must be array`);
      assert.ok(Array.isArray(fp.not_for), `${owner}.not_for must be array`);
      assert.ok(Array.isArray(fp.complexity_match), `${owner}.complexity_match must be array`);
      for (const c of fp.complexity_match) {
        assert.ok(COMPLEXITIES.includes(c), `${owner}.complexity_match contains invalid value: ${c}`);
      }
    }
  });
});

// T3: validateRouterOutput rejects mixed-owner loadouts
describe('T3: validateRouterOutput — mixed-owner rejection', () => {
  const { validateRouterOutput } = require('../lib/schemas');

  const baseEntry = (owner) => ({
    invocation: owner ? `/${owner}:skill` : '/investigate',
    category: 'planning',
    role: 'planning',
    confidence: 0.9,
    reason: 'test',
    depends_on: [],
    pipeline_owner: owner,
    alternatives: [],
  });

  it('accepts all-standalone loadout (all pipeline_owner null)', () => {
    const out = {
      clarification_needed: false,
      task_complexity: 'medium',
      reasoning: 'standalone composition',
      loadout: [baseEntry(null), baseEntry(null), baseEntry(null)],
      excluded: [],
      estimated_context_tokens: 10000,
      risk: 'low',
    };
    const result = validateRouterOutput(out);
    assert.equal(result.valid, true, `expected valid, got errors: ${result.errors.join(', ')}`);
  });

  it('accepts all-same-owner loadout (all entries share one owner)', () => {
    const out = {
      clarification_needed: false,
      task_complexity: 'complex',
      reasoning: 'kiro canonical flow',
      loadout: [baseEntry('kiro'), baseEntry('kiro'), baseEntry('kiro'), baseEntry('kiro')],
      excluded: [],
      estimated_context_tokens: 15000,
      risk: 'medium',
    };
    const result = validateRouterOutput(out);
    assert.equal(result.valid, true, `expected valid, got errors: ${result.errors.join(', ')}`);
  });

  it('rejects mixed-owner loadout with two non-null distinct owners', () => {
    const out = {
      clarification_needed: false,
      task_complexity: 'medium',
      reasoning: 'mixed, invalid',
      loadout: [baseEntry('kiro'), baseEntry('superpowers')],
      excluded: [],
      estimated_context_tokens: 10000,
      risk: 'low',
    };
    const result = validateRouterOutput(out);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some(e => /pipeline_owner|mixed/i.test(e)),
      `expected a mixed-owner error, got: ${result.errors.join(', ')}`,
    );
  });

  it('rejects mixed-owner loadout where one entry is standalone and one is owned', () => {
    const out = {
      clarification_needed: false,
      task_complexity: 'medium',
      reasoning: 'standalone + owner = invalid',
      loadout: [baseEntry(null), baseEntry('sdd')],
      excluded: [],
      estimated_context_tokens: 10000,
      risk: 'low',
    };
    const result = validateRouterOutput(out);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some(e => /pipeline_owner|mixed/i.test(e)),
      `expected a mixed-owner error, got: ${result.errors.join(', ')}`,
    );
  });
});
