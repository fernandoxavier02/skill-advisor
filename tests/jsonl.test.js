'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { readJSONL, writeJSON, appendJSONL } = require('../lib/jsonl');

const FIXTURES = path.join(__dirname, 'fixtures', 'jsonl');

describe('readJSONL', () => {
  it('reads valid JSONL and returns array of objects', () => {
    const result = readJSONL(path.join(FIXTURES, 'feedback-valid.jsonl'));
    assert.equal(result.data.length, 5);
    assert.equal(result.errorCount, 0);
    assert.equal(result.data[0].session_id, 'sess-001');
    assert.equal(result.data[4].rating, 2);
  });

  it('skips malformed lines and reports error count', () => {
    const result = readJSONL(path.join(FIXTURES, 'feedback-malformed.jsonl'));
    assert.equal(result.data.length, 3);
    assert.equal(result.errorCount, 2); // "not valid json" + broken json (empty line is skipped, not an error)
  });

  it('returns empty for non-existent file', () => {
    const result = readJSONL('/nonexistent/path/file.jsonl');
    assert.equal(result.data.length, 0);
    assert.equal(result.errorCount, 0);
  });

  it('returns empty for empty file', () => {
    const result = readJSONL(path.join(FIXTURES, 'telemetry-empty.jsonl'));
    assert.equal(result.data.length, 0);
    assert.equal(result.errorCount, 0);
  });

  it('returns empty for non-string path', () => {
    const result = readJSONL(null);
    assert.equal(result.data.length, 0);
    assert.equal(result.errorCount, 0);
  });

  it('returns empty for undefined path', () => {
    const result = readJSONL(undefined);
    assert.equal(result.data.length, 0);
    assert.equal(result.errorCount, 0);
  });

  it('rejects lines with __proto__ key', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonl-proto-'));
    const filePath = path.join(tmpDir, 'poison.jsonl');
    fs.writeFileSync(filePath, '{"__proto__":{"isAdmin":true}}\n{"ok":true}\n');
    const result = readJSONL(filePath);
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].ok, true);
    assert.equal(result.errorCount, 1);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads telemetry with executed_actual arrays', () => {
    const result = readJSONL(path.join(FIXTURES, 'telemetry-valid.jsonl'));
    assert.equal(result.data.length, 10);
    assert.deepEqual(result.data[0].executed_actual, ['investigate', 'fix', 'review']);
    assert.deepEqual(result.data[3].executed_actual, []);
  });
});

describe('writeJSON', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonl-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes JSON to file', () => {
    const filePath = path.join(tmpDir, 'output.json');
    const data = [{ id: 1, name: 'test' }];
    writeJSON(filePath, data);
    const read = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.deepEqual(read, data);
  });

  it('creates parent directories', () => {
    const filePath = path.join(tmpDir, 'nested', 'deep', 'output.json');
    writeJSON(filePath, { ok: true });
    assert.ok(fs.existsSync(filePath));
    const read = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.deepEqual(read, { ok: true });
  });

  it('overwrites existing file', () => {
    const filePath = path.join(tmpDir, 'output.json');
    writeJSON(filePath, { v: 1 });
    writeJSON(filePath, { v: 2 });
    const read = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.equal(read.v, 2);
  });
});

describe('appendJSONL', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonl-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('appends a single line to file', () => {
    const filePath = path.join(tmpDir, 'log.jsonl');
    appendJSONL(filePath, { ts: '2026-01-01', skill: 'test' });
    appendJSONL(filePath, { ts: '2026-01-02', skill: 'review' });
    const result = readJSONL(filePath);
    assert.equal(result.data.length, 2);
    assert.equal(result.data[0].skill, 'test');
    assert.equal(result.data[1].skill, 'review');
  });

  it('creates parent directories', () => {
    const filePath = path.join(tmpDir, 'nested', 'log.jsonl');
    appendJSONL(filePath, { ok: true });
    assert.ok(fs.existsSync(filePath));
  });

  it('handles null filePath gracefully', () => {
    assert.throws(() => appendJSONL(null, { ok: true }));
  });

  it('appends to existing file', () => {
    const filePath = path.join(tmpDir, 'log.jsonl');
    fs.writeFileSync(filePath, '{"existing":true}\n');
    appendJSONL(filePath, { new: true });
    const result = readJSONL(filePath);
    assert.equal(result.data.length, 2);
    assert.equal(result.data[0].existing, true);
    assert.equal(result.data[1].new, true);
  });
});
