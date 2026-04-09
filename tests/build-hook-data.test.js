'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { buildHookData } = require('../lib/build-hook-data');

describe('buildHookData', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hookdata-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('merges affinity + discovery + replay into single JSON', () => {
    const affinity = [{ skillId: 'investigate', affinityScore: 0.8, usageCount: 5 }];
    const discovery = [{ skillId: 'cso', affinityScore: 0.7, name: 'cso', invocation: '/cso' }];
    const replay = [{ sequence: ['investigate', 'fix'], count: 5 }];

    fs.writeFileSync(path.join(tmpDir, 'advisor-affinity.json'), JSON.stringify(affinity));
    fs.writeFileSync(path.join(tmpDir, 'advisor-discovery.json'), JSON.stringify(discovery));
    fs.writeFileSync(path.join(tmpDir, 'advisor-replay-candidate.json'), JSON.stringify(replay));

    const outputPath = path.join(tmpDir, 'advisor-hook-data.json');
    const result = buildHookData(tmpDir, outputPath);

    assert.ok(result);
    assert.deepEqual(result.affinity, affinity);
    assert.deepEqual(result.discovery, discovery);
    assert.deepEqual(result.replay, replay);

    const written = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.deepEqual(written, result);
  });

  it('handles missing affinity file gracefully', () => {
    const discovery = [{ skillId: 'cso' }];
    fs.writeFileSync(path.join(tmpDir, 'advisor-discovery.json'), JSON.stringify(discovery));

    const outputPath = path.join(tmpDir, 'advisor-hook-data.json');
    const result = buildHookData(tmpDir, outputPath);

    assert.deepEqual(result.affinity, []);
    assert.deepEqual(result.discovery, discovery);
    assert.deepEqual(result.replay, []);
  });

  it('handles all files missing gracefully', () => {
    const outputPath = path.join(tmpDir, 'advisor-hook-data.json');
    const result = buildHookData(tmpDir, outputPath);

    assert.deepEqual(result.affinity, []);
    assert.deepEqual(result.discovery, []);
    assert.deepEqual(result.replay, []);
    assert.ok(fs.existsSync(outputPath));
  });

  it('creates parent directories for output', () => {
    const outputPath = path.join(tmpDir, 'nested', 'deep', 'advisor-hook-data.json');
    const result = buildHookData(tmpDir, outputPath);
    assert.ok(fs.existsSync(outputPath));
    assert.ok(result);
  });
});
