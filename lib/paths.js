const path = require('path');
const os = require('os');

const HOME = os.homedir() || process.env.HOME || process.env.USERPROFILE || '/tmp';
const PLUGIN_DIR = path.join(HOME, '.claude', 'plugins', 'cache');
const SKILL_DIR = path.join(HOME, '.claude', 'skills');
const SETTINGS_GLOBAL = path.join(HOME, '.claude', 'settings.json');

function getLibDir() {
  return path.resolve(__dirname);
}

function getIndexPath(tier) {
  const filename = tier === 'lite' ? 'advisor-index-lite.json' : 'advisor-index-full.json';
  return path.join(getLibDir(), filename);
}

function getTelemetryPath() {
  return path.join(getLibDir(), 'advisor-telemetry.jsonl');
}

function getConfigPath() {
  return path.join(getLibDir(), 'advisor-config.json');
}

function getSkillsDir() {
  return SKILL_DIR;
}

// Vault paths — configurable via SKILL_ADVISOR_VAULT env var
// Default: ~/Documents/claude code skill creator (Obsidian Sync vault)
const VAULT_DIR = process.env.SKILL_ADVISOR_VAULT
  || path.join(HOME, 'Documents', 'claude code skill creator');
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
  getLibDir,
  getIndexPath,
  getTelemetryPath,
  getConfigPath,
  getSkillsDir,
  getVaultDir,
  getGraphDir,
  getGraphPath,
  getVaultSkillsDir,
};
