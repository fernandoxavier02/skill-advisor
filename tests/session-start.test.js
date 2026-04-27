'use strict';

/**
 * session-start.test.js — Slice 5.1 (Task 6.1).
 *
 * Tests the SessionStart hook (hooks/session-start.cjs) by spawning it with
 * controlled CLAUDE_PLUGIN_ROOT and stdin variations. Per spec Req 8.1, all
 * scenarios must exit 0; spurious stdout is forbidden when conditions for
 * a nudge are not met.
 *
 * Coverage matrix (4 scenarios, all exit 0):
 *   1. setup-state module missing → silent exit
 *   2. malformed JSON on stdin    → silent exit (stdin is not parsed; this
 *                                    proves the hook ignores stdin entirely)
 *   3. empty stdin                → silent exit
 *   4. happy path (state present, completed) → silent exit, no stdout
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const HOOK_PATH = path.resolve(__dirname, '..', 'hooks', 'session-start.cjs');

function spawnHook({ pluginRoot, stdin = '' } = {}) {
  return spawnSync(process.execPath, [HOOK_PATH], {
    input: stdin,
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_PLUGIN_ROOT: pluginRoot || path.resolve(__dirname, '..'),
    },
    timeout: 5000,
  });
}

function makeFakePluginRoot({ withSetupState = true, completedSteps = ['index_built'], advisorVersion = '0.5.0', pluginVersion = '0.5.0' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'session-start-test-'));
  fs.mkdirSync(path.join(root, 'lib'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fake-advisor', version: pluginVersion })
  );
  if (withSetupState) {
    // Stub setup-state.js with the three exports the hook reads.
    const stub = `
      'use strict';
      const fs = require('fs');
      const path = require('path');
      const STATE_PATH = path.join(__dirname, '..', '_state.json');
      function readSetupState() {
        try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); }
        catch { return { advisor_version: ${JSON.stringify(advisorVersion)}, completed_steps: ${JSON.stringify(completedSteps)} }; }
      }
      function isFirstRun() { return false; }
      function needsFullRerun(state, current) { return state.advisor_version !== current; }
      module.exports = { readSetupState, isFirstRun, needsFullRerun };
    `;
    fs.writeFileSync(path.join(root, 'lib', 'setup-state.js'), stub);
  }
  return root;
}

describe('session-start hook (Req 8.1)', () => {
  it('Given setup-state module missing, When the hook runs, Then exit code is 0 and stdout is empty (silent fail-soft)', () => {
    const root = makeFakePluginRoot({ withSetupState: false });
    const r = spawnHook({ pluginRoot: root });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout, '', `unexpected stdout: ${r.stdout}`);
  });

  it('Given malformed JSON on stdin, When the hook runs, Then exit code is 0 and stdout is empty (the hook ignores stdin entirely)', () => {
    const root = makeFakePluginRoot();
    const r = spawnHook({ pluginRoot: root, stdin: '{not-json' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout, '', `unexpected stdout: ${r.stdout}`);
  });

  it('Given empty stdin and a fully-setup state, When the hook runs, Then exit code is 0 and stdout is empty', () => {
    const root = makeFakePluginRoot({ completedSteps: ['index_built', 'embeddings_built'] });
    const r = spawnHook({ pluginRoot: root, stdin: '' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.stdout, '');
  });

  it('Given happy path (state present, completed_steps non-empty, version match), When the hook runs, Then exit code is 0 and stdout is empty', () => {
    const root = makeFakePluginRoot({
      completedSteps: ['index_built', 'embeddings_built', 'plugins_curated'],
      advisorVersion: '0.5.0',
      pluginVersion: '0.5.0',
    });
    const r = spawnHook({ pluginRoot: root });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  });

  it('Given an upgrade scenario (state.advisor_version differs from package.json), When the hook runs, Then exit code is 0 and stdout contains the upgrade nudge', () => {
    const root = makeFakePluginRoot({ advisorVersion: '0.4.0', pluginVersion: '0.5.0' });
    const r = spawnHook({ pluginRoot: root });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /upgrade|0\.4\.0|0\.5\.0/i);
  });

  it('Given an aborted setup (state with empty completed_steps), When the hook runs, Then exit code is 0 and stdout contains the resume nudge', () => {
    const root = makeFakePluginRoot({ completedSteps: [] });
    const r = spawnHook({ pluginRoot: root });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /never completed|finish/i);
  });

  it('Given package.json missing (currentVersion fallback path), When the hook runs against a state with advisor_version="0.5.0", Then exit code is 0 and a comparison with "unknown" does not crash (Slice 6.6 polish)', () => {
    const root = makeFakePluginRoot({ advisorVersion: '0.5.0' });
    fs.unlinkSync(path.join(root, 'package.json'));
    const r = spawnHook({ pluginRoot: root });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    // currentVersion falls back to 'unknown' → needsFullRerun returns true
    // (state.advisor_version "0.5.0" !== "unknown") so an upgrade nudge fires.
    // The contract is "no crash" — exit 0 is the primary assertion.
  });

  it('Given package.json malformed JSON, When the hook runs, Then exit code is 0 (catch-all swallows the parse error)', () => {
    const root = makeFakePluginRoot();
    fs.writeFileSync(path.join(root, 'package.json'), '{ this is not json');
    const r = spawnHook({ pluginRoot: root });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  });
});
