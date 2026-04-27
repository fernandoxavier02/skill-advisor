'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { inferCategory, CATEGORY_PATTERNS } = require('../lib/category');

describe('CATEGORY_PATTERNS', () => {
  it('Given the exported map, When inspected, Then it is a frozen object with the expected category keys', () => {
    assert.equal(typeof CATEGORY_PATTERNS, 'object');
    assert.ok(Object.isFrozen(CATEGORY_PATTERNS), 'CATEGORY_PATTERNS must be frozen');
    const keys = Object.keys(CATEGORY_PATTERNS);
    for (const expected of ['planning', 'implementation', 'quality', 'debugging', 'deployment', 'documentation', 'data', 'utility']) {
      assert.ok(keys.includes(expected), `expected category key "${expected}"`);
    }
  });
});

describe('inferCategory', () => {
  it('Given a description matching the debugging pattern, When inferCategory runs, Then it returns "debugging"', () => {
    assert.equal(inferCategory('Systematic debugging with root cause analysis'), 'debugging');
    assert.equal(inferCategory('investigate the bug'), 'debugging');
    assert.equal(inferCategory('troubleshoot error'), 'debugging');
  });

  it('Given a description matching the deployment pattern, When inferCategory runs, Then it returns "deployment"', () => {
    assert.equal(inferCategory('Deploy the project to production'), 'deployment');
    assert.equal(inferCategory('ship the release'), 'deployment');
    assert.equal(inferCategory('merge pr after ci-cd'), 'deployment');
  });

  it('Given a description matching the quality pattern, When inferCategory runs, Then it returns "quality"', () => {
    assert.equal(inferCategory('Review pull requests and run security audit'), 'quality');
    assert.equal(inferCategory('lint and test coverage'), 'quality');
  });

  it('Given a description matching the planning pattern, When inferCategory runs, Then it returns "planning"', () => {
    assert.equal(inferCategory('Brainstorm and design new features'), 'planning');
    assert.equal(inferCategory('write a spec and architect the system'), 'planning');
  });

  it('Given a description matching the implementation pattern, When inferCategory runs, Then it returns "implementation"', () => {
    assert.equal(inferCategory('build the feature'), 'implementation');
    assert.equal(inferCategory('implement the API endpoint'), 'implementation');
  });

  it('Given a description matching the documentation pattern, When inferCategory runs, Then it returns "documentation"', () => {
    assert.equal(inferCategory('document the public API'), 'documentation');
    assert.equal(inferCategory('write a README for the module'), 'documentation');
  });

  it('Given a description matching the data pattern, When inferCategory runs, Then it returns "data"', () => {
    assert.equal(inferCategory('migrate the database schema'), 'data');
    assert.equal(inferCategory('fetch records via the API'), 'data');
    assert.equal(inferCategory('query the SQL store'), 'data');
  });

  it('Given a description that matches multiple categories, When inferCategory runs, Then the first matching category in CATEGORY_PATTERNS wins', () => {
    // CATEGORY_PATTERNS iterates in insertion order. If "test debug" matches
    // both `quality` (test) and `debugging` (debug), the category declared
    // first in the map wins. This test locks the ordering invariant so a
    // future reordering of CATEGORY_PATTERNS does not silently flip results.
    const result = inferCategory('test debug');
    const declaredOrder = Object.keys(CATEGORY_PATTERNS);
    const qualityIdx = declaredOrder.indexOf('quality');
    const debuggingIdx = declaredOrder.indexOf('debugging');
    const expected = qualityIdx < debuggingIdx ? 'quality' : 'debugging';
    assert.equal(result, expected,
      `First-match-wins ordering broke: input "test debug" returned ${result} but ` +
      `the earlier-declared category ("${expected}") should win.`);
  });

  it('Given a description with no matching pattern, When inferCategory runs, Then it defaults to "utility"', () => {
    assert.equal(inferCategory('something random'), 'utility');
  });

  it('Given an empty string, When inferCategory runs, Then it defaults to "utility"', () => {
    assert.equal(inferCategory(''), 'utility');
  });

  it('Given null or undefined, When inferCategory runs, Then it does not throw and returns "utility"', () => {
    assert.equal(inferCategory(null), 'utility');
    assert.equal(inferCategory(undefined), 'utility');
  });

  it('Given a very long description, When inferCategory runs, Then it returns the first matching category', () => {
    const longText = 'lorem ipsum '.repeat(500) + ' debug something';
    assert.equal(inferCategory(longText), 'debugging');
  });
});
