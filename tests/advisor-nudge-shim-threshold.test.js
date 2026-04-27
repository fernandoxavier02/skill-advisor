'use strict';

/**
 * advisor-nudge-shim-threshold.test.js — Slice 2.3 polish.
 *
 * The shim's `resolvePromptLengthThreshold` reads ADVISOR_PROMPT_LENGTH and
 * cascades to default 12. We test it via subprocess spawn (rather than
 * exporting the function) to avoid expanding the shim's public surface.
 *
 * Probe technique: send a prompt of exactly 11 chars. With threshold default
 * (12) the gate fires and stdout stays empty. With ADVISOR_PROMPT_LENGTH=5
 * the gate is more permissive and the hook proceeds (may or may not emit a
 * nudge depending on score, but at least we observe a different exit path —
 * we just assert exit code 0 in both branches; actual output is left to
 * advisor-nudge-stdin tests).
 *
 * What we assert here is that garbage env values DO NOT crash the hook —
 * the cascade fail-soft contract.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK_PATH = path.resolve(__dirname, '..', 'hooks', 'advisor-nudge.cjs');

function runHookEnv(envOverrides) {
  return spawnSync(process.execPath, [HOOK_PATH], {
    input: JSON.stringify({ prompt: 'short word' }), // 10 chars
    encoding: 'utf8',
    env: { ...process.env, ADVISOR_ENABLED: 'true', ...envOverrides },
    timeout: 5000,
  });
}

describe('shim ADVISOR_PROMPT_LENGTH parsing — cascade fail-soft', () => {
  it('Given ADVISOR_PROMPT_LENGTH unset, When the hook runs, Then it exits 0 (default 12 applied silently)', () => {
    const r = runHookEnv({});
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  });

  it('Given ADVISOR_PROMPT_LENGTH=abc (garbage), When the hook runs, Then it exits 0 (cascade falls back to default, no crash)', () => {
    const r = runHookEnv({ ADVISOR_PROMPT_LENGTH: 'abc' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  });

  it('Given ADVISOR_PROMPT_LENGTH=-5 (negative), When the hook runs, Then it exits 0 (cascade rejects negative, no crash)', () => {
    const r = runHookEnv({ ADVISOR_PROMPT_LENGTH: '-5' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  });

  it('Given ADVISOR_PROMPT_LENGTH=0 (kill-switch), When the hook runs, Then it exits 0', () => {
    const r = runHookEnv({ ADVISOR_PROMPT_LENGTH: '0' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  });

  it('Given ADVISOR_PROMPT_LENGTH=NaN, When the hook runs, Then it exits 0 (cascade rejects NaN)', () => {
    const r = runHookEnv({ ADVISOR_PROMPT_LENGTH: 'NaN' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  });

  it('Given ADVISOR_PROMPT_LENGTH=7 (valid int), When the hook runs, Then it exits 0', () => {
    const r = runHookEnv({ ADVISOR_PROMPT_LENGTH: '7' });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
  });
});
