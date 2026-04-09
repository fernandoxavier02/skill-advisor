'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { buildReplayCandidates, buildReplayFromPath } = require('../lib/build-replay');

describe('buildReplayCandidates', () => {
  it('returns one candidate per unique first-skill prefix pattern', () => {
    const combos = [
      { sequence: ['investigate', 'fix', 'review'], count: 5, lastSeen: '2026-04-08T10:00:00Z' },
      { sequence: ['investigate', 'fix', 'ship'], count: 3, lastSeen: '2026-04-07T10:00:00Z' },
      { sequence: ['review', 'ship'], count: 4, lastSeen: '2026-04-09T10:00:00Z' },
    ];

    const result = buildReplayCandidates(combos);
    assert.ok(Array.isArray(result));
    assert.ok(result.length >= 1);
  });

  it('picks most recent combo when multiple share first skill', () => {
    const combos = [
      { sequence: ['investigate', 'fix', 'review'], count: 5, lastSeen: '2026-04-08T10:00:00Z' },
      { sequence: ['investigate', 'fix', 'ship'], count: 3, lastSeen: '2026-04-09T10:00:00Z' },
    ];

    const result = buildReplayCandidates(combos);
    // Both start with 'investigate'. Pick most recent (ship variant, 04-09)
    const inv = result.find(r => r.sequence[0] === 'investigate');
    assert.ok(inv);
    assert.deepEqual(inv.sequence, ['investigate', 'fix', 'ship']);
  });

  it('returns empty for empty combos', () => {
    const result = buildReplayCandidates([]);
    assert.deepEqual(result, []);
  });

  it('returns empty for null', () => {
    const result = buildReplayCandidates(null);
    assert.deepEqual(result, []);
  });

  it('result entries have expected shape', () => {
    const combos = [
      { sequence: ['qa', 'review', 'ship'], count: 4, lastSeen: '2026-04-08T10:00:00Z' },
    ];
    const result = buildReplayCandidates(combos);
    assert.equal(result.length, 1);
    assert.ok(Array.isArray(result[0].sequence));
    assert.equal(typeof result[0].count, 'number');
    assert.equal(typeof result[0].lastSeen, 'string');
  });
});

describe('buildReplayFromPath', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes advisor-replay-candidate.json from combos file', () => {
    const combos = [
      { sequence: ['investigate', 'fix'], count: 5, lastSeen: '2026-04-08T10:00:00Z' },
    ];
    const combosPath = path.join(tmpDir, 'advisor-combos.json');
    fs.writeFileSync(combosPath, JSON.stringify(combos));

    const outputPath = path.join(tmpDir, 'advisor-replay-candidate.json');
    const result = buildReplayFromPath(combosPath, outputPath);
    assert.ok(result.length >= 1);
    assert.ok(fs.existsSync(outputPath));
  });

  it('writes empty array when no combos file', () => {
    const outputPath = path.join(tmpDir, 'advisor-replay-candidate.json');
    const result = buildReplayFromPath('/nope/combos.json', outputPath);
    assert.deepEqual(result, []);
    assert.ok(fs.existsSync(outputPath));
  });
});
