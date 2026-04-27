'use strict';

/**
 * vault-config.js — Obsidian Vault bounded context.
 *
 * A Vault is the graph layer's input source. The user has zero or one Vault.
 * Binding happens via SKILL_ADVISOR_VAULT_PATH env var OR via vault_config
 * in ~/.claude/advisor/setup.json (written by the first-run wizard).
 *
 * Ubiquitous language (DDD):
 *   Vault              — an Obsidian vault directory on disk
 *   VaultConfig        — value object { path, indexed_at, graph_edges_count }
 *   EMPTY_VAULT_CONFIG — degenerate VaultConfig when no vault is bound
 *
 * Validation (aggregate invariants):
 *   1. path is a non-empty string when set
 *   2. path exists and is a directory
 *   3. directory looks like a vault — `.obsidian/` subdir OR at least
 *      one `.md` file at the top level
 *
 * Failures raise VaultValidationError with a `reason` tag consumers can
 * branch on: invalid_type | not_found | not_a_directory | not_a_vault.
 */

const fs = require('node:fs');
const path = require('node:path');

const EMPTY_VAULT_CONFIG = Object.freeze({
  path: null,
  indexed_at: null,
  graph_edges_count: 0,
});

class VaultValidationError extends Error {
  constructor(message, reason) {
    super(message);
    this.name = 'VaultValidationError';
    this.reason = reason;
  }
}

function validateVaultPath(candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    throw new VaultValidationError(
      'Vault path must be a non-empty string',
      'invalid_type'
    );
  }
  if (!fs.existsSync(candidate)) {
    throw new VaultValidationError(
      `Vault path does not exist: ${candidate}`,
      'not_found'
    );
  }
  const stat = fs.statSync(candidate);
  if (!stat.isDirectory()) {
    throw new VaultValidationError(
      `Vault path is not a directory: ${candidate}`,
      'not_a_directory'
    );
  }
  const hasObsidianMarker = fs.existsSync(path.join(candidate, '.obsidian'));
  let hasMarkdown = false;
  try {
    hasMarkdown = fs.readdirSync(candidate).some(
      (e) => e.toLowerCase().endsWith('.md')
    );
  } catch {
    // unreadable dir — treated as no markdown
  }
  if (!hasObsidianMarker && !hasMarkdown) {
    throw new VaultValidationError(
      `Path exists but does not look like an Obsidian vault (no .obsidian/ and no .md files): ${candidate}`,
      'not_a_vault'
    );
  }
  return Object.freeze({
    path: candidate,
    has_obsidian_marker: hasObsidianMarker,
  });
}

function makeVaultConfig(vaultPath, meta = {}) {
  if (vaultPath === null || vaultPath === undefined) {
    return EMPTY_VAULT_CONFIG;
  }
  const valid = validateVaultPath(vaultPath);
  return Object.freeze({
    path: valid.path,
    indexed_at: meta.indexed_at || null,
    graph_edges_count: Number.isInteger(meta.graph_edges_count)
      ? meta.graph_edges_count
      : 0,
  });
}

function readVaultConfigFromState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return EMPTY_VAULT_CONFIG;
  }
  const vc = state.vault_config;
  if (!vc || typeof vc !== 'object' || Array.isArray(vc)) {
    return EMPTY_VAULT_CONFIG;
  }
  return Object.freeze({
    path: typeof vc.path === 'string' ? vc.path : null,
    indexed_at: typeof vc.indexed_at === 'string' ? vc.indexed_at : null,
    graph_edges_count: Number.isInteger(vc.graph_edges_count)
      ? vc.graph_edges_count
      : 0,
  });
}

// Slice 3.2: vault-config is now the SINGLE source of truth for vault env
// resolution. Cascade: canonical (SKILL_ADVISOR_VAULT_PATH) > legacy
// (SKILL_ADVISOR_VAULT). When ONLY the legacy var is set, emit a one-time
// deprecation warning naming the canonical and the removal release (0.6.0).
//
// EMPTY-STRING SEMANTICS (POSIX convention): both canonical and legacy treat
// an empty string identically to "unset". Setting `SKILL_ADVISOR_VAULT_PATH=""`
// does NOT explicitly disable the cascade — it falls through to the legacy
// var (which itself may be unset or set). This matches typical shell behavior
// where `export FOO=""` is equivalent to "unset FOO" for most consumers.
const CANONICAL_VAULT_ENV = 'SKILL_ADVISOR_VAULT_PATH';
const LEGACY_VAULT_ENV = 'SKILL_ADVISOR_VAULT';
const LEGACY_VAULT_REMOVAL = '0.6.0';
const _testEnabled = process.env.SKILL_ADVISOR_TEST === '1';
let _legacyDeprecationWarned = false;

function resolveVaultPathFromEnv() {
  const canonical = process.env[CANONICAL_VAULT_ENV];
  if (typeof canonical === 'string' && canonical.length > 0) return canonical;
  const legacy = process.env[LEGACY_VAULT_ENV];
  if (typeof legacy === 'string' && legacy.length > 0) {
    if (!_legacyDeprecationWarned) {
      _legacyDeprecationWarned = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[skill-advisor] DEPRECATED: ${LEGACY_VAULT_ENV} env var; use ${CANONICAL_VAULT_ENV} instead. Legacy support removed in ${LEGACY_VAULT_REMOVAL}.`
      );
    }
    return legacy;
  }
  return null;
}

// Test-only reset hook for the legacy-deprecation latch. Gated by
// SKILL_ADVISOR_TEST=1 (read at module load) so production code cannot
// accidentally clear the latch and re-emit the warning on every call.
// Same pattern as lib/mtime-cache.js __resetCacheForTests.
function __resetLegacyWarnedForTesting() {
  if (!_testEnabled) {
    throw new Error('__resetLegacyWarnedForTesting: SKILL_ADVISOR_TEST=1 not set; refusing to reset in production');
  }
  _legacyDeprecationWarned = false;
}

function resolveEffectiveVaultPath(state) {
  const envPath = resolveVaultPathFromEnv();
  if (envPath) return envPath;
  const stateConfig = readVaultConfigFromState(state);
  return stateConfig.path;
}

module.exports = {
  EMPTY_VAULT_CONFIG,
  VaultValidationError,
  validateVaultPath,
  makeVaultConfig,
  readVaultConfigFromState,
  resolveVaultPathFromEnv,
  resolveEffectiveVaultPath,
  __resetLegacyWarnedForTesting,
};
