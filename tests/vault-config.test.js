'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  EMPTY_VAULT_CONFIG,
  VaultValidationError,
  validateVaultPath,
  makeVaultConfig,
  readVaultConfigFromState,
  resolveVaultPathFromEnv,
  resolveEffectiveVaultPath,
} = require('../lib/vault-config.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-test-'));
const VAULT_WITH_OBSIDIAN = path.join(TMP, 'vault-a');
const VAULT_WITH_MD_ONLY = path.join(TMP, 'vault-b');
const EMPTY_DIR = path.join(TMP, 'empty-dir');
const PLAIN_FILE = path.join(TMP, 'not-a-dir');

before(() => {
  fs.mkdirSync(VAULT_WITH_OBSIDIAN);
  fs.mkdirSync(path.join(VAULT_WITH_OBSIDIAN, '.obsidian'));
  fs.writeFileSync(path.join(VAULT_WITH_OBSIDIAN, 'app.json'), '{}');

  fs.mkdirSync(VAULT_WITH_MD_ONLY);
  fs.writeFileSync(path.join(VAULT_WITH_MD_ONLY, 'note-1.md'), '# note one\n');
  fs.writeFileSync(path.join(VAULT_WITH_MD_ONLY, 'note-2.md'), '# note two\n');

  fs.mkdirSync(EMPTY_DIR);
  fs.writeFileSync(PLAIN_FILE, 'im a file');
});

after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});

describe('validateVaultPath', () => {
  it('accepts a directory with .obsidian/ marker', () => {
    const r = validateVaultPath(VAULT_WITH_OBSIDIAN);
    assert.equal(r.path, VAULT_WITH_OBSIDIAN);
    assert.equal(r.has_obsidian_marker, true);
  });

  it('accepts a directory with only .md files', () => {
    const r = validateVaultPath(VAULT_WITH_MD_ONLY);
    assert.equal(r.path, VAULT_WITH_MD_ONLY);
    assert.equal(r.has_obsidian_marker, false);
  });

  it('throws invalid_type on empty string', () => {
    assert.throws(
      () => validateVaultPath(''),
      (err) => err instanceof VaultValidationError && err.reason === 'invalid_type'
    );
  });

  it('throws invalid_type on non-string', () => {
    assert.throws(
      () => validateVaultPath(null),
      (err) => err instanceof VaultValidationError && err.reason === 'invalid_type'
    );
  });

  it('throws not_found on missing path', () => {
    assert.throws(
      () => validateVaultPath(path.join(TMP, 'ghost')),
      (err) => err.reason === 'not_found'
    );
  });

  it('throws not_a_directory on a plain file', () => {
    assert.throws(
      () => validateVaultPath(PLAIN_FILE),
      (err) => err.reason === 'not_a_directory'
    );
  });

  it('throws not_a_vault on empty directory', () => {
    assert.throws(
      () => validateVaultPath(EMPTY_DIR),
      (err) => err.reason === 'not_a_vault'
    );
  });
});

describe('makeVaultConfig', () => {
  it('returns EMPTY_VAULT_CONFIG for null', () => {
    assert.equal(makeVaultConfig(null), EMPTY_VAULT_CONFIG);
  });

  it('returns EMPTY_VAULT_CONFIG for undefined', () => {
    assert.equal(makeVaultConfig(undefined), EMPTY_VAULT_CONFIG);
  });

  it('produces a frozen config for a valid vault', () => {
    const cfg = makeVaultConfig(VAULT_WITH_OBSIDIAN, {
      indexed_at: '2026-04-24T10:00:00Z',
      graph_edges_count: 42,
    });
    assert.equal(cfg.path, VAULT_WITH_OBSIDIAN);
    assert.equal(cfg.indexed_at, '2026-04-24T10:00:00Z');
    assert.equal(cfg.graph_edges_count, 42);
    assert.throws(() => { cfg.path = 'x'; }, TypeError);
  });

  it('rejects non-integer graph_edges_count (defaults to 0)', () => {
    const cfg = makeVaultConfig(VAULT_WITH_OBSIDIAN, { graph_edges_count: 'bogus' });
    assert.equal(cfg.graph_edges_count, 0);
  });

  it('propagates VaultValidationError for invalid path', () => {
    assert.throws(() => makeVaultConfig(path.join(TMP, 'ghost')), VaultValidationError);
  });
});

describe('readVaultConfigFromState', () => {
  it('returns EMPTY_VAULT_CONFIG when state is null', () => {
    assert.equal(readVaultConfigFromState(null), EMPTY_VAULT_CONFIG);
  });

  it('returns EMPTY_VAULT_CONFIG when vault_config missing', () => {
    assert.equal(readVaultConfigFromState({}), EMPTY_VAULT_CONFIG);
  });

  it('returns typed + frozen config for a state with vault_config', () => {
    const cfg = readVaultConfigFromState({
      vault_config: {
        path: '/some/vault',
        indexed_at: '2026-04-24T10:00:00Z',
        graph_edges_count: 7,
      },
    });
    assert.equal(cfg.path, '/some/vault');
    assert.equal(cfg.graph_edges_count, 7);
    assert.throws(() => { cfg.graph_edges_count = 99; }, TypeError);
  });

  it('sanitizes non-string path to null', () => {
    const cfg = readVaultConfigFromState({ vault_config: { path: 42 } });
    assert.equal(cfg.path, null);
  });
});

describe('resolveVaultPathFromEnv', () => {
  it('returns null when env var is unset', () => {
    const prev = process.env.SKILL_ADVISOR_VAULT_PATH;
    delete process.env.SKILL_ADVISOR_VAULT_PATH;
    assert.equal(resolveVaultPathFromEnv(), null);
    if (prev !== undefined) process.env.SKILL_ADVISOR_VAULT_PATH = prev;
  });

  it('returns the env var when set', () => {
    const prev = process.env.SKILL_ADVISOR_VAULT_PATH;
    process.env.SKILL_ADVISOR_VAULT_PATH = '/env/vault';
    assert.equal(resolveVaultPathFromEnv(), '/env/vault');
    if (prev === undefined) delete process.env.SKILL_ADVISOR_VAULT_PATH;
    else process.env.SKILL_ADVISOR_VAULT_PATH = prev;
  });
});

describe('resolveEffectiveVaultPath', () => {
  it('env var wins over state', () => {
    const prev = process.env.SKILL_ADVISOR_VAULT_PATH;
    process.env.SKILL_ADVISOR_VAULT_PATH = '/env/path';
    const state = { vault_config: { path: '/state/path' } };
    assert.equal(resolveEffectiveVaultPath(state), '/env/path');
    if (prev === undefined) delete process.env.SKILL_ADVISOR_VAULT_PATH;
    else process.env.SKILL_ADVISOR_VAULT_PATH = prev;
  });

  it('falls back to state when env var is unset', () => {
    const prev = process.env.SKILL_ADVISOR_VAULT_PATH;
    delete process.env.SKILL_ADVISOR_VAULT_PATH;
    const state = { vault_config: { path: '/state/path' } };
    assert.equal(resolveEffectiveVaultPath(state), '/state/path');
    if (prev !== undefined) process.env.SKILL_ADVISOR_VAULT_PATH = prev;
  });

  it('returns null when neither env nor state has a path', () => {
    const prev = process.env.SKILL_ADVISOR_VAULT_PATH;
    delete process.env.SKILL_ADVISOR_VAULT_PATH;
    assert.equal(resolveEffectiveVaultPath({}), null);
    if (prev !== undefined) process.env.SKILL_ADVISOR_VAULT_PATH = prev;
  });
});
