'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { extractCombos, buildCombosFromPath } = require('../lib/build-combos');

const FIXTURES = path.join(__dirname, 'fixtures', 'jsonl');

describe('extractCombos', () => {
  it('extracts combos from telemetry with executed_actual', () => {
    const telemetryPath = path.join(FIXTURES, 'telemetry-valid.jsonl');
    const result = extractCombos(telemetryPath);
    assert.ok(Array.isArray(result));
    // investigate→fix→review appears in sess-001 and sess-004 (2 times)
    // That's below min threshold of 3, so may not appear
  });

  it('applies min occurrence threshold (count >= 3)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combos-test-'));
    const telPath = path.join(tmpDir, 'telemetry.jsonl');

    // Create 4 identical sequences to exceed threshold
    const lines = [];
    for (let i = 0; i < 4; i++) {
      lines.push(JSON.stringify({
        ts: `2026-04-0${i + 1}T10:00:00Z`,
        session_id: `sess-${100 + i}`,
        action: 'approve',
        executed_actual: ['investigate', 'fix', 'review'],
      }));
    }
    fs.writeFileSync(telPath, lines.join('\n'));

    const result = extractCombos(telPath);
    assert.ok(result.length >= 1, 'Expected at least 1 combo above threshold');

    const combo = result.find(r => JSON.stringify(r.sequence) === JSON.stringify(['investigate', 'fix', 'review']));
    assert.ok(combo, 'Expected investigate→fix→review combo');
    assert.ok(combo.count >= 3);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('deduplicates identical sequences', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combos-test-'));
    const telPath = path.join(tmpDir, 'telemetry.jsonl');

    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push(JSON.stringify({
        ts: `2026-04-0${i + 1}T10:00:00Z`,
        session_id: `sess-${200 + i}`,
        action: 'approve',
        executed_actual: ['review', 'ship'],
      }));
    }
    fs.writeFileSync(telPath, lines.join('\n'));

    const result = extractCombos(telPath);
    const reviewShip = result.filter(r => JSON.stringify(r.sequence) === JSON.stringify(['review', 'ship']));
    assert.equal(reviewShip.length, 1, 'Expected exactly 1 entry for review→ship');
    assert.equal(reviewShip[0].count, 5);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty for cold start', () => {
    const result = extractCombos('/nonexistent/telemetry.jsonl');
    assert.deepEqual(result, []);
  });

  it('returns empty for empty telemetry', () => {
    const result = extractCombos(path.join(FIXTURES, 'telemetry-empty.jsonl'));
    assert.deepEqual(result, []);
  });

  it('ignores cancelled sessions', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combos-test-'));
    const telPath = path.join(tmpDir, 'telemetry.jsonl');

    const lines = [];
    for (let i = 0; i < 4; i++) {
      lines.push(JSON.stringify({
        ts: `2026-04-0${i + 1}T10:00:00Z`,
        session_id: `sess-${300 + i}`,
        action: 'cancelled',
        executed_actual: ['investigate', 'fix'],
      }));
    }
    fs.writeFileSync(telPath, lines.join('\n'));

    const result = extractCombos(telPath);
    assert.equal(result.length, 0, 'Cancelled sessions should not count');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('ignores single-skill sequences', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combos-test-'));
    const telPath = path.join(tmpDir, 'telemetry.jsonl');

    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push(JSON.stringify({
        ts: `2026-04-0${i + 1}T10:00:00Z`,
        session_id: `sess-${400 + i}`,
        action: 'approve',
        executed_actual: ['ship'],
      }));
    }
    fs.writeFileSync(telPath, lines.join('\n'));

    const result = extractCombos(telPath);
    assert.equal(result.length, 0, 'Single-skill sequences are not combos');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('result entries have expected shape', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combos-test-'));
    const telPath = path.join(tmpDir, 'telemetry.jsonl');

    const lines = [];
    for (let i = 0; i < 4; i++) {
      lines.push(JSON.stringify({
        ts: `2026-04-0${i + 1}T10:00:00Z`,
        session_id: `sess-${500 + i}`,
        action: 'approve',
        executed_actual: ['qa', 'review', 'ship'],
      }));
    }
    fs.writeFileSync(telPath, lines.join('\n'));

    const result = extractCombos(telPath);
    assert.ok(result.length >= 1);
    const entry = result[0];
    assert.ok(Array.isArray(entry.sequence));
    assert.equal(typeof entry.count, 'number');
    assert.equal(typeof entry.lastSeen, 'string');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('buildCombosFromPath', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combos-build-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes advisor-combos.json', () => {
    const telPath = path.join(tmpDir, 'telemetry.jsonl');
    const lines = [];
    for (let i = 0; i < 4; i++) {
      lines.push(JSON.stringify({
        ts: `2026-04-0${i + 1}T10:00:00Z`,
        session_id: `sess-${600 + i}`,
        action: 'approve',
        executed_actual: ['investigate', 'fix'],
      }));
    }
    fs.writeFileSync(telPath, lines.join('\n'));

    const outputPath = path.join(tmpDir, 'advisor-combos.json');
    const result = buildCombosFromPath(telPath, outputPath);
    assert.ok(result.length >= 1);
    assert.ok(fs.existsSync(outputPath));
  });
});
