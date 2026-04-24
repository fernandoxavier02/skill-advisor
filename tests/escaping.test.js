'use strict';

/**
 * escaping.test.js — Regression tests for lib/escaping.js (Rule 12 sanitizer).
 *
 * Covers each rule from advisor-gate.md Rule 12:
 *   (a) redact runs of 3+ backticks
 *   (b) remove \r
 *   (c) collapse \n+ into \n
 *   (d) drop control chars below 0x20 (except \n and \t)
 *   (e) truncate with '... [truncated]' suffix
 *   Plus edge cases: cross-field backtick concatenation, empty input,
 *   input at exact maxLen boundary.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { escape } = require('../lib/escaping');

describe('escape: backtick redaction (rule a)', () => {
  it('redacts a run of 3 backticks', () => {
    const result = escape('hello ```world', 200, 'test');
    assert.ok(result.includes('<backticks stripped by sanitizer>'));
    assert.ok(!result.includes('```'));
  });

  it('redacts a run of 4+ backticks', () => {
    const result = escape('code: ``````python', 200, 'test');
    assert.ok(result.includes('<backticks stripped by sanitizer>'));
    assert.ok(!result.includes('````'));
  });

  it('preserves single and double backticks', () => {
    const result = escape('use `code` or ``double``', 200, 'test');
    assert.equal(result, 'use `code` or ``double``');
  });
});

describe('escape: carriage return removal (rule b)', () => {
  it('removes \\r characters', () => {
    const result = escape('hello\r\nworld\r\n', 200, 'test');
    assert.ok(!result.includes('\r'));
    assert.ok(result.includes('hello\nworld\n'));
  });
});

describe('escape: newline collapsing (rule c)', () => {
  it('collapses 3+ consecutive newlines into one', () => {
    const result = escape('a\n\n\nb', 200, 'test');
    assert.equal(result, 'a\nb');
  });

  it('collapses mixed \\r\\n runs into single \\n', () => {
    const result = escape('a\r\n\r\n\r\nb', 200, 'test');
    assert.equal(result, 'a\nb');
  });

  it('preserves single newline', () => {
    const result = escape('line1\nline2', 200, 'test');
    assert.equal(result, 'line1\nline2');
  });
});

describe('escape: control char stripping (rule d)', () => {
  it('removes NUL byte', () => {
    const result = escape('before\x00after', 200, 'test');
    assert.equal(result, 'beforeafter');
  });

  it('removes other control chars below 0x20 (except \\t and \\n)', () => {
    const result = escape('a\x01\x02\x03b\tc\nd', 200, 'test');
    assert.equal(result, 'ab\tc\nd');
  });

  it('preserves tab characters', () => {
    const result = escape('col1\tcol2', 200, 'test');
    assert.ok(result.includes('\t'));
  });
});

describe('escape: truncation (rule e)', () => {
  it('truncates and appends suffix when over maxLen', () => {
    const input = 'a'.repeat(100);
    const result = escape(input, 50, 'test_field');
    assert.ok(result.endsWith('... [truncated]'));
    assert.ok(result.length <= 50 + 20, `result too long: ${result.length}`);
  });

  it('does not truncate when at exactly maxLen', () => {
    const input = 'a'.repeat(50);
    const result = escape(input, 50, 'test');
    assert.equal(result, input);
    assert.ok(!result.includes('[truncated]'));
  });

  it('does not truncate when under maxLen', () => {
    const result = escape('short', 200, 'test');
    assert.equal(result, 'short');
  });
});

describe('escape: edge cases', () => {
  it('returns empty string for empty input', () => {
    assert.equal(escape('', 200, 'test'), '');
  });

  it('handles null/undefined input gracefully', () => {
    assert.equal(escape(null, 200, 'test'), '');
    assert.equal(escape(undefined, 200, 'test'), '');
  });

  it('handles non-string input by converting to string', () => {
    const result = escape(12345, 200, 'test');
    assert.equal(result, '12345');
  });

  it('cross-field: backticks split across truncation boundary', () => {
    const input = 'a'.repeat(48) + '``';
    const result = escape(input + '`rest', 50, 'test');
    // The 3-backtick run that straddles the boundary should be redacted
    assert.ok(!result.includes('```') || result.includes('<backticks stripped by sanitizer>'));
  });
});
