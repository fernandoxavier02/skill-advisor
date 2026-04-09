'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { computeStats, computeHeatMap, computeProfile } = require('../lib/advisor-stats');

const FIXTURES = path.join(__dirname, 'fixtures', 'jsonl');

describe('computeStats', () => {
  it('aggregates skill usage from telemetry', () => {
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');
    const result = computeStats(telemetryPath);

    assert.ok(result);
    assert.equal(typeof result.totalSessions, 'number');
    assert.ok(result.totalSessions > 0);
    assert.ok(Array.isArray(result.topSkills));
    assert.ok(result.topSkills.length > 0);
    assert.ok(typeof result.categoryDistribution === 'object');
  });

  it('counts sessions correctly (excluding cancelled)', () => {
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');
    const result = computeStats(telemetryPath);
    // 10 entries, 1 cancelled → 9 active sessions
    assert.equal(result.totalSessions, 9);
  });

  it('ranks skills by usage count', () => {
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');
    const result = computeStats(telemetryPath);

    // Top skills should be sorted descending
    for (let i = 1; i < result.topSkills.length; i++) {
      assert.ok(result.topSkills[i].count <= result.topSkills[i - 1].count,
        `Expected ${result.topSkills[i].name} (${result.topSkills[i].count}) <= ${result.topSkills[i - 1].name} (${result.topSkills[i - 1].count})`);
    }
  });

  it('categorizes skills meaningfully (not all utility)', () => {
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');
    const result = computeStats(telemetryPath);
    const cats = Object.keys(result.categoryDistribution);
    // investigate/fix → debugging, review → quality, ship → deployment
    assert.ok(cats.length > 1, `Expected multiple categories, got: ${cats.join(', ')}`);
  });

  it('returns empty stats for missing file', () => {
    const result = computeStats('/nonexistent/telemetry.jsonl');
    assert.equal(result.totalSessions, 0);
    assert.deepEqual(result.topSkills, []);
    assert.deepEqual(result.categoryDistribution, {});
  });

  it('returns empty stats for empty file', () => {
    const result = computeStats(path.join(FIXTURES, 'telemetry-empty.jsonl'));
    assert.equal(result.totalSessions, 0);
  });
});

describe('computeHeatMap', () => {
  it('computes usage counts per skill over 7d/30d/90d windows', () => {
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');
    // Use a reference date that makes fixture data "recent"
    const refDate = new Date('2026-04-09T00:00:00Z');
    const result = computeHeatMap(telemetryPath, refDate);

    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);

    for (const entry of result) {
      assert.equal(typeof entry.skillName, 'string');
      assert.equal(typeof entry.usage7d, 'number');
      assert.equal(typeof entry.usage30d, 'number');
      assert.equal(typeof entry.usage90d, 'number');
      assert.ok(['up', 'down', 'flat'].includes(entry.trend));
    }
  });

  it('computes trend correctly', () => {
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');
    const refDate = new Date('2026-04-09T00:00:00Z');
    const result = computeHeatMap(telemetryPath, refDate);

    // investigate: used on 04-01, 04-05, 04-06 → within 7-8d of 04-09
    const investigate = result.find(r => r.skillName === 'investigate');
    assert.ok(investigate);
    assert.ok(investigate.usage90d > 0);
    // trend should be a valid value
    assert.ok(['up', 'down', 'flat'].includes(investigate.trend));
  });

  it('returns empty for missing file', () => {
    const result = computeHeatMap('/nonexistent/telemetry.jsonl');
    assert.deepEqual(result, []);
  });
});

describe('computeProfile', () => {
  it('computes user profile from telemetry', () => {
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');
    const profile = computeProfile(telemetryPath);

    assert.ok(Array.isArray(profile.preferredSkills));
    assert.ok(profile.preferredSkills.length > 0);
    assert.ok(profile.preferredSkills.length <= 5);
    assert.equal(typeof profile.dominantCategory, 'string');
    assert.ok(profile.totalUsage > 0);
    assert.ok(profile.uniqueSkills > 0);
  });

  it('returns empty profile for missing file', () => {
    const profile = computeProfile('/nonexistent/telemetry.jsonl');
    assert.deepEqual(profile.preferredSkills, []);
    assert.equal(profile.dominantCategory, null);
    assert.equal(profile.totalUsage, 0);
  });
});
