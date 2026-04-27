'use strict';

/**
 * _capture-perf-baseline.js — Slice 3.1 baseline capture helper.
 *
 * File-name contract: leading `_` keeps this file out of the
 * `node --test tests/*.test.js` glob (see package.json), same convention as
 * `tests/_perf-harness.js`. This is a one-shot capture script, not a test.
 *
 * Purpose
 * -------
 * Captures p50/p95/mean wall-clock duration of the LEGACY (pre-Phase-2)
 * `hooks/advisor-nudge.cjs` end-to-end via `child_process.spawnSync`. Two
 * representative prompt fixtures: ~80 chars and ~500 chars. n=100 iterations
 * after a 10-iteration warm-up (FS cache + Node startup amortization).
 *
 * Why spawnSync (not in-process require)
 * --------------------------------------
 * Production users pay the full Node-startup + module-load + FS-read cost on
 * every UserPromptSubmit event. Measuring the hook in-process would understate
 * the real budget that slice 3.7 will lock against.
 *
 * Output
 * ------
 * Writes `tests/fixtures/perf-baseline.json` with shape:
 *   {
 *     short80:    { p50, p95, mean },
 *     long500:    { p50, p95, mean },
 *     capturedAt: ISO-8601,
 *     advisorVersion: SemVer (read from package.json at capture time),
 *     promptShortLength, promptLongLength,
 *     note: free-form provenance.
 *   }
 *
 * Usage
 * -----
 *   node tests/_capture-perf-baseline.js
 *
 * The fixture is committed and treated as immutable reference data. Slice 3.7
 * will compare current p95 against this baseline (headroom ≤ 1.10×). If the
 * legacy hook is materially changed before slice 3.3 lands, re-run this
 * script and amend the commit — DO NOT auto-update from a failing perf gate.
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { measureP50P95 } = require('./_perf-harness');

const HOOK_PATH = path.resolve(__dirname, '..', 'hooks', 'advisor-nudge.cjs');
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures', 'perf-baseline.json');
const PKG_PATH = path.resolve(__dirname, '..', 'package.json');

// Representative prompts. Lengths are asserted by perf-baseline.test.js.
// Short: ~80 chars — typical "fix the X bug" prompt.
const PROMPT_SHORT =
  'fix the failing oauth login flow that breaks when redirect to dashboard occurs';
// Long: ~500 chars — multi-paragraph engineering request.
const PROMPT_LONG =
  'I need to refactor the authentication subsystem to support OAuth2 with PKCE alongside the existing session-based login flow. The new code must integrate with the user-management module without breaking backward compatibility with the legacy bearer-token API. Tests should cover the redirect handling, refresh token rotation, and error paths when the identity provider returns invalid responses. Please plan the migration steps and identify which database schemas need additions.';

const WARMUP_ITERATIONS = 10;
const SAMPLE_ITERATIONS = 100;

function makeRunner(prompt) {
  const stdin = JSON.stringify({ prompt });
  return function runHookOnce() {
    const result = spawnSync(process.execPath, [HOOK_PATH], {
      input: stdin,
      encoding: 'utf8',
      env: { ...process.env, ADVISOR_ENABLED: 'true' },
      timeout: 10_000,
    });
    if (result.status !== 0) {
      throw new Error(
        `advisor-nudge hook exited with status ${result.status}: ${result.stderr}`
      );
    }
  };
}

function captureBaseline() {
  const runShort = makeRunner(PROMPT_SHORT);
  const runLong = makeRunner(PROMPT_LONG);

  // Warm-up: stabilize FS cache, OS process pool, V8 startup heuristics.
  // Discarded — only sampled iterations enter the percentile computation.
  for (let i = 0; i < WARMUP_ITERATIONS; i++) runShort();

  const short80 = measureP50P95(runShort, SAMPLE_ITERATIONS);
  const long500 = measureP50P95(runLong, SAMPLE_ITERATIONS);

  const advisorVersion = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8')).version;

  const baseline = {
    short80,
    long500,
    capturedAt: new Date().toISOString(),
    advisorVersion,
    promptShortLength: PROMPT_SHORT.length,
    promptLongLength: PROMPT_LONG.length,
    note:
      'Pre-Phase-2 baseline. Hot-path advisor-nudge.cjs not yet refactored. ' +
      'Captured with WARMUP_ITERATIONS=' +
      WARMUP_ITERATIONS +
      ', SAMPLE_ITERATIONS=' +
      SAMPLE_ITERATIONS +
      '. See spec slice 3.1 (Requirement 4.2). Slice 3.7 locks Headroom ≤ 1.10x against this baseline.',
  };

  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
  fs.writeFileSync(FIXTURE_PATH, JSON.stringify(baseline, null, 2) + '\n');

  // Human-readable trace for the operator running the capture.
  // eslint-disable-next-line no-console
  console.log('Baseline written to', FIXTURE_PATH);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(baseline, null, 2));
  return baseline;
}

if (require.main === module) {
  captureBaseline();
}

module.exports = {
  captureBaseline,
  PROMPT_SHORT,
  PROMPT_LONG,
  FIXTURE_PATH,
  WARMUP_ITERATIONS,
  SAMPLE_ITERATIONS,
};
