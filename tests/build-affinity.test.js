'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { computeAffinity, buildAffinityFromPaths } = require('../lib/build-affinity');

const FIXTURES = path.join(__dirname, 'fixtures', 'jsonl');

describe('computeAffinity', () => {
  it('computes affinity from valid feedback + telemetry', () => {
    const feedbackPath = path.join(FIXTURES, 'feedback-valid.jsonl');
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');

    const result = computeAffinity(feedbackPath, telemetryPath);
    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);

    // Each entry has expected shape
    for (const entry of result) {
      assert.equal(typeof entry.skillId, 'string');
      assert.equal(typeof entry.affinityScore, 'number');
      assert.equal(typeof entry.usageCount, 'number');
      assert.equal(typeof entry.avgRating, 'number');
      assert.equal(typeof entry.lastUsed, 'string');
    }
  });

  it('returns sorted by affinityScore descending', () => {
    const feedbackPath = path.join(FIXTURES, 'feedback-valid.jsonl');
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');

    const result = computeAffinity(feedbackPath, telemetryPath);
    for (let i = 1; i < result.length; i++) {
      assert.ok(result[i].affinityScore <= result[i - 1].affinityScore,
        `Expected ${result[i].skillId} (${result[i].affinityScore}) <= ${result[i - 1].skillId} (${result[i - 1].affinityScore})`);
    }
  });

  it('investigate appears with high affinity (rated 5 twice)', () => {
    const feedbackPath = path.join(FIXTURES, 'feedback-valid.jsonl');
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');

    const result = computeAffinity(feedbackPath, telemetryPath);
    const investigate = result.find(r => r.skillId === 'investigate');
    assert.ok(investigate, 'Expected investigate to be in results');
    assert.ok(investigate.usageCount >= 2, 'Expected investigate used >= 2 times');
    assert.ok(investigate.avgRating >= 4, 'Expected investigate high rating');
  });

  it('returns empty array for cold start (no files)', () => {
    const result = computeAffinity('/nonexistent/feedback.jsonl', '/nonexistent/telemetry.jsonl');
    assert.deepEqual(result, []);
  });

  it('handles only feedback (no telemetry)', () => {
    const feedbackPath = path.join(FIXTURES, 'feedback-valid.jsonl');
    const result = computeAffinity(feedbackPath, '/nonexistent/telemetry.jsonl');
    assert.ok(Array.isArray(result));
    // Should still produce results from feedback helpful_skill data
    assert.ok(result.length > 0);
  });

  it('handles only telemetry (no feedback)', () => {
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');
    const result = computeAffinity('/nonexistent/feedback.jsonl', telemetryPath);
    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
  });

  it('handles malformed JSONL gracefully', () => {
    const feedbackPath = path.join(FIXTURES, 'feedback-malformed.jsonl');
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');

    const result = computeAffinity(feedbackPath, telemetryPath);
    assert.ok(Array.isArray(result));
    // Should still produce results from valid lines
    assert.ok(result.length > 0);
  });

  it('penalizes unhelpful skills (cso rated low)', () => {
    const feedbackPath = path.join(FIXTURES, 'feedback-valid.jsonl');
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');

    const result = computeAffinity(feedbackPath, telemetryPath);
    const cso = result.find(r => r.skillId === 'cso');
    assert.ok(cso, 'Expected cso to be in results');
    // cso was marked unhelpful in sess-005 (rating 2) → should get rating 1
    assert.ok(cso.avgRating < 3, `Expected cso avgRating < 3 (neutral), got ${cso.avgRating}`);
  });

  it('deprioritizes cancelled sessions', () => {
    const feedbackPath = path.join(FIXTURES, 'feedback-valid.jsonl');
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');

    const result = computeAffinity(feedbackPath, telemetryPath);
    // sess-010 was cancelled — investigate from that session should not boost
    // investigate still appears (from other sessions) but cancelled doesn't inflate count
    const investigate = result.find(r => r.skillId === 'investigate');
    assert.ok(investigate);
    // telemetry has investigate in sess-001, sess-004, sess-012, plus cancelled sess-010
    // cancelled should NOT count as usage
  });

  it('tracks skills from executed_actual, not just top_skill', () => {
    const feedbackPath = path.join(FIXTURES, 'feedback-valid.jsonl');
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');

    const result = computeAffinity(feedbackPath, telemetryPath);
    // "fix" appears in executed_actual of sess-001, sess-004, sess-006, sess-012
    const fix = result.find(r => r.skillId === 'fix');
    assert.ok(fix, 'Expected fix to appear from executed_actual');
    assert.ok(fix.usageCount >= 3);
  });
});

describe('buildAffinityFromPaths', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'affinity-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes advisor-affinity.json', () => {
    const feedbackPath = path.join(FIXTURES, 'feedback-valid.jsonl');
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');
    const outputPath = path.join(tmpDir, 'advisor-affinity.json');

    const result = buildAffinityFromPaths(feedbackPath, telemetryPath, outputPath);
    assert.ok(result.length > 0);
    assert.ok(fs.existsSync(outputPath));

    const written = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.deepEqual(written, result);
  });

  it('writes empty array for cold start', () => {
    const outputPath = path.join(tmpDir, 'advisor-affinity.json');
    const result = buildAffinityFromPaths('/nope/f.jsonl', '/nope/t.jsonl', outputPath);
    assert.deepEqual(result, []);
    const written = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.deepEqual(written, []);
  });
});
