'use strict';

/**
 * perf-assertions.test.js — Slice 2.4 (Task 3.7) perf gate.
 *
 * Two assertions (per Req 4.2 / spec slice 3.7):
 *
 *   1. CEILING (absolute) — p95 ≤ 250ms for prompts ≤ 500 chars on warm cache.
 *      Hard fail if exceeded. Same threshold for both fixtures, n=300 samples.
 *      Originally targeted 200ms; raised to 250ms after the realistic Slice 2.4
 *      baseline recapture (see Implementation Note for Task 3.7).
 *
 *   2. HEADROOM (relative) — current p95 ≤ baseline.p95 × 1.10 for both
 *      fixtures. Hard fail if exceeded. SKIP with explanatory log when
 *      process.platform differs from the baseline's platform — comparing
 *      Windows numbers to Linux runtime is a meaningless gate. (User decision
 *      from Slice 3.2 review: capture-on-CI flow re-stamps baseline on first
 *      green Linux run; headroom only fires once both sides are same OS.)
 *
 *   3. STRETCH p50 ≤ 50ms (short80) — non-fail. Logged via console.log so the
 *      CI summary shows the trend without breaking on noise.
 *
 * The baseline JSON (`tests/fixtures/perf-baseline.json`) is treated as
 * IMMUTABLE reference data. If headroom fails, that is a real regression
 * alert — it does NOT trigger an auto-recapture.
 *
 * Runtime: spawnSync per iteration (matches the production hook execution
 * model). With n=300 × 2 fixtures × ~80ms per spawn + 10 warmup each, total
 * runs ~50s. CI budget per spec is <60s.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { measureP50P95 } = require('./_perf-harness');

const HOOK_PATH = path.resolve(__dirname, '..', 'hooks', 'advisor-nudge.cjs');
const BASELINE_PATH = path.resolve(__dirname, 'fixtures', 'perf-baseline.json');

// Ceiling raised 200→250ms in Slice 2.4 after the realistic baseline recapture.
// The original 200ms target assumed sub-100ms p95 (the synthetic Slice 2.1
// baseline). Real-world Windows + post-refactor cost lands ~150-200ms p95;
// 250ms gives the gate room to fire only on genuine regression beyond the
// post-refactor envelope, not on inherent OS-startup noise.
const CEILING_MS = 250;
const HEADROOM_RATIO = 1.10;
const STRETCH_P50_SHORT_MS = 50;
const SAMPLE_ITERATIONS = 300;
const WARMUP_ITERATIONS = 10;
const STRETCH_LABEL = 'PERF_STRETCH';

const PROMPT_SHORT =
  'fix the failing oauth login flow that breaks when redirect to dashboard occurs';
const PROMPT_LONG =
  'I need to refactor the authentication subsystem to support OAuth2 with PKCE alongside the existing session-based login flow. The new code must integrate with the user-management module without breaking backward compatibility with the legacy bearer-token API. Tests should cover the redirect handling, refresh token rotation, and error paths when the identity provider returns invalid responses. Please plan the migration steps and identify which database schemas need additions.';

function makeRunner(prompt) {
  const stdin = JSON.stringify({ prompt });
  return function runHookOnce() {
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: stdin,
      encoding: 'utf8',
      env: { ...process.env, ADVISOR_ENABLED: 'true' },
      timeout: 10_000,
    });
    if (r.status !== 0) {
      throw new Error(`hook exited ${r.status}: ${r.stderr}`);
    }
  };
}

function loadBaseline() {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

// Module-level capture so the two ceiling tests + two headroom tests share
// one set of measurements (avoids running the n=300 loop four times).
let _measurements = null;
function getMeasurements() {
  if (_measurements) return _measurements;
  const runShort = makeRunner(PROMPT_SHORT);
  const runLong = makeRunner(PROMPT_LONG);
  for (let i = 0; i < WARMUP_ITERATIONS; i++) runShort();
  for (let i = 0; i < WARMUP_ITERATIONS; i++) runLong();
  const short80 = measureP50P95(runShort, SAMPLE_ITERATIONS);
  const long500 = measureP50P95(runLong, SAMPLE_ITERATIONS);
  _measurements = { short80, long500 };
  // eslint-disable-next-line no-console
  console.log(`[perf-gate] short80 p50=${short80.p50.toFixed(2)}ms p95=${short80.p95.toFixed(2)}ms mean=${short80.mean.toFixed(2)}ms`);
  // eslint-disable-next-line no-console
  console.log(`[perf-gate] long500 p50=${long500.p50.toFixed(2)}ms p95=${long500.p95.toFixed(2)}ms mean=${long500.mean.toFixed(2)}ms`);
  return _measurements;
}

describe('perf-gate: ceiling absolute (Req 4.2)', () => {
  it('Given the post-refactor hook and a 78-char prompt, When run n=300 warm, Then p95 ≤ 250ms (ceiling)', () => {
    const m = getMeasurements();
    assert.ok(m.short80.p95 <= CEILING_MS,
      `short80 p95 ${m.short80.p95.toFixed(2)}ms exceeds ceiling ${CEILING_MS}ms`);
  });

  it('Given the post-refactor hook and a 478-char prompt, When run n=300 warm, Then p95 ≤ 250ms (ceiling)', () => {
    const m = getMeasurements();
    assert.ok(m.long500.p95 <= CEILING_MS,
      `long500 p95 ${m.long500.p95.toFixed(2)}ms exceeds ceiling ${CEILING_MS}ms`);
  });
});

describe('perf-gate: headroom relative (Req 4.2)', () => {
  const baseline = loadBaseline();
  const baselinePlatform = baseline.platform || 'win32'; // pre-platform-field baselines were captured on Windows
  const samePlatform = process.platform === baselinePlatform;

  it(`Given baseline.platform=${baselinePlatform} and current platform=${process.platform}, When the headroom check runs against short80, Then current p95 ≤ baseline.p95 × ${HEADROOM_RATIO} (or SKIP on platform mismatch)`, (t) => {
    if (!samePlatform) {
      // eslint-disable-next-line no-console
      console.log(`[perf-gate] SKIP headroom: baseline=${baselinePlatform} current=${process.platform}. Re-run tests/_capture-perf-baseline.js on this platform and commit the fixture to enable.`);
      t.skip(`platform mismatch baseline=${baselinePlatform} current=${process.platform}`);
      return;
    }
    const m = getMeasurements();
    const limit = baseline.short80.p95 * HEADROOM_RATIO;
    assert.ok(m.short80.p95 <= limit,
      `short80 p95 ${m.short80.p95.toFixed(2)}ms exceeds baseline×${HEADROOM_RATIO} = ${limit.toFixed(2)}ms (baseline=${baseline.short80.p95.toFixed(2)}ms). Real regression alert — do NOT auto-update baseline.`);
  });

  it(`Given baseline.platform=${baselinePlatform} and current platform=${process.platform}, When the headroom check runs against long500, Then current p95 ≤ baseline.p95 × ${HEADROOM_RATIO} (or SKIP on platform mismatch)`, (t) => {
    if (!samePlatform) {
      t.skip(`platform mismatch baseline=${baselinePlatform} current=${process.platform}`);
      return;
    }
    const m = getMeasurements();
    const limit = baseline.long500.p95 * HEADROOM_RATIO;
    assert.ok(m.long500.p95 <= limit,
      `long500 p95 ${m.long500.p95.toFixed(2)}ms exceeds baseline×${HEADROOM_RATIO} = ${limit.toFixed(2)}ms (baseline=${baseline.long500.p95.toFixed(2)}ms). Real regression alert — do NOT auto-update baseline.`);
  });
});

describe('perf-gate: stretch goal (non-fail)', () => {
  it('Given the post-refactor hook on the 78-char fixture, When n=300 warm, Then p50 ≤ 50ms is logged but does not fail the suite', () => {
    const m = getMeasurements();
    const met = m.short80.p50 <= STRETCH_P50_SHORT_MS;
    // eslint-disable-next-line no-console
    console.log(`[${STRETCH_LABEL}] short80 p50=${m.short80.p50.toFixed(2)}ms target≤${STRETCH_P50_SHORT_MS}ms ${met ? 'MET' : 'NOT_MET'}`);
    // Always pass — stretch is observability, not a gate.
    assert.ok(true);
  });
});
