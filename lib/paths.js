const path = require('path');
const os = require('os');

const HOME = os.homedir() || process.env.HOME || process.env.USERPROFILE || '/tmp';
const PLUGIN_DIR = path.join(HOME, '.claude', 'plugins', 'cache');
const SKILL_DIR = path.join(HOME, '.claude', 'skills');
const SETTINGS_GLOBAL = path.join(HOME, '.claude', 'settings.json');
const ADVISOR_DATA_DIR = path.join(HOME, '.claude', 'advisor');
const ADVISOR_CACHE_DIR = path.join(ADVISOR_DATA_DIR, 'cache');

function getLibDir() {
  return path.resolve(__dirname);
}

function getIndexPath(tier) {
  const filename = tier === 'lite' ? 'advisor-index-lite.json' : 'advisor-index-full.json';
  return path.join(getLibDir(), filename);
}

/** @deprecated Use getAdvisorDataPath('telemetry.jsonl') instead (D1: data in ~/.claude/advisor/) */
function getTelemetryPath() {
  return path.join(getLibDir(), 'advisor-telemetry.jsonl');
}

function getConfigPath() {
  return path.join(getLibDir(), 'advisor-config.json');
}

function getSkillsDir() {
  return SKILL_DIR;
}

function getAdvisorDataDir() {
  return ADVISOR_DATA_DIR;
}

function getAdvisorCacheDir() {
  return ADVISOR_CACHE_DIR;
}

function getAdvisorDataPath(filename) {
  return path.join(ADVISOR_DATA_DIR, path.basename(filename));
}

function getAdvisorCachePath(filename) {
  return path.join(ADVISOR_CACHE_DIR, path.basename(filename));
}

// Vault paths — configurable via SKILL_ADVISOR_VAULT env var
// Fallback chain: env var → platform-specific Obsidian path → plugin-local vault dirs
const fs = require('fs');

function resolveVaultDir() {
  // 1. Environment variable (highest priority, cross-platform)
  if (process.env.SKILL_ADVISOR_VAULT) {
    return process.env.SKILL_ADVISOR_VAULT;
  }

  // 2. Platform-specific Obsidian Vault paths
  const candidates = process.platform === 'win32'
    ? [
        path.join(HOME, 'OneDrive', 'Documentos', 'Obsidian Vault', 'Skill Advisor Claude code'),
        path.join(HOME, 'Documents', 'Obsidian Vault', 'Skill Advisor Claude code'),
      ]
    : [
        path.join(HOME, 'Documents', 'Obsidian Vault', 'Skill Advisor Claude code'),
      ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch { /* ignore permission errors */ }
  }

  // 3. Plugin-local vault dirs (final fallback)
  const pluginLocal = path.resolve(__dirname, '..', 'vault-skills');
  try {
    if (fs.existsSync(pluginLocal)) return path.resolve(__dirname, '..');
  } catch { /* ignore */ }

  // 4. Return first candidate even if it doesn't exist (for creation)
  return candidates[0];
}

const VAULT_DIR = resolveVaultDir();
const VAULT_GRAPH_DIR = path.join(VAULT_DIR, '_graph');

function getVaultDir() {
  return VAULT_DIR;
}

function getGraphDir() {
  return VAULT_GRAPH_DIR;
}

function getGraphPath(filename) {
  return path.join(VAULT_GRAPH_DIR, filename);
}

function getVaultSkillsDir() {
  return path.join(VAULT_DIR, 'skills');
}

module.exports = {
  PLUGIN_DIR,
  SKILL_DIR,
  SETTINGS_GLOBAL,
  ADVISOR_DATA_DIR,
  ADVISOR_CACHE_DIR,
  getLibDir,
  getIndexPath,
  getTelemetryPath,
  getConfigPath,
  getSkillsDir,
  getAdvisorDataDir,
  getAdvisorCacheDir,
  getAdvisorDataPath,
  getAdvisorCachePath,
  getVaultDir,
  getGraphDir,
  getGraphPath,
  getVaultSkillsDir,
};
