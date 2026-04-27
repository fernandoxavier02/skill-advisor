'use strict';

/**
 * walk.test.js — Slice 3.1 (Task 4.1) RED tests for `lib/walk.js`.
 *
 * Contract:
 *   walkDir(dir, { matcher, maxDepth, maxEntries, skipDirs }) => string[]
 *
 *     dir         — absolute root directory
 *     matcher     — RegExp tested against entry name, OR function
 *                   (name, fullPath) => boolean. Default: accept all files.
 *     maxDepth    — bounded recursion depth. Default: WALK_LIMITS.MAX_DEPTH
 *     maxEntries  — soft cap on total file matches. Default: WALK_LIMITS.MAX_ENTRIES
 *     skipDirs    — Set or Array of directory basenames to skip. Default:
 *                   ['node_modules', '.git', '.next', 'dist', 'build', 'coverage']
 *     skipHidden  — boolean, skip dirs starting with '.'. Default: true
 *
 *   Returns: deduped + sorted array of absolute file paths matching `matcher`.
 *
 *   Defenses: path containment guard rejects entries whose resolved path
 *   escapes `dir` (symlink defense).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { walkDir } = require('../lib/walk');

// Build a realistic fixture tree once per file.
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'walk-test-'));
fs.mkdirSync(path.join(ROOT, 'src', 'nested', 'deep'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'node_modules', 'pkg'), { recursive: true });
fs.mkdirSync(path.join(ROOT, '.git', 'refs'), { recursive: true });
fs.mkdirSync(path.join(ROOT, '.hidden'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'a.js'), 'a');
fs.writeFileSync(path.join(ROOT, 'b.md'), 'b');
fs.writeFileSync(path.join(ROOT, 'src', 'c.js'), 'c');
fs.writeFileSync(path.join(ROOT, 'src', 'nested', 'd.md'), 'd');
fs.writeFileSync(path.join(ROOT, 'src', 'nested', 'deep', 'e.js'), 'e');
fs.writeFileSync(path.join(ROOT, 'node_modules', 'pkg', 'should-skip.js'), 'x');
fs.writeFileSync(path.join(ROOT, '.git', 'refs', 'should-skip.md'), 'x');
fs.writeFileSync(path.join(ROOT, '.hidden', 'hidden.js'), 'x');

describe('walk: defaults (BDD 1 — node_modules/.git skipped)', () => {
  it('Given a fixture directory with files inside node_modules, When walkDir runs with default skipDirs, Then no result path contains node_modules', () => {
    const result = walkDir(ROOT);
    assert.ok(result.length > 0, 'expected some files');
    assert.ok(!result.some(p => p.includes(`${path.sep}node_modules${path.sep}`)),
      `node_modules leaked: ${result.filter(p => p.includes('node_modules')).join(', ')}`);
  });

  it('Given default skipDirs, When walkDir runs, Then no result path contains .git', () => {
    const result = walkDir(ROOT);
    assert.ok(!result.some(p => p.includes(`${path.sep}.git${path.sep}`)));
  });

  it('Given default skipHidden=true, When walkDir runs, Then no result path is inside a hidden directory', () => {
    const result = walkDir(ROOT);
    assert.ok(!result.some(p => p.includes(`${path.sep}.hidden${path.sep}`)));
  });
});

describe('walk: matcher contract', () => {
  it('Given a RegExp matcher /\\.md$/, When walkDir runs, Then only .md paths are returned', () => {
    const result = walkDir(ROOT, { matcher: /\.md$/ });
    assert.ok(result.length > 0);
    assert.ok(result.every(p => p.endsWith('.md')), `non-md leaked: ${result.filter(p => !p.endsWith('.md')).join(', ')}`);
  });

  it('Given a function matcher, When walkDir runs, Then only entries for which the function returns true are included', () => {
    const result = walkDir(ROOT, { matcher: (name) => name === 'a.js' });
    assert.deepEqual(result, [path.join(ROOT, 'a.js')]);
  });

  it('Given no matcher, When walkDir runs, Then all non-skipped files are included', () => {
    const result = walkDir(ROOT);
    // 5 visible files: a.js, b.md, src/c.js, src/nested/d.md, src/nested/deep/e.js
    assert.equal(result.length, 5);
  });
});

describe('walk: bounds', () => {
  it('Given maxDepth=1, When walkDir runs, Then files in src/nested are excluded', () => {
    const result = walkDir(ROOT, { maxDepth: 1 });
    assert.ok(!result.some(p => p.includes(`${path.sep}nested${path.sep}`)));
    assert.ok(result.some(p => p.endsWith(`${path.sep}a.js`)));
  });

  it('Given maxEntries=2, When walkDir runs, Then no more than 2 paths are returned', () => {
    const result = walkDir(ROOT, { maxEntries: 2 });
    assert.ok(result.length <= 2, `expected ≤2 got ${result.length}`);
  });
});

describe('walk: shape (deduped + sorted)', () => {
  it('Given a normal walk, When complete, Then results are sorted lexicographically and contain no duplicates', () => {
    const result = walkDir(ROOT);
    const sorted = [...result].sort();
    assert.deepEqual(result, sorted, 'results must be sorted');
    assert.equal(new Set(result).size, result.length, 'no duplicates');
  });
});

describe('walk: skipDirs override', () => {
  it('Given skipDirs=[], When walkDir runs, Then node_modules content is included (override applies)', () => {
    const result = walkDir(ROOT, { skipDirs: [], skipHidden: false });
    assert.ok(result.some(p => p.includes(`${path.sep}node_modules${path.sep}`)),
      `expected node_modules to be included with skipDirs=[]`);
  });

  it('Given skipDirs as a Set, When walkDir runs, Then those names are skipped', () => {
    const result = walkDir(ROOT, { skipDirs: new Set(['src']), skipHidden: false });
    assert.ok(!result.some(p => p.includes(`${path.sep}src${path.sep}`)));
    // a.js and b.md at root remain
    assert.ok(result.some(p => p.endsWith(`${path.sep}a.js`)));
  });
});

describe('walk: failure modes', () => {
  it('Given a non-existent directory, When walkDir runs, Then it returns an empty array (no throw)', () => {
    const ghost = path.join(ROOT, '__missing__');
    assert.deepEqual(walkDir(ghost), []);
  });

  it('Given dir is not a string, When walkDir is called, Then it throws TypeError', () => {
    assert.throws(() => walkDir(null), /TypeError/);
    assert.throws(() => walkDir(123), /TypeError/);
  });
});
