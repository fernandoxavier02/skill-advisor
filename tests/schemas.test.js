const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateIndexEntry,
  validateGraphNode,
  validateGraphEdge,
  validateSkillCardV2,
  validatePipelineSpec,
  validateCatalogEntry,
  validateEmbeddingMeta,
  validateGateDecision,
} = require('../lib/schemas');

// ---------------------------------------------------------------------------
// validateIndexEntry
// ---------------------------------------------------------------------------
describe('validateIndexEntry', () => {
  const validEntry = {
    id: 'global:test-skill',
    type: 'skill',
    source: 'global',
    name: 'test-skill',
    description: 'A test skill',
    invocation: '/test-skill',
    category: 'utility',
  };

  it('returns valid for a complete entry', () => {
    const result = validateIndexEntry(validEntry);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('returns valid for entry with only required fields', () => {
    const result = validateIndexEntry({ id: 'x', type: 'command', name: 'foo' });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('reports missing required id', () => {
    const result = validateIndexEntry({ type: 'skill', name: 'foo' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('id')));
  });

  it('reports missing required type', () => {
    const result = validateIndexEntry({ id: 'x', name: 'foo' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('type')));
  });

  it('reports missing required name', () => {
    const result = validateIndexEntry({ id: 'x', type: 'skill' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('name')));
  });

  it('reports invalid type enum', () => {
    const result = validateIndexEntry({ id: 'x', type: 'invalid', name: 'foo' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('type')));
  });

  it('reports wrong type for id (number)', () => {
    const result = validateIndexEntry({ id: 123, type: 'skill', name: 'foo' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('id')));
  });

  it('reports errors for null input', () => {
    const result = validateIndexEntry(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('reports errors for empty object', () => {
    const result = validateIndexEntry({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 3); // id, type, name all required
  });

  it('accepts all valid type values', () => {
    for (const type of ['skill', 'command', 'agent', 'mcp']) {
      const result = validateIndexEntry({ id: 'x', type, name: 'foo' });
      assert.equal(result.valid, true, `type "${type}" should be valid`);
    }
  });
});

// ---------------------------------------------------------------------------
// validateGraphNode — concept subtype
// ---------------------------------------------------------------------------
describe('validateGraphNode (concept)', () => {
  const validConcept = {
    type: 'concept',
    name: 'testing',
    aliases: ['test', 'tdd'],
    edges: [],
    domain: 'quality',
  };

  it('returns valid for a complete concept node', () => {
    const result = validateGraphNode(validConcept);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('reports missing domain for concept', () => {
    const result = validateGraphNode({ type: 'concept', name: 'x', aliases: [] });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('domain')));
  });

  it('reports invalid type enum', () => {
    const result = validateGraphNode({ type: 'invalid', name: 'x', aliases: [] });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('type')));
  });
});

// ---------------------------------------------------------------------------
// validateGraphNode — skill subtype
// ---------------------------------------------------------------------------
describe('validateGraphNode (skill)', () => {
  const validSkill = {
    type: 'skill',
    name: 'review',
    aliases: ['pr-review'],
    edges: [],
    invocation: '/review',
    category: 'quality',
    inputs: ['diff'],
    outputs: ['report'],
    estimated_tokens: 500,
  };

  it('returns valid for a complete skill node', () => {
    const result = validateGraphNode(validSkill);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('returns valid without optional fields', () => {
    const result = validateGraphNode({
      type: 'skill', name: 'x', aliases: [],
      invocation: '/x', category: 'utility',
    });
    assert.equal(result.valid, true);
  });

  it('reports missing invocation for skill', () => {
    const result = validateGraphNode({
      type: 'skill', name: 'x', aliases: [], category: 'utility',
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('invocation')));
  });

  it('reports missing category for skill', () => {
    const result = validateGraphNode({
      type: 'skill', name: 'x', aliases: [], invocation: '/x',
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('category')));
  });
});

// ---------------------------------------------------------------------------
// validateGraphNode — pipeline subtype
// ---------------------------------------------------------------------------
describe('validateGraphNode (pipeline)', () => {
  const validPipeline = {
    type: 'pipeline',
    name: 'ship-it',
    aliases: ['release'],
    edges: [],
    steps: ['review', 'deploy'],
    triggers: ['push'],
  };

  it('returns valid for a complete pipeline node', () => {
    const result = validateGraphNode(validPipeline);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('returns valid without optional triggers', () => {
    const result = validateGraphNode({
      type: 'pipeline', name: 'x', aliases: [], steps: ['a'],
    });
    assert.equal(result.valid, true);
  });

  it('reports missing steps for pipeline', () => {
    const result = validateGraphNode({
      type: 'pipeline', name: 'x', aliases: [],
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('steps')));
  });
});

// ---------------------------------------------------------------------------
// validateGraphNode — common checks
// ---------------------------------------------------------------------------
describe('validateGraphNode (common)', () => {
  it('reports errors for null input', () => {
    const result = validateGraphNode(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('reports errors for empty object', () => {
    const result = validateGraphNode({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 3); // type, name, aliases
  });

  it('reports missing required name', () => {
    const result = validateGraphNode({ type: 'concept', aliases: [], domain: 'x' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('name')));
  });

  it('reports missing required aliases', () => {
    const result = validateGraphNode({ type: 'concept', name: 'x', domain: 'x' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('aliases')));
  });

  it('reports wrong type for aliases (string instead of array)', () => {
    const result = validateGraphNode({ type: 'concept', name: 'x', aliases: 'not-array', domain: 'x' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('aliases')));
  });

  it('accepts all valid type values', () => {
    for (const type of ['concept', 'skill', 'pipeline']) {
      const base = { type, name: 'x', aliases: [] };
      if (type === 'concept') base.domain = 'x';
      if (type === 'skill') { base.invocation = '/x'; base.category = 'utility'; }
      if (type === 'pipeline') base.steps = ['a'];
      const result = validateGraphNode(base);
      assert.equal(result.valid, true, `type "${type}" should be valid`);
    }
  });
});

// ---------------------------------------------------------------------------
// validateGraphEdge
// ---------------------------------------------------------------------------
describe('validateGraphEdge', () => {
  const validEdge = {
    source: 'concept:x',
    target: 'skill:y',
    type: 'explicit',
    weight: 1.0,
  };

  it('returns valid for a complete edge', () => {
    const result = validateGraphEdge(validEdge);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('returns valid without optional weight', () => {
    const result = validateGraphEdge({ source: 'a', target: 'b', type: 'semantic_strong' });
    assert.equal(result.valid, true);
  });

  it('reports missing required source', () => {
    const result = validateGraphEdge({ target: 'b', type: 'explicit' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('source')));
  });

  it('reports missing required target', () => {
    const result = validateGraphEdge({ source: 'a', type: 'explicit' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('target')));
  });

  it('reports invalid type enum', () => {
    const result = validateGraphEdge({ source: 'a', target: 'b', type: 'invalid' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('type')));
  });

  it('reports wrong type for weight (string)', () => {
    const result = validateGraphEdge({ source: 'a', target: 'b', type: 'explicit', weight: 'high' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('weight')));
  });

  it('reports errors for null input', () => {
    const result = validateGraphEdge(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('reports errors for empty object', () => {
    const result = validateGraphEdge({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 3); // source, target, type
  });

  it('accepts all valid type values', () => {
    for (const type of ['explicit', 'semantic_strong', 'semantic_weak']) {
      const result = validateGraphEdge({ source: 'a', target: 'b', type });
      assert.equal(result.valid, true, `edge type "${type}" should be valid`);
    }
  });
});

// ---------------------------------------------------------------------------
// validateSkillCardV2
// ---------------------------------------------------------------------------
describe('validateSkillCardV2', () => {
  const validV1 = {
    aliases: ['review'],
    type: 'slash',
    source: 'plugin:test',
    invocation: '/review',
    category: 'quality',
  };

  const validV2 = {
    ...validV1,
    autonomy: 'gated',
    workflow_steps: ['analyze', 'report'],
    works_well_with: ['test'],
    often_precedes: ['deploy'],
    often_follows: ['plan'],
    incompatible_with: ['skip-ci'],
    estimated_minutes: 5,
    complexity: 'medium',
  };

  it('returns valid for v1-only fields', () => {
    const result = validateSkillCardV2(validV1);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('returns valid for full v2 fields', () => {
    const result = validateSkillCardV2(validV2);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('reports missing required aliases', () => {
    const { aliases, ...noAliases } = validV1;
    const result = validateSkillCardV2(noAliases);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('aliases')));
  });

  it('reports invalid autonomy enum', () => {
    const result = validateSkillCardV2({ ...validV1, autonomy: 'invalid' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('autonomy')));
  });

  it('accepts valid autonomy values', () => {
    for (const autonomy of ['auto', 'gated']) {
      const result = validateSkillCardV2({ ...validV1, autonomy });
      assert.equal(result.valid, true, `autonomy "${autonomy}" should be valid`);
    }
  });

  it('reports errors for null input', () => {
    const result = validateSkillCardV2(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('reports errors for empty object', () => {
    const result = validateSkillCardV2({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 5); // aliases, type, source, invocation, category
  });

  it('reports wrong type for aliases (string instead of array)', () => {
    const result = validateSkillCardV2({ ...validV1, aliases: 'not-array' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('aliases')));
  });

  it('v2 fields are optional and not required', () => {
    // Only v1 required fields, no v2 fields at all
    const result = validateSkillCardV2(validV1);
    assert.equal(result.valid, true);
  });
});

// ---------------------------------------------------------------------------
// validatePipelineSpec
// ---------------------------------------------------------------------------
describe('validatePipelineSpec', () => {
  const validSpec = {
    pipeline_id: 'ship-v1',
    task: 'Ship the feature',
    status: 'PLANNED',
    mode: 'gated',
    phases: [{ id: 'p1', skill: 'review' }],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  it('returns valid for a complete spec', () => {
    const result = validatePipelineSpec(validSpec);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('returns valid with only required fields', () => {
    const result = validatePipelineSpec({
      pipeline_id: 'x', status: 'EXECUTING', phases: [],
    });
    assert.equal(result.valid, true);
  });

  it('reports missing required pipeline_id', () => {
    const { pipeline_id, ...noId } = validSpec;
    const result = validatePipelineSpec(noId);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('pipeline_id')));
  });

  it('reports missing required status', () => {
    const { status, ...noStatus } = validSpec;
    const result = validatePipelineSpec(noStatus);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('status')));
  });

  it('reports missing required phases', () => {
    const { phases, ...noPhases } = validSpec;
    const result = validatePipelineSpec(noPhases);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('phases')));
  });

  it('reports invalid status enum', () => {
    const result = validatePipelineSpec({ ...validSpec, status: 'INVALID' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('status')));
  });

  it('reports invalid mode enum', () => {
    const result = validatePipelineSpec({ ...validSpec, mode: 'invalid' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('mode')));
  });

  it('reports wrong type for phases (string)', () => {
    const result = validatePipelineSpec({ ...validSpec, phases: 'not-array' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('phases')));
  });

  it('reports errors for null input', () => {
    const result = validatePipelineSpec(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('reports errors for empty object', () => {
    const result = validatePipelineSpec({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 3); // pipeline_id, status, phases
  });

  it('accepts all valid status values', () => {
    for (const status of ['PLANNED', 'CLARIFIED', 'EXECUTING', 'COMPLETED', 'PARTIAL', 'FAILED']) {
      const result = validatePipelineSpec({ pipeline_id: 'x', status, phases: [] });
      assert.equal(result.valid, true, `status "${status}" should be valid`);
    }
  });

  it('accepts all valid mode values', () => {
    for (const mode of ['gated', 'auto']) {
      const result = validatePipelineSpec({ pipeline_id: 'x', status: 'PLANNED', phases: [], mode });
      assert.equal(result.valid, true, `mode "${mode}" should be valid`);
    }
  });
});

// ---------------------------------------------------------------------------
// validateCatalogEntry
// ---------------------------------------------------------------------------
describe('validateCatalogEntry', () => {
  const validEntry = {
    id: 'test:foo',
    type: 'skill',
    name: 'foo',
    sourcePath: '/path/to/foo',
    content: 'Skill content',
    pluginName: 'test-plugin',
  };

  it('returns valid for a complete entry', () => {
    const result = validateCatalogEntry(validEntry);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('returns valid with only required fields', () => {
    const result = validateCatalogEntry({ id: 'x', type: 'skill', name: 'foo', sourcePath: '/p' });
    assert.equal(result.valid, true);
  });

  it('reports missing required id', () => {
    const result = validateCatalogEntry({ type: 'skill', name: 'foo', sourcePath: '/p' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('id')));
  });

  it('reports missing required type', () => {
    const result = validateCatalogEntry({ id: 'x', name: 'foo', sourcePath: '/p' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('type')));
  });

  it('reports missing required name', () => {
    const result = validateCatalogEntry({ id: 'x', type: 'skill', sourcePath: '/p' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('name')));
  });

  it('reports missing required sourcePath', () => {
    const result = validateCatalogEntry({ id: 'x', type: 'skill', name: 'foo' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('sourcePath')));
  });

  it('reports wrong type for id (number)', () => {
    const result = validateCatalogEntry({ id: 42, type: 'skill', name: 'foo', sourcePath: '/p' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('id')));
  });

  it('reports errors for null input', () => {
    const result = validateCatalogEntry(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('reports errors for empty object', () => {
    const result = validateCatalogEntry({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 4); // id, type, name, sourcePath
  });
});

// ---------------------------------------------------------------------------
// validateEmbeddingMeta
// ---------------------------------------------------------------------------
describe('validateEmbeddingMeta', () => {
  const validMeta = {
    provider: 'local',
    model: 'all-MiniLM-L6-v2',
    dimensions: 384,
    timestamp: '2025-01-01T00:00:00Z',
  };

  it('returns valid for a complete meta', () => {
    const result = validateEmbeddingMeta(validMeta);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('returns valid with only required fields', () => {
    const result = validateEmbeddingMeta({ provider: 'local', model: 'x', dimensions: 128 });
    assert.equal(result.valid, true);
  });

  it('reports missing required provider', () => {
    const result = validateEmbeddingMeta({ model: 'x', dimensions: 128 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('provider')));
  });

  it('reports missing required model', () => {
    const result = validateEmbeddingMeta({ provider: 'local', dimensions: 128 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('model')));
  });

  it('reports missing required dimensions', () => {
    const result = validateEmbeddingMeta({ provider: 'local', model: 'x' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('dimensions')));
  });

  it('reports dimensions must be > 0', () => {
    const result = validateEmbeddingMeta({ provider: 'local', model: 'x', dimensions: 0 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('dimensions')));
  });

  it('reports negative dimensions', () => {
    const result = validateEmbeddingMeta({ provider: 'local', model: 'x', dimensions: -1 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('dimensions')));
  });

  it('reports wrong type for dimensions (string)', () => {
    const result = validateEmbeddingMeta({ provider: 'local', model: 'x', dimensions: '384' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('dimensions')));
  });

  it('reports errors for null input', () => {
    const result = validateEmbeddingMeta(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('reports errors for empty object', () => {
    const result = validateEmbeddingMeta({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 3); // provider, model, dimensions
  });
});

// ---------------------------------------------------------------------------
// validateGateDecision
// ---------------------------------------------------------------------------
describe('validateGateDecision', () => {
  const validDecision = {
    phase_id: 'p1',
    skill: 'review',
    status: 'pass',
    reason: 'All checks passed',
    timestamp: '2025-01-01T00:00:00Z',
    outputs_validated: true,
  };

  it('returns valid for a complete decision', () => {
    const result = validateGateDecision(validDecision);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('returns valid with only required fields', () => {
    const result = validateGateDecision({ phase_id: 'p1', skill: 'review', status: 'fail', reason: 'Failed' });
    assert.equal(result.valid, true);
  });

  it('reports missing required phase_id', () => {
    const result = validateGateDecision({ skill: 'review', status: 'pass', reason: 'ok' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('phase_id')));
  });

  it('reports missing required skill', () => {
    const result = validateGateDecision({ phase_id: 'p1', status: 'pass', reason: 'ok' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('skill')));
  });

  it('reports missing required status', () => {
    const result = validateGateDecision({ phase_id: 'p1', skill: 'review', reason: 'ok' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('status')));
  });

  it('reports missing required reason', () => {
    const result = validateGateDecision({ phase_id: 'p1', skill: 'review', status: 'pass' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('reason')));
  });

  it('reports invalid status enum', () => {
    const result = validateGateDecision({ ...validDecision, status: 'invalid' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('status')));
  });

  it('reports wrong type for outputs_validated (string)', () => {
    const result = validateGateDecision({ ...validDecision, outputs_validated: 'yes' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('outputs_validated')));
  });

  it('reports errors for null input', () => {
    const result = validateGateDecision(null);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('reports errors for empty object', () => {
    const result = validateGateDecision({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 4); // phase_id, skill, status, reason
  });

  it('accepts all valid status values', () => {
    for (const status of ['pass', 'fail', 'retry', 'escalate']) {
      const result = validateGateDecision({ phase_id: 'p1', skill: 'review', status, reason: 'test' });
      assert.equal(result.valid, true, `status "${status}" should be valid`);
    }
  });
});
