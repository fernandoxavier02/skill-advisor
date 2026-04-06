const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateGateOutput } = require('../lib/schemas');

describe('validateGateOutput', () => {
  const validOutput = {
    gate_token: 'gate-abc123',
    decision: 'approve',
    moment2_decision: 'approve',
    loadout: [{ position: 1, invocation: '/investigate' }],
    original_loadout: [{ position: 1, invocation: '/investigate' }],
    spec_path: '.specs/pipelines/test-2026-04-05.md',
    planning_skill_used: '/sdd:plan',
    brainstorm_summary: null,
    iterations: { moment1_alterar: 0, moment1_sugerir: 0, moment2_alterar: 0, moment2_sugerir: 0 },
    error: null,
  };

  it('accepts valid gate output', () => {
    const result = validateGateOutput(validOutput);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('rejects missing gate_token', () => {
    const bad = { ...validOutput, gate_token: undefined };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('gate_token')));
  });

  it('rejects gate_token not starting with "gate-"', () => {
    const bad = { ...validOutput, gate_token: 'invalid-token' };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects invalid decision enum', () => {
    const bad = { ...validOutput, decision: 'maybe' };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects invalid moment2_decision enum', () => {
    const bad = { ...validOutput, moment2_decision: 'dunno' };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('accepts null optional fields', () => {
    const minimal = {
      ...validOutput,
      spec_path: null,
      planning_skill_used: null,
      brainstorm_summary: null,
      error: null,
    };
    const result = validateGateOutput(minimal);
    assert.equal(result.valid, true);
  });

  it('rejects missing loadout', () => {
    const bad = { ...validOutput, loadout: undefined };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects non-array loadout', () => {
    const bad = { ...validOutput, loadout: 'not-array' };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects missing iterations', () => {
    const bad = { ...validOutput, iterations: undefined };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects iterations with missing keys', () => {
    const bad = { ...validOutput, iterations: { moment1_alterar: 0 } };
    const result = validateGateOutput(bad);
    assert.equal(result.valid, false);
  });

  it('rejects null input', () => {
    const result = validateGateOutput(null);
    assert.equal(result.valid, false);
  });

  it('accepts cancel decision with empty loadout', () => {
    const cancel = { ...validOutput, decision: 'cancel', loadout: [], moment2_decision: null };
    const result = validateGateOutput(cancel);
    assert.equal(result.valid, true);
  });
});
