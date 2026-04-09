'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { findCandidates, buildDiscoveryFromPaths } = require('../lib/build-discovery');

describe('findCandidates', () => {
  const baseAffinity = [
    { skillId: 'investigate', affinityScore: 0.8, usageCount: 5, avgRating: 4.5, lastUsed: '2026-04-08' },
    { skillId: 'review', affinityScore: 0.7, usageCount: 3, avgRating: 4.0, lastUsed: '2026-04-07' },
    { skillId: 'cso', affinityScore: 0.65, usageCount: 0, avgRating: 3, lastUsed: '' },
    { skillId: 'benchmark', affinityScore: 0.9, usageCount: 0, avgRating: 3, lastUsed: '' },
    { skillId: 'health', affinityScore: 0.5, usageCount: 0, avgRating: 3, lastUsed: '' },
  ];

  const baseIndex = [
    { id: 'global:investigate', name: 'investigate', invocation: '/investigate' },
    { id: 'global:review', name: 'review', invocation: '/review' },
    { id: 'global:cso', name: 'cso', invocation: '/cso' },
    { id: 'global:benchmark', name: 'benchmark', invocation: '/benchmark' },
    { id: 'global:health', name: 'health', invocation: '/health' },
  ];

  it('filters skills with affinity > 0.6 AND usageCount == 0', () => {
    const result = findCandidates(baseAffinity, baseIndex);
    // cso (0.65, usage 0) and benchmark (0.9, usage 0) qualify
    // health (0.5) is below threshold, investigate/review have usage > 0
    assert.equal(result.length, 2);
    const ids = result.map(r => r.skillId);
    assert.ok(ids.includes('cso'));
    assert.ok(ids.includes('benchmark'));
  });

  it('ranks by affinityScore descending', () => {
    const result = findCandidates(baseAffinity, baseIndex);
    assert.equal(result[0].skillId, 'benchmark'); // 0.9
    assert.equal(result[1].skillId, 'cso');       // 0.65
  });

  it('caps at 10 candidates', () => {
    // Create 15 unused high-affinity skills
    const manyAffinity = [];
    const manyIndex = [];
    for (let i = 0; i < 15; i++) {
      manyAffinity.push({ skillId: `skill-${i}`, affinityScore: 0.7 + i * 0.01, usageCount: 0, avgRating: 3, lastUsed: '' });
      manyIndex.push({ id: `global:skill-${i}`, name: `skill-${i}`, invocation: `/skill-${i}` });
    }
    const result = findCandidates(manyAffinity, manyIndex);
    assert.equal(result.length, 10);
  });

  it('returns empty when no candidates meet criteria', () => {
    const allUsed = baseAffinity.map(a => ({ ...a, usageCount: 1 }));
    const result = findCandidates(allUsed, baseIndex);
    assert.equal(result.length, 0);
  });

  it('returns empty for empty affinity', () => {
    const result = findCandidates([], baseIndex);
    assert.equal(result.length, 0);
  });

  it('includes invocation from index', () => {
    const result = findCandidates(baseAffinity, baseIndex);
    const benchmark = result.find(r => r.skillId === 'benchmark');
    assert.equal(benchmark.invocation, '/benchmark');
    assert.equal(benchmark.name, 'benchmark');
  });

  it('skips candidates not found in index', () => {
    const affinityWithOrphan = [
      ...baseAffinity,
      { skillId: 'ghost-skill', affinityScore: 0.95, usageCount: 0, avgRating: 3, lastUsed: '' },
    ];
    const result = findCandidates(affinityWithOrphan, baseIndex);
    const ghost = result.find(r => r.skillId === 'ghost-skill');
    assert.equal(ghost, undefined);
  });
});

describe('buildDiscoveryFromPaths', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'discovery-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes advisor-discovery.json from affinity + index files', () => {
    const affinity = [
      { skillId: 'unused-skill', affinityScore: 0.8, usageCount: 0, avgRating: 3, lastUsed: '' },
    ];
    const index = [{ id: 'global:unused-skill', name: 'unused-skill', invocation: '/unused-skill' }];

    const affinityPath = path.join(tmpDir, 'advisor-affinity.json');
    const indexPath = path.join(tmpDir, 'advisor-index-lite.json');
    const outputPath = path.join(tmpDir, 'advisor-discovery.json');

    fs.writeFileSync(affinityPath, JSON.stringify(affinity));
    fs.writeFileSync(indexPath, JSON.stringify(index));

    const result = buildDiscoveryFromPaths(affinityPath, indexPath, outputPath);
    assert.equal(result.length, 1);
    assert.ok(fs.existsSync(outputPath));
  });

  it('writes empty array when no candidates', () => {
    const outputPath = path.join(tmpDir, 'advisor-discovery.json');
    const result = buildDiscoveryFromPaths('/nope/a.json', '/nope/i.json', outputPath);
    assert.deepEqual(result, []);
  });
});
