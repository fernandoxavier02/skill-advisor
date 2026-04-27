'use strict';

/**
 * vault-env-single-source.test.js — Slice 3.2 (Task 4.3) RED tests.
 *
 * Establishes that vault-config.js is the SINGLE source of truth for vault
 * env var resolution. Both consumers (paths.js + vault-config.js) must agree
 * on the same path for the same env state.
 *
 * Canonical env: SKILL_ADVISOR_VAULT_PATH
 * Legacy env:    SKILL_ADVISOR_VAULT  (paths.js used to read this directly;
 *                                       Slice 3.2 makes vault-config the only
 *                                       reader and emits a one-time deprecation
 *                                       warning when only legacy is set)
 *
 * Removal release for legacy: 0.6.0.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ENV_KEYS = ['SKILL_ADVISOR_VAULT', 'SKILL_ADVISOR_VAULT_PATH'];
let _saved = {};

function clearEnv() {
  _saved = {};
  for (const k of ENV_KEYS) {
    _saved[k] = process.env[k];
    delete process.env[k];
  }
}

function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (_saved[k] === undefined) delete process.env[k];
    else process.env[k] = _saved[k];
  }
}

// Force a fresh require so the module-load-time _deprecationWarned latch
// resets between scenarios.
function freshVaultConfig() {
  delete require.cache[require.resolve('../lib/vault-config')];
  return require('../lib/vault-config');
}

beforeEach(clearEnv);
afterEach(restoreEnv);

describe('vault-env-single-source: cascade (canonical wins)', () => {
  it('Given both canonical and legacy env vars set, When resolveVaultPathFromEnv runs, Then the canonical value is returned and no deprecation warning fires', () => {
    process.env.SKILL_ADVISOR_VAULT_PATH = '/canonical/wins';
    process.env.SKILL_ADVISOR_VAULT = '/legacy/loses';
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      const vc = freshVaultConfig();
      assert.equal(vc.resolveVaultPathFromEnv(), '/canonical/wins');
      assert.deepEqual(warnings, []);
    } finally {
      console.warn = origWarn;
    }
  });

  it('Given only canonical env var set, When resolveVaultPathFromEnv runs, Then it returns canonical and no warning', () => {
    process.env.SKILL_ADVISOR_VAULT_PATH = '/only/canonical';
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      const vc = freshVaultConfig();
      assert.equal(vc.resolveVaultPathFromEnv(), '/only/canonical');
      assert.deepEqual(warnings, []);
    } finally {
      console.warn = origWarn;
    }
  });

  it('Given only legacy env var set, When resolveVaultPathFromEnv runs, Then it returns the legacy value AND emits exactly one deprecation warning naming the canonical var and removal release 0.6.0', () => {
    process.env.SKILL_ADVISOR_VAULT = '/only/legacy';
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      const vc = freshVaultConfig();
      assert.equal(vc.resolveVaultPathFromEnv(), '/only/legacy');
      assert.equal(warnings.length, 1, `expected 1 warning, got: ${warnings.join(' || ')}`);
      assert.match(warnings[0], /SKILL_ADVISOR_VAULT_PATH/);
      assert.match(warnings[0], /0\.6\.0/);
    } finally {
      console.warn = origWarn;
    }
  });

  it('Given only legacy env var set and resolveVaultPathFromEnv called twice, When both calls complete, Then the deprecation warning fires exactly once across both calls (idempotence)', () => {
    process.env.SKILL_ADVISOR_VAULT = '/only/legacy';
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      const vc = freshVaultConfig();
      vc.resolveVaultPathFromEnv();
      vc.resolveVaultPathFromEnv();
      vc.resolveVaultPathFromEnv();
      assert.equal(warnings.length, 1);
    } finally {
      console.warn = origWarn;
    }
  });

  it('Given neither env var set, When resolveVaultPathFromEnv runs, Then it returns null and no warning', () => {
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      const vc = freshVaultConfig();
      assert.equal(vc.resolveVaultPathFromEnv(), null);
      assert.deepEqual(warnings, []);
    } finally {
      console.warn = origWarn;
    }
  });
});

describe('vault-env-single-source: confluence (Property P9)', () => {
  // For any env state, paths.js (via resolveVaultDir) and vault-config.js
  // (via resolveVaultPathFromEnv) must resolve to the same root path. We
  // assert this against an existing fixture directory so the path-validation
  // in paths.js (existsSync check) does not bypass the env value.
  const FIXTURE = path.resolve(__dirname, 'fixtures');

  function freshPaths() {
    // paths.js memoizes VAULT_DIR at module load — must clear cache.
    delete require.cache[require.resolve('../lib/paths')];
    return require('../lib/paths');
  }

  it('Given canonical env points to a valid directory, When both paths.getVaultDir and vault-config.resolveVaultPathFromEnv are called, Then they return the same path', () => {
    process.env.SKILL_ADVISOR_VAULT_PATH = FIXTURE;
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      freshVaultConfig(); // ensure vault-config side is fresh
      const p = freshPaths();
      const vc = require('../lib/vault-config');
      assert.equal(p.getVaultDir(), vc.resolveVaultPathFromEnv());
    } finally {
      console.warn = origWarn;
    }
  });

  it('Given only legacy env set to a valid directory, When paths.getVaultDir is called, Then it returns the legacy value via vault-config (paths no longer reads env directly) and the deprecation warning is observed', () => {
    process.env.SKILL_ADVISOR_VAULT = FIXTURE;
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      freshVaultConfig();
      const p = freshPaths();
      assert.equal(p.getVaultDir(), FIXTURE);
      assert.ok(warnings.some(w => /SKILL_ADVISOR_VAULT_PATH/.test(w)),
        `expected deprecation warning, got: ${warnings.join(' || ')}`);
    } finally {
      console.warn = origWarn;
    }
  });
});

describe('vault-env-single-source: empty-string semantics (POSIX)', () => {
  it('Given canonical env set to empty string and legacy set to a value, When resolveVaultPathFromEnv runs, Then it returns the legacy value AND emits the deprecation warning (empty canonical ≡ unset)', () => {
    process.env.SKILL_ADVISOR_VAULT_PATH = '';
    process.env.SKILL_ADVISOR_VAULT = '/from/legacy';
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      const vc = freshVaultConfig();
      assert.equal(vc.resolveVaultPathFromEnv(), '/from/legacy');
      assert.equal(warnings.length, 1);
    } finally {
      console.warn = origWarn;
    }
  });

  it('Given the test reset hook is invoked between two legacy-only resolutions, When both calls complete, Then the deprecation warning fires twice (latch cleared by hook)', () => {
    process.env.SKILL_ADVISOR_VAULT = '/legacy';
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      const vc = freshVaultConfig();
      vc.resolveVaultPathFromEnv();           // fires once
      vc.__resetLegacyWarnedForTesting();     // clear the latch
      vc.resolveVaultPathFromEnv();           // fires again
      assert.equal(warnings.length, 2, `expected 2 warnings, got: ${warnings.join(' || ')}`);
    } finally {
      console.warn = origWarn;
    }
  });
});

describe('vault-env-single-source: paths.js no longer reads env directly', () => {
  it('Given lib/paths.js source, When grepped, Then it contains zero direct references to either vault env var name (only vault-config does)', () => {
    const fs = require('node:fs');
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'lib', 'paths.js'), 'utf8');
    assert.ok(!/process\.env\.SKILL_ADVISOR_VAULT(?!_PATH)/.test(src),
      'lib/paths.js still reads SKILL_ADVISOR_VAULT directly — must delegate to vault-config');
    assert.ok(!/process\.env\.SKILL_ADVISOR_VAULT_PATH/.test(src),
      'lib/paths.js still reads SKILL_ADVISOR_VAULT_PATH directly — must delegate to vault-config');
  });
});
