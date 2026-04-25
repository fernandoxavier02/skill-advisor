'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  loadUserConfig,
  validateExtension,
  EMPTY_EXTENSION,
} = require('../lib/user-config.js');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'user-config-test-'));
const MISSING_PATH = path.join(TMP_DIR, 'does-not-exist.json');
const MALFORMED_PATH = path.join(TMP_DIR, 'malformed.json');
const INCOMPLETE_PATH = path.join(TMP_DIR, 'incomplete.json');
const VALID_PATH = path.join(TMP_DIR, 'valid.json');
const NOT_OBJECT_PATH = path.join(TMP_DIR, 'not-object.json');

before(() => {
  fs.writeFileSync(MALFORMED_PATH, '{ this is not json');
  fs.writeFileSync(NOT_OBJECT_PATH, '["array not object"]');
  fs.writeFileSync(
    INCOMPLETE_PATH,
    JSON.stringify({
      pipeline_owners: ['missing-flow'],
      canonical_flows: {},
      pipeline_fingerprints: {},
    })
  );
  fs.writeFileSync(
    VALID_PATH,
    JSON.stringify({
      pipeline_owners: ['custom-plugin-a'],
      canonical_flows: {
        'custom-plugin-a': ['/custom-a:init', '/custom-a:run', '/custom-a:finish'],
      },
      pipeline_fingerprints: {
        'custom-plugin-a': {
          best_for: 'Custom orchestrated workflow for local purposes.',
          typical_tasks: ['task A', 'task B'],
          not_for: ['simple fixes'],
          complexity_match: ['medium', 'complex'],
        },
      },
    })
  );
});

after(() => {
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}
});

describe('loadUserConfig', () => {
  it('returns EMPTY_EXTENSION when file missing', () => {
    const ext = loadUserConfig(MISSING_PATH);
    assert.equal(ext, EMPTY_EXTENSION);
  });

  it('returns empty extension on malformed JSON (fail-soft)', () => {
    const ext = loadUserConfig(MALFORMED_PATH);
    assert.deepEqual(ext.pipeline_owners, []);
    assert.deepEqual(ext.canonical_flows, {});
    assert.deepEqual(ext.pipeline_fingerprints, {});
  });

  it('returns empty extension when root is not an object', () => {
    const ext = loadUserConfig(NOT_OBJECT_PATH);
    assert.deepEqual(ext.pipeline_owners, []);
  });

  it('returns empty when owner missing canonical_flow', () => {
    const ext = loadUserConfig(INCOMPLETE_PATH);
    assert.deepEqual(ext.pipeline_owners, []);
  });

  it('returns parsed extension for a valid file', () => {
    const ext = loadUserConfig(VALID_PATH);
    assert.deepEqual(ext.pipeline_owners, ['custom-plugin-a']);
    assert.deepEqual(ext.canonical_flows['custom-plugin-a'], [
      '/custom-a:init',
      '/custom-a:run',
      '/custom-a:finish',
    ]);
    assert.equal(
      ext.pipeline_fingerprints['custom-plugin-a'].best_for,
      'Custom orchestrated workflow for local purposes.'
    );
  });

  it('freezes returned extension (cannot mutate pipeline_owners)', () => {
    const ext = loadUserConfig(VALID_PATH);
    assert.throws(() => ext.pipeline_owners.push('x'), TypeError);
  });
});

describe('validateExtension', () => {
  it('accepts a fully valid extension', () => {
    const errors = validateExtension({
      pipeline_owners: ['foo'],
      canonical_flows: { foo: ['/foo:a', '/foo:b'] },
      pipeline_fingerprints: { foo: { best_for: 'x' } },
    });
    assert.deepEqual(errors, []);
  });

  it('accepts an empty extension', () => {
    const errors = validateExtension({ pipeline_owners: [] });
    assert.deepEqual(errors, []);
  });

  it('rejects root that is not an object', () => {
    const errors = validateExtension('string');
    assert.ok(errors.some((e) => e.includes('extension root')));
  });

  it('rejects pipeline_owners not being an array', () => {
    const errors = validateExtension({ pipeline_owners: 'not-array' });
    assert.ok(errors.some((e) => e.includes('pipeline_owners must be an array')));
  });

  it('rejects owner without canonical_flow', () => {
    const errors = validateExtension({
      pipeline_owners: ['lonely'],
      canonical_flows: {},
      pipeline_fingerprints: { lonely: { best_for: 'x' } },
    });
    assert.ok(errors.some((e) => e.includes('missing canonical_flows')));
  });

  it('rejects owner without pipeline_fingerprint', () => {
    const errors = validateExtension({
      pipeline_owners: ['lonely'],
      canonical_flows: { lonely: ['/a'] },
      pipeline_fingerprints: {},
    });
    assert.ok(errors.some((e) => e.includes('missing pipeline_fingerprints')));
  });
});
