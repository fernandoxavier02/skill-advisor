// tests/dependency-edges.test.js
//
// ARCHITECTURAL INVARIANT (DI-2): Layered dependency direction.
//   utils -> domain -> builders -> hooks
// Each layer imports only from layers to its left, never upward.
//
// Allowed exceptions: ZERO. If a real exception arises, edit this test
// with a code-review-justified comment. Do not weaken to a warning.
//
// Regex scope: catches `require('./build-X')` and `require("./build-X")`
// (single and double quotes). Misses backtick template literals, dynamic
// requires (`require(varName)`), and `import('./build-X')` ESM dynamic
// imports. Today the codebase has zero usages of those patterns, but a
// future migration to ESM or a refactor introducing template-literal
// requires would need this regex extended.
//
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Given a sample lib/ tree, When the dependency-edge guard runs, Then no domain module imports from build-*.js', () => {
  const libDir = path.resolve(__dirname, '..', 'lib');
  const violations = [];

  for (const name of fs.readdirSync(libDir)) {
    if (!name.endsWith('.js')) continue;
    if (name.startsWith('build-')) continue; // builders may import each other if needed

    const filePath = path.join(libDir, name);
    const src = fs.readFileSync(filePath, 'utf8');
    const matches = src.matchAll(/require\(['"]\.\/build-[^'"]+['"]\)/g);
    for (const m of matches) {
      violations.push(`${name}: ${m[0]}`);
    }
  }

  assert.deepEqual(violations, [],
    `Domain -> builder coupling detected:\n${violations.join('\n')}\n\n` +
    `Fix: extract the imported symbol(s) to a neutral lib/<utility>.js module.`);
});
