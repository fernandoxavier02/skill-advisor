'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { getBranchCategory, getFileExtensions } = require('../lib/context');
const { CATEGORIES } = require('../lib/constants');

describe('getBranchCategory', () => {
  it('maps fix/ to debugging', () => {
    assert.equal(getBranchCategory('fix/login-bug'), CATEGORIES.DEBUGGING);
  });

  it('maps feat/ to implementation', () => {
    assert.equal(getBranchCategory('feat/new-dashboard'), CATEGORIES.IMPLEMENTATION);
  });

  it('maps feature/ to implementation', () => {
    assert.equal(getBranchCategory('feature/add-search'), CATEGORIES.IMPLEMENTATION);
  });

  it('maps chore/ to utility', () => {
    assert.equal(getBranchCategory('chore/update-deps'), CATEGORIES.UTILITY);
  });

  it('maps release/ to deployment', () => {
    assert.equal(getBranchCategory('release/v2.0'), CATEGORIES.DEPLOYMENT);
  });

  it('maps docs/ to documentation', () => {
    assert.equal(getBranchCategory('docs/update-readme'), CATEGORIES.DOCUMENTATION);
  });

  it('maps test/ to quality', () => {
    assert.equal(getBranchCategory('test/add-coverage'), CATEGORIES.QUALITY);
  });

  it('maps refactor/ to quality', () => {
    assert.equal(getBranchCategory('refactor/split-module'), CATEGORIES.QUALITY);
  });

  it('maps bugfix/ to debugging', () => {
    assert.equal(getBranchCategory('bugfix/null-ref'), CATEGORIES.DEBUGGING);
  });

  it('maps hotfix/ to debugging', () => {
    assert.equal(getBranchCategory('hotfix/prod-crash'), CATEGORIES.DEBUGGING);
  });

  it('maps deploy/ to deployment', () => {
    assert.equal(getBranchCategory('deploy/staging'), CATEGORIES.DEPLOYMENT);
  });

  it('returns null for unknown prefix', () => {
    assert.equal(getBranchCategory('my-random-branch'), null);
  });

  it('returns null for main/master', () => {
    assert.equal(getBranchCategory('main'), null);
  });

  it('returns null for empty string', () => {
    assert.equal(getBranchCategory(''), null);
  });

  it('returns null for null/undefined', () => {
    assert.equal(getBranchCategory(null), null);
    assert.equal(getBranchCategory(undefined), null);
  });

  it('handles branch without slash (just prefix)', () => {
    // "fix" alone without slash should not match — convention requires prefix/name
    assert.equal(getBranchCategory('fix'), null);
  });
});

describe('getFileExtensions', () => {
  it('extracts unique extensions from diff stat lines', () => {
    const diffStat = [
      'lib/index.js  | 10 +++---',
      'lib/utils.js  | 5 ++',
      'README.md     | 3 +',
      'styles/app.css | 8 ++++',
    ];
    const exts = getFileExtensions(diffStat);
    assert.deepEqual([...exts].sort(), ['.css', '.js', '.md']);
  });

  it('returns empty set for empty diff', () => {
    const exts = getFileExtensions([]);
    assert.equal(exts.size, 0);
  });

  it('returns empty set for null/undefined', () => {
    assert.equal(getFileExtensions(null).size, 0);
    assert.equal(getFileExtensions(undefined).size, 0);
  });

  it('handles files without extension', () => {
    const diffStat = ['Makefile | 2 ++', 'lib/index.js | 1 +'];
    const exts = getFileExtensions(diffStat);
    assert.ok(exts.has('.js'));
    assert.equal(exts.size, 1); // Makefile has no extension
  });

  it('handles string input (single line)', () => {
    const exts = getFileExtensions('lib/foo.ts | 5 ++');
    assert.ok(exts.has('.ts'));
  });
});
