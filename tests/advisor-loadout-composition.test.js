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
  it('rejects hallucinated pipeline_owner not in PIPELINE_OWNERS', () => {
    const out = {
      clarification_needed: false,
      task_complexity: 'complex',
      reasoning: 'hallucinated owner',
      loadout: [baseEntry('superpowers-v2')],
      excluded: [],
      estimated_context_tokens: 5000,
      risk: 'low',
    };
    const result = validateRouterOutput(out);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some(e => /pipeline_owner.*not.*recognized|unknown.*pipeline_owner/i.test(e)),
      `expected unknown-owner error, got: ${result.errors.join(', ')}`,
    );
  });

  it('accepts valid pipeline_owner from PIPELINE_OWNERS', () => {
    const out = {
      clarification_needed: false,
      task_complexity: 'complex',
      reasoning: 'valid owner',
      loadout: [baseEntry('superpowers'), baseEntry('superpowers'), baseEntry('superpowers'), baseEntry('superpowers')],
      excluded: [],
      estimated_context_tokens: 15000,
      risk: 'medium',
    };
    const result = validateRouterOutput(out);
    assert.equal(result.valid, true, `expected valid, got: ${result.errors.join(', ')}`);
  });
});

// T8: Backward compatibility — legacy outputs still validate
describe('T8: backward compatibility for missing optional fields', () => {
  const { validateRouterOutput } = require('../lib/schemas');
  const { tagPipelineOwner } = require('../lib/loadout');

  const legacyEntry = {
    position: 1,
    invocation: '/investigate',
    category: 'debugging',
    role: 'diagnose',
    reason: 'test',
    depends_on: [],
    // NOTE: no pipeline_owner, no alternatives
  };

  it('accepts router output without task_complexity (no bounds enforced)', () => {
    const out = {
      clarification_needed: false,
      reasoning: 'legacy v1 output, no task_complexity',
      loadout: [legacyEntry, legacyEntry, legacyEntry, legacyEntry, legacyEntry, legacyEntry, legacyEntry],
      excluded: [],
      estimated_context_tokens: 10000,
      risk: 'low',
    };
    const result = validateRouterOutput(out);
    assert.equal(result.valid, true, `expected valid without task_complexity, got: ${result.errors.join(', ')}`);
  });

  it('accepts router output without matched_fingerprint', () => {
    const out = {
      clarification_needed: false,
      task_complexity: 'medium',
      reasoning: 'no fingerprint field',
      loadout: [legacyEntry, legacyEntry, legacyEntry],
      excluded: [],
      estimated_context_tokens: 10000,
      risk: 'low',
    };
    const result = validateRouterOutput(out);
    assert.equal(result.valid, true, `expected valid without matched_fingerprint, got: ${result.errors.join(', ')}`);
  });

  it('accepts per-entry alternatives missing (legacy entries)', () => {
    const out = {
      clarification_needed: false,
      task_complexity: 'medium',
      reasoning: 'legacy entries without alternatives',
      loadout: [legacyEntry, legacyEntry, legacyEntry],
      excluded: [],
      estimated_context_tokens: 10000,
      risk: 'low',
    };
    const result = validateRouterOutput(out);
    assert.equal(result.valid, true, `expected valid without alternatives, got: ${result.errors.join(', ')}`);
  });

  it('tagPipelineOwner: index entry without pipeline_owner treated as null on consumers', () => {
    // Legacy index entry has no pipeline_owner field at all
    const legacyIndexEntry = {
      id: 'global:investigate',
      type: 'skill',
      source: 'global',
      name: 'investigate',
      invocation: '/investigate',
      category: 'debugging',
    };
    // Consumer contract: missing pipeline_owner must behave like null
    const owner = legacyIndexEntry.pipeline_owner === undefined ? null : legacyIndexEntry.pipeline_owner;
    assert.equal(owner, null);
    // And re-tagging produces the same result
    assert.equal(tagPipelineOwner(legacyIndexEntry), null);
  });

  it('accepts null matched_fingerprint explicitly', () => {
    const out = {
      clarification_needed: false,
      task_complexity: 'simple',
      matched_fingerprint: null,
      reasoning: 'explicit null',
      loadout: [legacyEntry],
      excluded: [],
      estimated_context_tokens: 5000,
      risk: 'low',
    };
    const result = validateRouterOutput(out);
    assert.equal(result.valid, true, `got: ${result.errors.join(', ')}`);
  });
});

// T4: gate collapse — materialize a full loadout from CANONICAL_FLOWS
describe('T4: collapseToCanonicalFlow materialization', () => {
  const { collapseToCanonicalFlow } = require('../lib/loadout');
  const { CANONICAL_FLOWS } = require('../lib/constants');

  it('produces a loadout of length CANONICAL_FLOWS[owner].length for superpowers', () => {
    const collapsed = collapseToCanonicalFlow('superpowers', FIXTURE_INDEX);
    assert.equal(collapsed.length, CANONICAL_FLOWS['superpowers'].length);
  });

  it('every invocation matches CANONICAL_FLOWS order', () => {
    const collapsed = collapseToCanonicalFlow('kiro', FIXTURE_INDEX);
    const invocations = collapsed.map(e => e.invocation);
    assert.deepEqual(invocations, CANONICAL_FLOWS['kiro'].slice());
  });

  it('every entry carries role/category/confidence/reason/depends_on', () => {
    const collapsed = collapseToCanonicalFlow('sdd', FIXTURE_INDEX);
    for (let i = 0; i < collapsed.length; i++) {
      const e = collapsed[i];
      assert.equal(typeof e.role, 'string', `entry ${i} role`);
      assert.equal(typeof e.category, 'string', `entry ${i} category`);
      assert.equal(typeof e.confidence, 'number', `entry ${i} confidence`);
      assert.equal(typeof e.reason, 'string', `entry ${i} reason`);
      assert.ok(Array.isArray(e.depends_on), `entry ${i} depends_on`);
      assert.equal(e.pipeline_owner, 'sdd', `entry ${i} pipeline_owner`);
      assert.equal(e.confidence, 1.0, `canonical confidence must be 1.0`);
    }
  });

  it('first position has empty depends_on, position N depends on [N-1]', () => {
    const collapsed = collapseToCanonicalFlow('compound-engineering', FIXTURE_INDEX);
    assert.deepEqual(collapsed[0].depends_on, []);
    for (let i = 1; i < collapsed.length; i++) {
      assert.deepEqual(collapsed[i].depends_on, [i], `entry at index ${i}`);
    }
  });

  it('single-skill flows (pipeline-orchestrator) produce a 1-entry loadout', () => {
    const collapsed = collapseToCanonicalFlow('pipeline-orchestrator', FIXTURE_INDEX);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].invocation, '/pipeline-orchestrator:pipeline');
    assert.deepEqual(collapsed[0].depends_on, []);
  });

  it('throws for unknown owner', () => {
    assert.throws(
      () => collapseToCanonicalFlow('no-such-owner', FIXTURE_INDEX),
      /unknown pipeline owner|CANONICAL_FLOWS/i,
    );
  });

  it('throws if a CANONICAL_FLOWS invocation is missing from the index snapshot', () => {
    const partialIndex = FIXTURE_INDEX.filter(e => e.invocation !== '/superpowers:writing-plans');
    assert.throws(
      () => collapseToCanonicalFlow('superpowers', partialIndex),
      /writing-plans|not found|missing/i,
    );
  });

  it('default reason mentions the owner', () => {
    const collapsed = collapseToCanonicalFlow('sdd', FIXTURE_INDEX);
    for (const e of collapsed) {
      assert.match(e.reason, /sdd/i);
    }
  });
});

// T5: swap at position preserves other positions byte-identical
describe('T5: swapAtPosition — local positional substitution', () => {
  const { swapAtPosition } = require('../lib/loadout');

  const sampleLoadout = () => [
    { invocation: '/investigate', role: 'debugging', category: 'debugging', confidence: 0.9, reason: 'diagnose', depends_on: [], pipeline_owner: null },
    { invocation: '/fix', role: 'debugging', category: 'debugging', confidence: 0.85, reason: 'apply fix', depends_on: [0], pipeline_owner: null },
    { invocation: '/review', role: 'quality', category: 'quality', confidence: 0.8, reason: 'pre-landing review', depends_on: [1], pipeline_owner: null },
    { invocation: '/commit', role: 'deployment', category: 'deployment', confidence: 0.75, reason: 'conventional commit', depends_on: [2], pipeline_owner: null },
  ];

  it('replaces only the entry at the given position', () => {
    const original = sampleLoadout();
    const replacement = { invocation: '/verify', role: 'quality', category: 'quality', confidence: 0.9, reason: 'fresh evidence', depends_on: [1], pipeline_owner: null };
    const swapped = swapAtPosition(original, 2, replacement);
    assert.equal(swapped[2].invocation, '/verify');
    assert.equal(swapped[2].reason, 'fresh evidence');
  });

  it('preserves other positions with deep equality', () => {
    const original = sampleLoadout();
    const replacement = { invocation: '/verify', role: 'quality', category: 'quality', confidence: 0.9, reason: 'fresh evidence', depends_on: [1], pipeline_owner: null };
    const swapped = swapAtPosition(original, 2, replacement);
    assert.deepEqual(swapped[0], original[0], 'position 0 must be unchanged');
    assert.deepEqual(swapped[1], original[1], 'position 1 must be unchanged');
    assert.deepEqual(swapped[3], original[3], 'position 3 must be unchanged');
  });

  it('does NOT mutate the original loadout', () => {
    const original = sampleLoadout();
    const snapshot = JSON.parse(JSON.stringify(original));
    const replacement = { invocation: '/verify', role: 'quality', category: 'quality', confidence: 0.9, reason: 'fresh', depends_on: [1], pipeline_owner: null };
    swapAtPosition(original, 2, replacement);
    assert.deepEqual(original, snapshot, 'original loadout must remain byte-identical');
  });

  it('depends_on arrays elsewhere are NOT rewritten (position-indexed)', () => {
    const original = sampleLoadout();
    const replacement = { invocation: '/fix', role: 'debugging', category: 'debugging', confidence: 0.95, reason: 'alternate fixer', depends_on: [0], pipeline_owner: null };
    const swapped = swapAtPosition(original, 1, replacement);
    // downstream entries still reference [1] as their dependency;
    // the swapped entry at position 1 is assumed to satisfy the role.
    assert.deepEqual(swapped[2].depends_on, [1]);
    assert.deepEqual(swapped[3].depends_on, [2]);
  });

  it('throws when position is out of bounds', () => {
    const original = sampleLoadout();
    const replacement = { invocation: '/x', role: 'utility', category: 'utility', confidence: 0.5, reason: 'r', depends_on: [], pipeline_owner: null };
    assert.throws(() => swapAtPosition(original, 99, replacement), /out of bounds|invalid position/i);
    assert.throws(() => swapAtPosition(original, -1, replacement), /out of bounds|invalid position/i);
  });

  it('throws when replacement lacks an invocation', () => {
    const original = sampleLoadout();
    assert.throws(() => swapAtPosition(original, 0, { role: 'nope' }), /invocation/i);
  });
});

// T6: fixture-index invariant — every CANONICAL_FLOWS invocation exists in fixture
describe('T6: fixture-index invariant', () => {
  const { CANONICAL_FLOWS } = require('../lib/constants');

  it('every invocation in CANONICAL_FLOWS is present in fixture index', () => {
    const fixtureInvocations = new Set(FIXTURE_INDEX.map(e => e.invocation));
    const missing = [];
    for (const [owner, flow] of Object.entries(CANONICAL_FLOWS)) {
      for (const invocation of flow) {
        if (!fixtureInvocations.has(invocation)) {
          missing.push(`${owner} → ${invocation}`);
        }
      }
    }
    assert.deepEqual(missing, [], `Missing invocations in fixture: ${missing.join(', ')}`);
  });

  it('every fixture skill tagged as a pipeline owner has its flow member available', () => {
    // For each owner present in fixture, CANONICAL_FLOWS[owner] must be fully resolvable
    const fixtureOwners = new Set(
      FIXTURE_INDEX.filter(e => e.pipeline_owner != null).map(e => e.pipeline_owner),
    );
    for (const owner of fixtureOwners) {
      assert.ok(CANONICAL_FLOWS[owner], `Owner "${owner}" appears in fixture but CANONICAL_FLOWS lacks it`);
    }
  });
});

// T2: task_complexity enum + loadout size bounds (standalone only)
describe('T2: task_complexity + size bounds', () => {
  const { validateRouterOutput } = require('../lib/schemas');

  const standalone = () => ({
    invocation: '/investigate', category: 'debugging', role: 'diag',
    confidence: 0.9, reason: 'r', depends_on: [], pipeline_owner: null,
  });

  const outputOf = (complexity, size) => ({
    clarification_needed: false,
    task_complexity: complexity,
    reasoning: 'test',
    loadout: Array.from({ length: size }, standalone),
    excluded: [],
    estimated_context_tokens: 5000,
    risk: 'low',
  });

  it('rejects invalid task_complexity enum value', () => {
    const out = outputOf('huge', 3);
    const result = validateRouterOutput(out);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => /task_complexity/.test(e)));
  });

  it('accepts simple with size 1', () => {
    assert.equal(validateRouterOutput(outputOf('simple', 1)).valid, true);
  });

  it('accepts simple with size 2', () => {
    assert.equal(validateRouterOutput(outputOf('simple', 2)).valid, true);
  });

  it('rejects simple with size 3', () => {
    const result = validateRouterOutput(outputOf('simple', 3));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => /simple bounds/.test(e)));
  });

  it('accepts medium with size 3', () => {
    assert.equal(validateRouterOutput(outputOf('medium', 3)).valid, true);
  });

  it('rejects medium with size 2', () => {
    const result = validateRouterOutput(outputOf('medium', 2));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => /medium bounds/.test(e)));
  });

  it('rejects medium with size 4', () => {
    const result = validateRouterOutput(outputOf('medium', 4));
    assert.equal(result.valid, false);
  });

  it('accepts complex with size 4', () => {
    assert.equal(validateRouterOutput(outputOf('complex', 4)).valid, true);
  });

  it('accepts complex with size 5', () => {
    assert.equal(validateRouterOutput(outputOf('complex', 5)).valid, true);
  });

  it('rejects complex with size 3', () => {
    const result = validateRouterOutput(outputOf('complex', 3));
    assert.equal(result.valid, false);
  });

  it('rejects complex with size 6', () => {
    const result = validateRouterOutput(outputOf('complex', 6));
    assert.equal(result.valid, false);
  });

  it('does NOT apply size bounds to pipeline-owned flows (size is dictated by CANONICAL_FLOWS)', () => {
    // e.g., pipeline-orchestrator has a 1-entry flow — even with complexity=complex it must pass
    const owned = {
      invocation: '/pipeline-orchestrator:pipeline', category: 'utility', role: 'pipeline',
      confidence: 1.0, reason: 'canonical', depends_on: [], pipeline_owner: 'pipeline-orchestrator',
    };
    const out = {
      clarification_needed: false,
      task_complexity: 'complex',
      reasoning: 'pipeline-orchestrator canonical',
      loadout: [owned], // length 1 but owner-dictated, not bound by complexity
      excluded: [],
      estimated_context_tokens: 5000,
      risk: 'low',
    };
    const result = validateRouterOutput(out);
    assert.equal(result.valid, true, `expected valid, got: ${result.errors.join(', ')}`);
  });
});

// T10: fingerprint-match routing produces the canonical flow
describe('T10: fingerprint-match routing', () => {
  const { validateRouterOutput } = require('../lib/schemas');
  const { collapseToCanonicalFlow } = require('../lib/loadout');
  const { CANONICAL_FLOWS } = require('../lib/constants');

  // Fixture router outputs: each simulates what the Sonnet-based router
  // would emit when it recognizes a task maps onto a pipelined plugin
  // end-to-end. The loadout is materialized from CANONICAL_FLOWS so the
  // fixture stays in sync with the constants (no byte-rotting snapshots).
  const routerOutputForOwner = (owner, taskDescription, complexity = 'complex') => ({
    clarification_needed: false,
    task_complexity: complexity,
    matched_fingerprint: owner,
    reasoning: `Task "${taskDescription}" matches ${owner} fingerprint — emitting canonical flow.`,
    loadout: collapseToCanonicalFlow(owner, FIXTURE_INDEX),
    excluded: [],
    estimated_context_tokens: 20000,
    risk: 'medium',
  });

  const fixtures = [
    { owner: 'kiro', task: 'create a spec for the auth refactor with approval gates' },
    { owner: 'superpowers', task: 'design and implement a new feature end-to-end with brainstorm + plan + verify' },
    { owner: 'pipeline-orchestrator', task: 'bug fix with root cause analysis and adversarial review' },
  ];

  for (const { owner, task } of fixtures) {
    it(`${owner}: matched_fingerprint equals owner for a matching task`, () => {
      const out = routerOutputForOwner(owner, task);
      assert.equal(out.matched_fingerprint, owner);
    });

    it(`${owner}: loadout.map(invocation) deep-equals CANONICAL_FLOWS[owner]`, () => {
      const out = routerOutputForOwner(owner, task);
      const invocations = out.loadout.map(e => e.invocation);
      assert.deepEqual(invocations, CANONICAL_FLOWS[owner].slice());
    });

    it(`${owner}: every entry carries pipeline_owner="${owner}"`, () => {
      const out = routerOutputForOwner(owner, task);
      for (const entry of out.loadout) {
        assert.equal(entry.pipeline_owner, owner);
      }
    });

    it(`${owner}: passes validateRouterOutput (same-owner, size dictated by flow)`, () => {
      const out = routerOutputForOwner(owner, task);
      const result = validateRouterOutput(out);
      assert.equal(result.valid, true, `got errors: ${result.errors.join(', ')}`);
    });
  }

  it('matched_fingerprint: null is valid when router falls through to standalone composition', () => {
    const out = {
      clarification_needed: false,
      task_complexity: 'medium',
      matched_fingerprint: null,
      reasoning: 'no fingerprint matched — compose standalone',
      loadout: [
        { invocation: '/investigate', category: 'debugging', role: 'diag', confidence: 0.9, reason: 'r', depends_on: [], pipeline_owner: null },
        { invocation: '/fix', category: 'debugging', role: 'fix', confidence: 0.85, reason: 'r', depends_on: [0], pipeline_owner: null },
        { invocation: '/review', category: 'quality', role: 'review', confidence: 0.8, reason: 'r', depends_on: [1], pipeline_owner: null },
      ],
      excluded: [],
      estimated_context_tokens: 8000,
      risk: 'low',
    };
    assert.equal(validateRouterOutput(out).valid, true);
  });
});

// ARCH-2: pipeline_owner invariant — every non-null owner in the fixture
// must be a member of PIPELINE_OWNERS. Catches drift if someone removes
// an owner from the list but leaves skills tagged with it.
describe('ARCH-2: pipeline_owner ∈ PIPELINE_OWNERS in fixture', () => {
  const { PIPELINE_OWNERS } = require('../lib/constants');

  it('every non-null pipeline_owner in fixture belongs to PIPELINE_OWNERS', () => {
    const violators = FIXTURE_INDEX
      .filter(e => e.pipeline_owner !== null && e.pipeline_owner !== undefined)
      .filter(e => !PIPELINE_OWNERS.includes(e.pipeline_owner))
      .map(e => `${e.id} → "${e.pipeline_owner}"`);

    assert.equal(
      violators.length, 0,
      `Fixture has entries with unrecognized pipeline_owner:\n${violators.join('\n')}`,
    );
  });
});
