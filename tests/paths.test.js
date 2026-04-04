const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const { PLUGIN_DIR, SKILL_DIR, getIndexPath, getLibDir, getTelemetryPath, getConfigPath } = require('../lib/paths');

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
});
