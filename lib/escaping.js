'use strict';

/**
 * escaping.js — Prompt injection sanitizer (Rule 12 materialization).
 *
 * Implements the downstream escaping contract defined in
 * agents/advisor-gate.md Rule 12. Every field passed to a spawned
 * sub-agent must be escaped through this function.
 *
 * Rules:
 *   (a) redact runs of 3+ backticks → '<backticks stripped by sanitizer>'
 *   (b) remove \r
 *   (c) collapse \n+ into \n
 *   (d) drop control chars below 0x20 (preserve \n and \t)
 *   (e) truncate at maxLen with '... [truncated]' suffix
 */

const TRUNCATION_SUFFIX = '... [truncated]';
const BACKTICK_REDACTED = '<backticks stripped by sanitizer>';

/**
 * @param {*} field — the raw field value
 * @param {number} maxLen — maximum allowed character length
 * @param {string} label — field name for diagnostics (unused in output)
 * @returns {string} sanitized string
 */
function escape(field, maxLen, label) {
  if (field === null || field === undefined) return '';
  let s = String(field);

  // (b) remove carriage returns
  s = s.replace(/\r/g, '');

  // (d) drop control chars below 0x20, except \n (0x0A) and \t (0x09)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // (c) collapse runs of 2+ newlines into one
  s = s.replace(/\n{2,}/g, '\n');

  // (a) redact runs of 3 or more backticks
  s = s.replace(/`{3,}/g, BACKTICK_REDACTED);

  // (e) truncate if over maxLen
  if (s.length > maxLen) {
    s = s.slice(0, maxLen - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX;
  }

  return s;
}

module.exports = { escape };
