'use strict';

/**
 * BDD scenarios for the Vault bounded context — Given/When/Then style.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  makeVaultConfig,
  validateVaultPath,
  VaultValidationError,
  EMPTY_VAULT_CONFIG,
  resolveEffectiveVaultPath,
} = require('../../lib/vault-config.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-feature-'));
const REAL_VAULT = path.join(TMP, 'real-vault');
const GHOST_PATH = path.join(TMP, 'ghost-never-created');

before(() => {
  fs.mkdirSync(REAL_VAULT);
  fs.mkdirSync(path.join(REAL_VAULT, '.obsidian'));
  fs.writeFileSync(path.join(REAL_VAULT, 'welcome.md'), '# welcome\n');
});

after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});

describe('Feature: Obsidian vault detection and opt-in config', () => {
  describe('Scenario: User provides a real Obsidian vault and opts in', () => {
    it('Given a vault at a valid path, When VaultConfig is constructed, Then config is bound and frozen', () => {
      const vaultPath = REAL_VAULT;
      const cfg = makeVaultConfig(vaultPath, {
        indexed_at: '2026-04-24T12:00:00Z',
        graph_edges_count: 10,
      });
      assert.equal(cfg.path, vaultPath);
      assert.equal(cfg.indexed_at, '2026-04-24T12:00:00Z');
      assert.equal(cfg.graph_edges_count, 10);
      assert.throws(() => { cfg.path = 'mutated'; }, TypeError);
    });
  });

  describe('Scenario: User declines the vault step', () => {
    it('Given a null vault path, When makeVaultConfig is called, Then EMPTY_VAULT_CONFIG is returned', () => {
      const cfg = makeVaultConfig(null);
      assert.equal(cfg, EMPTY_VAULT_CONFIG);
      assert.equal(cfg.path, null);
      assert.equal(cfg.graph_edges_count, 0);
    });
  });

  describe('Scenario: User provides a non-existent path', () => {
    it('Given a ghost path, When validateVaultPath runs, Then VaultValidationError with reason not_found is raised', () => {
      assert.throws(
        () => validateVaultPath(GHOST_PATH),
        (err) => err instanceof VaultValidationError && err.reason === 'not_found'
      );
    });
  });

  describe('Scenario: Env var wins over state', () => {
    it('Given SKILL_ADVISOR_VAULT_PATH is set, When resolveEffectiveVaultPath is called with state also set, Then env wins', () => {
      const prev = process.env.SKILL_ADVISOR_VAULT_PATH;
      process.env.SKILL_ADVISOR_VAULT_PATH = '/env/wins';
      try {
        const state = { vault_config: { path: '/state/loses' } };
        assert.equal(resolveEffectiveVaultPath(state), '/env/wins');
      } finally {
        if (prev === undefined) delete process.env.SKILL_ADVISOR_VAULT_PATH;
        else process.env.SKILL_ADVISOR_VAULT_PATH = prev;
      }
    });
  });

  describe('Scenario: No vault configured anywhere', () => {
    it('Given no env var and empty state, When resolveEffectiveVaultPath runs, Then null (graph layer degrades gracefully)', () => {
      const prev = process.env.SKILL_ADVISOR_VAULT_PATH;
      delete process.env.SKILL_ADVISOR_VAULT_PATH;
      try {
        assert.equal(resolveEffectiveVaultPath({}), null);
      } finally {
        if (prev !== undefined) process.env.SKILL_ADVISOR_VAULT_PATH = prev;
      }
    });
  });
});
