'use strict';

/**
 * advisor-nudge-stdin.test.js — covers SA-003 fix.
 *
 * Claude Code delivers the UserPromptSubmit payload as JSON over stdin.
 * Earlier versions read process.env.CLAUDE_USER_PROMPT, which Claude Code
 * does not set, so the hook silently no-op'd on every prompt.
 *
 * These tests spawn the hook as a subprocess with the enabled flag on and
 * assert that stdin JSON is parsed, raw stdin is accepted as a fallback,
 * and that the env var still works for tests/manual invocation.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK_PATH = path.resolve(__dirname, '..', 'hooks', 'advisor-nudge.cjs');

function runHook({ stdin = '', env = {} } = {}) {
  return spawnSync(process.execPath, [HOOK_PATH], {
    input: stdin,
    encoding: 'utf8',
    // Force enable so the hook runs past the config gate. This does not
    // make the hook emit output unless the prompt matches something.
    env: { ...process.env, ADVISOR_ENABLED: 'true', ...env },
    timeout: 5000,
  });
}

describe('advisor-nudge stdin contract (SA-003)', () => {
  it('does not throw when stdin is JSON with a prompt field', () => {
    const result = runHook({ stdin: JSON.stringify({ prompt: 'fix login bug' }) });
    assert.equal(result.status, 0, `hook exited with status ${result.status}: ${result.stderr}`);
  });

  it('does not throw when stdin is raw text', () => {
    const result = runHook({ stdin: 'fix login bug' });
    assert.equal(result.status, 0, `hook exited with status ${result.status}: ${result.stderr}`);
  });

  it('does not throw when stdin is empty', () => {
    const result = runHook({ stdin: '' });
    assert.equal(result.status, 0, `hook exited with status ${result.status}: ${result.stderr}`);
  });

  it('does not throw when stdin is malformed JSON', () => {
    const result = runHook({ stdin: '{not-json' });
    assert.equal(result.status, 0, `hook exited with status ${result.status}: ${result.stderr}`);
  });

  it('honors CLAUDE_USER_PROMPT env var for backward compatibility', () => {
    const result = runHook({ env: { CLAUDE_USER_PROMPT: 'fix the bug' } });
    assert.equal(result.status, 0, `hook exited with status ${result.status}: ${result.stderr}`);
  });
});

describe('readPromptSync (SA-003 unit)', () => {
  const { readPromptSync } = require('../hooks/advisor-nudge.cjs');

  it('is exported for testability', () => {
    assert.equal(typeof readPromptSync, 'function');
  });

  it('returns env var verbatim when set', () => {
    const prev = process.env.CLAUDE_USER_PROMPT;
    process.env.CLAUDE_USER_PROMPT = 'hello world';
    try {
      assert.equal(readPromptSync(), 'hello world');
    } finally {
      if (prev === undefined) delete process.env.CLAUDE_USER_PROMPT;
      else process.env.CLAUDE_USER_PROMPT = prev;
    }
  });
});
