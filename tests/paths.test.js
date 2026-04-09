const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const {
  PLUGIN_DIR, SKILL_DIR, ADVISOR_DATA_DIR, ADVISOR_CACHE_DIR,
  getIndexPath, getLibDir, getTelemetryPath, getConfigPath,
  getAdvisorDataDir, getAdvisorCacheDir, getAdvisorDataPath, getAdvisorCachePath,
} = require('../lib/paths');

describe('paths', () => {
  it('PLUGIN_DIR points to ~/.claude/plugins/cache', () => {
    assert.equal(PLUGIN_DIR, path.join(os.homedir(), '.claude', 'plugins', 'cache'));
  });

  it('SKILL_DIR points to ~/.claude/skills', () => {
    assert.equal(SKILL_DIR, path.join(os.homedir(), '.claude', 'skills'));
  });

  it('getIndexPath("lite") returns lite filename', () => {
    const p = getIndexPath('lite');
    assert.ok(p.endsWith('advisor-index-lite.json'));
  });

  it('getIndexPath("full") returns full filename', () => {
    const p = getIndexPath('full');
    assert.ok(p.endsWith('advisor-index-full.json'));
  });

  it('getLibDir returns the lib directory', () => {
    const dir = getLibDir();
    assert.ok(dir.endsWith('lib'));
  });

  it('getTelemetryPath returns a .jsonl file', () => {
    const p = getTelemetryPath();
    assert.ok(p.endsWith('.jsonl'));
  });

  it('getConfigPath returns a .json file', () => {
    const p = getConfigPath();
    assert.ok(p.endsWith('.json'));
  });

  it('ADVISOR_DATA_DIR points to ~/.claude/advisor', () => {
    assert.equal(ADVISOR_DATA_DIR, path.join(os.homedir(), '.claude', 'advisor'));
  });

  it('ADVISOR_CACHE_DIR points to ~/.claude/advisor/cache', () => {
    assert.equal(ADVISOR_CACHE_DIR, path.join(os.homedir(), '.claude', 'advisor', 'cache'));
  });

  it('getAdvisorDataDir returns ADVISOR_DATA_DIR', () => {
    assert.equal(getAdvisorDataDir(), ADVISOR_DATA_DIR);
  });

  it('getAdvisorCacheDir returns ADVISOR_CACHE_DIR', () => {
    assert.equal(getAdvisorCacheDir(), ADVISOR_CACHE_DIR);
  });

  it('getAdvisorDataPath joins filename with data dir', () => {
    const p = getAdvisorDataPath('feedback.jsonl');
    assert.equal(p, path.join(os.homedir(), '.claude', 'advisor', 'feedback.jsonl'));
  });

  it('getAdvisorCachePath joins filename with cache dir', () => {
    const p = getAdvisorCachePath('advisor-affinity.json');
    assert.equal(p, path.join(os.homedir(), '.claude', 'advisor', 'cache', 'advisor-affinity.json'));
  });

  it('getAdvisorDataPath strips directory traversal', () => {
    const p = getAdvisorDataPath('../../.bashrc');
    assert.equal(p, path.join(os.homedir(), '.claude', 'advisor', '.bashrc'));
  });

  it('getAdvisorCachePath strips directory traversal', () => {
    const p = getAdvisorCachePath('../../../etc/passwd');
    assert.equal(p, path.join(os.homedir(), '.claude', 'advisor', 'cache', 'passwd'));
  });
});
