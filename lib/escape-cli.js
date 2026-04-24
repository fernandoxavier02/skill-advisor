#!/usr/bin/env node
'use strict';

/**
 * escape-cli.js — CLI wrapper around lib/escaping.js so that the
 * `commands/advisor.md` Section 6.1 contract and the `agents/
 * advisor-gate.md` Rule 12 contract are materialized at runtime via
 * the Bash tool, not reimplemented in prose by each invocation.
 *
 * Usage (stdin → stdout):
 *   $ echo -n "INPUT" | node lib/escape-cli.js <maxLen> [label]
 *
 * Exit codes:
 *   0 — ok, sanitized string written to stdout
 *   1 — invalid arguments (missing or non-numeric maxLen)
 *   2 — stdin read error
 *
 * Pure function. No side effects beyond stdin/stdout.
 */

const { escape } = require('./escaping');

function printUsage() {
  process.stderr.write(
    'Usage: node lib/escape-cli.js <maxLen> [label]\n' +
    '  reads the raw field from stdin and writes the sanitized value to stdout\n' +
    '  maxLen must be a positive integer; label is informational\n',
  );
}

function main() {
  const [maxLenArg, labelArg] = process.argv.slice(2);

  if (!maxLenArg) {
    printUsage();
    process.exit(1);
  }

  const maxLen = Number.parseInt(maxLenArg, 10);
  if (!Number.isFinite(maxLen) || maxLen <= 0 || String(maxLen) !== maxLenArg.trim()) {
    process.stderr.write(`invalid maxLen: "${maxLenArg}" (must be a positive integer)\n`);
    process.exit(1);
  }

  const label = typeof labelArg === 'string' && labelArg.length > 0 ? labelArg : 'field';

  const chunks = [];
  process.stdin.on('data', (c) => chunks.push(c));
  process.stdin.on('end', () => {
    const input = Buffer.concat(chunks).toString('utf8');
    const output = escape(input, maxLen, label);
    process.stdout.write(output);
  });
  process.stdin.on('error', (err) => {
    process.stderr.write(`stdin error: ${err.message}\n`);
    process.exit(2);
  });
}

if (require.main === module) {
  main();
}

module.exports = { main };
