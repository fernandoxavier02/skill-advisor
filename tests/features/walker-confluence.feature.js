'use strict';

/**
 * walker-confluence.feature.js — BDD tier (Slice 5.5 / Task 6.5).
 *
 * Property P8 (confluence): for any input, the walker produces the same
 * output across runs. This is the BDD-tier wrapper for the determinism
 * guarantee already covered by tests/walk.test.js — placing it here
 * satisfies the spec language "BDD tier files exist" and ensures the
 * features/ directory is now part of the default `npm test` glob.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { walkDir } = require('../../lib/walk');

describe('Feature: walker confluence (Property P8)', () => {
  it('Given a fixture directory and identical opts, When walkDir is invoked twice, Then both runs return deeply equal results', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'walker-confluence-feature-'));
    fs.mkdirSync(path.join(root, 'a', 'b'), { recursive: true });
    fs.writeFileSync(path.join(root, 'one.js'), 'x');
    fs.writeFileSync(path.join(root, 'a', 'two.js'), 'x');
    fs.writeFileSync(path.join(root, 'a', 'b', 'three.js'), 'x');
    const r1 = walkDir(root);
    const r2 = walkDir(root);
    assert.deepEqual(r1, r2);
    assert.equal(r1.length, 3);
  });
});
