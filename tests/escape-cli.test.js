'use strict';

/**
 * escape-cli.test.js — Smoke tests for lib/escape-cli.js.
 *
 * The CLI wraps lib/escaping.js and is invoked by commands/advisor.md
 * and agents/advisor-gate.md via the Bash tool to materialize Rule 12
 * escaping at runtime. Without this wire the module is orphan code.
 *
 * Contract:
 *   $ echo -n "INPUT" | node lib/escape-cli.js <maxLen> [label]
 *   prints the escaped string to stdout, exit code 0
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const CLI = path.join(__dirname, '..', 'lib', 'escape-cli.js');

function runCli(input, maxLen, label = 'field') {
  const result = spawnSync(
    process.execPath,
    [CLI, String(maxLen), label],
    { input, encoding: 'utf8' },
  );
  return result;
}

describe('escape-cli: smoke tests', () => {
  it('echoes safe input unchanged within maxLen', () => {
    const r = runCli('hello world', 200);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout, 'hello world');
  });

  it('redacts triple backticks from stdin', () => {
    const r = runCli('before ```bash\nrm -rf /\n```', 200);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('<backticks stripped by sanitizer>'));
    assert.ok(!r.stdout.includes('```'));
  });

  it('truncates input exceeding maxLen', () => {
    const r = runCli('a'.repeat(5000), 100);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.length <= 100);
    assert.ok(r.stdout.endsWith('... [truncated]'));
  });

  it('removes carriage returns', () => {
    const r = runCli('line1\r\nline2\r\n', 200);
    assert.equal(r.status, 0);
    assert.ok(!r.stdout.includes('\r'));
  });

  it('strips control chars below 0x20 except \\n and \\t', () => {
    const r = runCli('before\x07\x08after\tend', 200);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, 'beforeafter\tend');
  });

  it('handles empty stdin', () => {
    const r = runCli('', 200);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  });

  it('exits non-zero when maxLen is missing', () => {
    const result = spawnSync(process.execPath, [CLI], { input: 'x', encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /usage|maxLen/i);
  });

  it('exits non-zero when maxLen is not a positive integer', () => {
    const result = spawnSync(process.execPath, [CLI, 'abc', 'field'], { input: 'x', encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /maxLen/i);
  });
});
