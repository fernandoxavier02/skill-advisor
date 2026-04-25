'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  CANNED_TASKS,
  makeSmokeTestResult,
  validateJsonFile,
  validateConstantsLoad,
  cannedTokenSmoke,
  runSmoke,
} = require('../lib/smoke-runner.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-test-'));

before(() => {
  // Build a minimal-but-valid plugin root fixture
  fs.mkdirSync(path.join(TMP, 'lib'), { recursive: true });
  // Copy real constants.js and user-config.js so validateConstantsLoad has something to load
  const realRoot = path.resolve(__dirname, '..');
  fs.copyFileSync(path.join(realRoot, 'lib', 'constants.js'), path.join(TMP, 'lib', 'constants.js'));
  fs.copyFileSync(path.join(realRoot, 'lib', 'user-config.js'), path.join(TMP, 'lib', 'user-config.js'));
  // Minimal valid index files
  fs.writeFileSync(
    path.join(TMP, 'lib', 'advisor-index-full.json'),
    JSON.stringify([
      { id: 'x:foo', name: 'foo', description: 'does foo', invocation: '/foo' },
    ])
  );
  fs.writeFileSync(
    path.join(TMP, 'lib', 'advisor-index-lite.json'),
    JSON.stringify([
      { id: 'x:foo', name: 'foo', description: 'does foo', invocation: '/foo' },
      { id: 'x:auth', name: 'auth-helper', description: 'fix auth typos', invocation: '/auth' },
    ])
  );
});

after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});

describe('CANNED_TASKS', () => {
  it('has at least 2 representative tasks', () => {
    assert.ok(CANNED_TASKS.length >= 2);
  });

  it('each task entry is frozen', () => {
    assert.throws(() => { CANNED_TASKS[0].task = 'mutated'; }, TypeError);
  });
});

describe('makeSmokeTestResult', () => {
  it('normalizes a passing result', () => {
    const r = makeSmokeTestResult({ passed: true, duration_ms: 5 });
    assert.equal(r.passed, true);
    assert.equal(r.duration_ms, 5);
    assert.equal(r.loadout_size, 0);
    assert.equal(r.matched_fingerprint, null);
    assert.equal(r.reason, null);
  });

  it('coerces missing fields to safe defaults', () => {
    const r = makeSmokeTestResult({});
    assert.equal(r.passed, false);
    assert.equal(r.checks.length, 0);
    assert.equal(r.duration_ms, 0);
  });

  it('freezes result', () => {
    const r = makeSmokeTestResult({ passed: true });
    assert.throws(() => { r.passed = false; }, TypeError);
  });
});

describe('validateJsonFile', () => {
  it('reports file_not_found for a ghost path', () => {
    const r = validateJsonFile(path.join(TMP, 'ghost.json'));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'file_not_found');
  });

  it('reports parse_failed on invalid JSON', () => {
    const bad = path.join(TMP, 'bad.json');
    fs.writeFileSync(bad, '{ this is not json');
    const r = validateJsonFile(bad);
    assert.equal(r.ok, false);
    assert.ok(r.reason.startsWith('parse_failed'));
  });

  it('reports not_an_array when requireArray and root is object', () => {
    const obj = path.join(TMP, 'obj.json');
    fs.writeFileSync(obj, JSON.stringify({ not: 'array' }));
    const r = validateJsonFile(obj, { requireArray: true });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'not_an_array');
  });

  it('returns ok + entry_count for a valid array', () => {
    const r = validateJsonFile(path.join(TMP, 'lib', 'advisor-index-full.json'), {
      requireArray: true,
    });
    assert.equal(r.ok, true);
    assert.equal(r.entry_count, 1);
  });
});

describe('validateConstantsLoad', () => {
  it('loads real constants.js from a fixture plugin root', () => {
    const r = validateConstantsLoad(TMP);
    assert.equal(r.ok, true);
    assert.ok(r.owner_count >= 5);
  });

  it('reports constants_load_failed on missing plugin root', () => {
    const r = validateConstantsLoad(path.join(TMP, 'ghost-root'));
    assert.equal(r.ok, false);
    assert.ok(r.reason.startsWith('constants_load_failed'));
  });
});

describe('cannedTokenSmoke', () => {
  it('returns ok when lite index has a matching entry', () => {
    const lite = [
      { name: 'auth-helper', description: 'fix auth typos' },
    ];
    const r = cannedTokenSmoke(lite);
    assert.equal(r.ok, true);
    assert.ok(r.matched_task);
  });

  it('returns ok with hint when no canned task matches', () => {
    const lite = [{ name: 'xyz', description: 'unrelated' }];
    const r = cannedTokenSmoke(lite);
    assert.equal(r.ok, true);
    assert.equal(r.matched_task, null);
    assert.equal(r.hint, 'no_canned_task_matched');
  });

  it('returns fail on empty index', () => {
    const r = cannedTokenSmoke([]);
    assert.equal(r.ok, false);
  });
});

describe('runSmoke', () => {
  it('passes on a valid fixture plugin root', () => {
    const r = runSmoke({ pluginRoot: TMP });
    assert.equal(r.passed, true);
    assert.equal(r.reason, null);
    assert.ok(r.duration_ms >= 0);
    assert.ok(r.checks.length >= 4);
  });

  it('fails when full_index missing', () => {
    const broken = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-broken-'));
    try {
      fs.mkdirSync(path.join(broken, 'lib'));
      // Only lite index present, full is missing
      fs.writeFileSync(
        path.join(broken, 'lib', 'advisor-index-lite.json'),
        JSON.stringify([])
      );
      // And real constants for the constants_load check
      const realRoot = path.resolve(__dirname, '..');
      fs.copyFileSync(path.join(realRoot, 'lib', 'constants.js'), path.join(broken, 'lib', 'constants.js'));
      fs.copyFileSync(path.join(realRoot, 'lib', 'user-config.js'), path.join(broken, 'lib', 'user-config.js'));
      const r = runSmoke({ pluginRoot: broken });
      assert.equal(r.passed, false);
      assert.ok(r.reason && r.reason.startsWith('full_index:'));
    } finally {
      try { fs.rmSync(broken, { recursive: true, force: true }); } catch {}
    }
  });
});
