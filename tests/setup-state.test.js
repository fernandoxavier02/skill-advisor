'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  STATE_SCHEMA_VERSION,
  KNOWN_STEPS,
  emptyState,
  readSetupState,
  writeSetupState,
  isStepCompleted,
  markStepCompleted,
  needsFullRerun,
  isFirstRun,
} = require('../lib/setup-state.js');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-state-test-'));
const MISSING = path.join(TMP_DIR, 'missing.json');
const MALFORMED = path.join(TMP_DIR, 'malformed.json');
const VALID = path.join(TMP_DIR, 'valid.json');
const WRITE_TARGET = path.join(TMP_DIR, 'write.json');

before(() => {
  fs.writeFileSync(MALFORMED, '{ not json');
  fs.writeFileSync(VALID, JSON.stringify({
    version: 1,
    advisor_version: '0.3.4',
    first_run_at: '2026-04-24T10:00:00Z',
    completed_at: '2026-04-24T10:05:00Z',
    completed_steps: ['index', 'embeddings'],
    plugins_detected: [
      { plugin_id: 'foo', user_decision: 'confirmed' },
    ],
  }));
});

after(() => {
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}
});

describe('emptyState', () => {
  it('returns schema-shaped object with no completed steps', () => {
    const s = emptyState('0.3.5');
    assert.equal(s.version, STATE_SCHEMA_VERSION);
    assert.equal(s.advisor_version, '0.3.5');
    assert.deepEqual(s.completed_steps, []);
    assert.deepEqual(s.plugins_detected, []);
  });
});

describe('readSetupState', () => {
  it('returns emptyState when file missing', () => {
    const s = readSetupState(MISSING);
    assert.deepEqual(s.completed_steps, []);
  });

  it('returns emptyState on malformed JSON (fail-soft)', () => {
    const s = readSetupState(MALFORMED);
    assert.deepEqual(s.completed_steps, []);
  });

  it('loads a valid state file', () => {
    const s = readSetupState(VALID);
    assert.equal(s.advisor_version, '0.3.4');
    assert.deepEqual(s.completed_steps, ['index', 'embeddings']);
    assert.equal(s.plugins_detected.length, 1);
  });

  it('filters out unknown step names', () => {
    const p = path.join(TMP_DIR, 'bad-steps.json');
    fs.writeFileSync(p, JSON.stringify({
      completed_steps: ['index', 'bogus-step', 'embeddings'],
      advisor_version: '0.3.4',
    }));
    const s = readSetupState(p);
    assert.deepEqual(s.completed_steps, ['index', 'embeddings']);
  });
});

describe('writeSetupState', () => {
  it('writes state to disk and can be read back', () => {
    const state = emptyState('0.3.6');
    state.completed_steps = ['index'];
    state.first_run_at = '2026-04-24T12:00:00Z';
    const ok = writeSetupState(state, WRITE_TARGET);
    assert.equal(ok, true);
    const loaded = readSetupState(WRITE_TARGET);
    assert.deepEqual(loaded.completed_steps, ['index']);
    assert.equal(loaded.advisor_version, '0.3.6');
  });

  it('creates parent directory if missing', () => {
    const nested = path.join(TMP_DIR, 'nested', 'deep', 'state.json');
    const ok = writeSetupState(emptyState('0.x'), nested);
    assert.equal(ok, true);
    assert.equal(fs.existsSync(nested), true);
  });
});

describe('isStepCompleted / markStepCompleted', () => {
  it('tracks completion', () => {
    let s = emptyState('0.3.5');
    assert.equal(isStepCompleted(s, 'index'), false);
    s = markStepCompleted(s, 'index');
    assert.equal(isStepCompleted(s, 'index'), true);
    assert.equal(isStepCompleted(s, 'embeddings'), false);
  });

  it('is idempotent — marking the same step twice is a no-op', () => {
    let s = emptyState('0.3.5');
    s = markStepCompleted(s, 'owners');
    s = markStepCompleted(s, 'owners');
    assert.equal(s.completed_steps.filter((x) => x === 'owners').length, 1);
  });

  it('rejects unknown step names', () => {
    assert.throws(() => markStepCompleted(emptyState('0.3.5'), 'bogus'));
  });
});

describe('needsFullRerun', () => {
  it('true when advisor_version differs from current', () => {
    const s = { advisor_version: '0.3.4', completed_steps: KNOWN_STEPS };
    assert.equal(needsFullRerun(s, '0.3.5'), true);
  });

  it('false when advisor_version matches', () => {
    const s = { advisor_version: '0.3.5', completed_steps: KNOWN_STEPS };
    assert.equal(needsFullRerun(s, '0.3.5'), false);
  });

  it('true for missing state', () => {
    assert.equal(needsFullRerun(null, '0.3.5'), true);
    assert.equal(needsFullRerun({}, '0.3.5'), true);
  });
});

describe('isFirstRun', () => {
  it('true when setup file does not exist', () => {
    assert.equal(isFirstRun(MISSING), true);
  });

  it('false when setup file exists', () => {
    assert.equal(isFirstRun(VALID), false);
  });
});
