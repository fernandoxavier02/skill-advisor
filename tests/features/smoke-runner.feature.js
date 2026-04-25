'use strict';

/**
 * BDD scenarios for SmokeTest — Given/When/Then.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runSmoke } = require('../../lib/smoke-runner.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-feature-'));

function makeValidPluginRoot(root) {
  fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
  const realRoot = path.resolve(__dirname, '..', '..');
  fs.copyFileSync(path.join(realRoot, 'lib', 'constants.js'), path.join(root, 'lib', 'constants.js'));
  fs.copyFileSync(path.join(realRoot, 'lib', 'user-config.js'), path.join(root, 'lib', 'user-config.js'));
  fs.writeFileSync(
    path.join(root, 'lib', 'advisor-index-full.json'),
    JSON.stringify([{ id: 'x:auth-fix', name: 'auth-fix', description: 'fix auth errors' }])
  );
  fs.writeFileSync(
    path.join(root, 'lib', 'advisor-index-lite.json'),
    JSON.stringify([{ id: 'x:auth-fix', name: 'auth-fix', description: 'fix auth errors' }])
  );
}

const HAPPY_ROOT = path.join(TMP, 'happy');
const MISSING_FULL_ROOT = path.join(TMP, 'missing-full');

before(() => {
  makeValidPluginRoot(HAPPY_ROOT);

  // Missing full_index but has lite — should fail
  fs.mkdirSync(path.join(MISSING_FULL_ROOT, 'lib'), { recursive: true });
  const realRoot = path.resolve(__dirname, '..', '..');
  fs.copyFileSync(
    path.join(realRoot, 'lib', 'constants.js'),
    path.join(MISSING_FULL_ROOT, 'lib', 'constants.js')
  );
  fs.copyFileSync(
    path.join(realRoot, 'lib', 'user-config.js'),
    path.join(MISSING_FULL_ROOT, 'lib', 'user-config.js')
  );
  fs.writeFileSync(
    path.join(MISSING_FULL_ROOT, 'lib', 'advisor-index-lite.json'),
    JSON.stringify([])
  );
});

after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});

describe('Feature: Full /advisor smoke test', () => {
  describe('Scenario: Successful end-to-end validation', () => {
    it('Given a valid plugin root with index + lite + constants, When runSmoke executes, Then passed=true and reason=null', () => {
      const r = runSmoke({ pluginRoot: HAPPY_ROOT });
      assert.equal(r.passed, true);
      assert.equal(r.reason, null);
      assert.ok(r.duration_ms >= 0);
    });
  });

  describe('Scenario: Smoke fails due to missing full index', () => {
    it('Given the full index file is missing, When runSmoke executes, Then passed=false with reason starting with "full_index"', () => {
      const r = runSmoke({ pluginRoot: MISSING_FULL_ROOT });
      assert.equal(r.passed, false);
      assert.ok(r.reason && r.reason.startsWith('full_index:'));
    });
  });

  describe('Scenario: Embeddings missing is non-fatal (optional)', () => {
    it('Given a happy plugin root with no embeddings file, When runSmoke executes, Then passed=true (embeddings check is optional)', () => {
      const r = runSmoke({ pluginRoot: HAPPY_ROOT });
      const embeddingsCheck = r.checks.find((c) => c.name === 'embeddings');
      assert.ok(embeddingsCheck);
      assert.equal(embeddingsCheck.optional, true);
      // embeddings missing but overall still passes
      assert.equal(r.passed, true);
    });
  });

  describe('Scenario: Duration is measured', () => {
    it('Given any smoke run, When runSmoke returns, Then duration_ms is a non-negative integer', () => {
      const r = runSmoke({ pluginRoot: HAPPY_ROOT });
      assert.ok(Number.isInteger(r.duration_ms));
      assert.ok(r.duration_ms >= 0);
    });
  });
});
