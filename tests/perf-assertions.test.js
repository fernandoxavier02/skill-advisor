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
// Slice 3.8 review: 1.10 produced ~1% margin on long500 (157→159ms) which
// would flake on noisy CI. 1.15 absorbs typical OS-startup jitter without
// hiding real regressions (>15% slowdown still fails the gate).
const HEADROOM_RATIO = 1.15;
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

// Snapshotted at module load and frozen so a concurrent recapture mid-suite
// cannot perturb the headroom check (Slice 3.8 reliability finding).
function loadBaselineSafe() {
  try {
    const raw = fs.readFileSync(BASELINE_PATH, 'utf8');
    return Object.freeze(JSON.parse(raw));
  } catch (err) {
    // Fail-soft: headroom tests will SKIP, ceiling tests still run.
    // eslint-disable-next-line no-console
    console.log(`[perf-gate] BASELINE_MISSING (${err.message}) — headroom checks will SKIP. Run \`node tests/_capture-perf-baseline.js\` to recapture.`);
    return null;
  }
}
const BASELINE = loadBaselineSafe();

// Module-level capture so the two ceiling tests + two headroom tests share
// one set of measurements (avoids running the n=300 loop four times).
// Note: if a developer filters tests via --test-name-pattern, only the
// surviving tests get the cached value — getMeasurements() is idempotent
// so the first surviving test pays the n=300 cost once.
let _measurements = null;
function getMeasurements() {
  if (_measurements) return _measurements;
  // Min-n guard: protects against accidental "speed up tests" PRs that lower
  // these constants and silently weaken the gate (smaller n → fatter p95 CI).
  if (SAMPLE_ITERATIONS < 100 || WARMUP_ITERATIONS < 5) {
    throw new Error(`perf gate weakened: SAMPLE_ITERATIONS≥100 (got ${SAMPLE_ITERATIONS}) and WARMUP_ITERATIONS≥5 (got ${WARMUP_ITERATIONS}) required`);
  }
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

// Gate: perf suite is opt-in via RUN_PERF=1 to keep `npm test` fast for TDD
// iteration. CI runs `npm run validate:perf` separately (sets RUN_PERF=1).
// All four perf describes share this skip flag.
const PERF_OFF = process.env.RUN_PERF !== '1';

describe('perf-gate: ceiling absolute (Req 4.2)', { skip: PERF_OFF }, () => {
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

describe('perf-gate: headroom relative (Req 4.2)', { skip: PERF_OFF }, () => {
  const baselinePlatform = BASELINE ? (BASELINE.platform || 'win32') : null;
  const samePlatform = BASELINE && process.platform === baselinePlatform;

  it(`Given baseline.platform=${baselinePlatform} and current platform=${process.platform}, When the headroom check runs against short80, Then current p95 ≤ baseline.p95 × ${HEADROOM_RATIO} (or SKIP)`, (t) => {
    if (!BASELINE) { t.skip('baseline missing — see [perf-gate] BASELINE_MISSING log above'); return; }
    if (!samePlatform) {
      // eslint-disable-next-line no-console
      console.log(`[perf-gate] SKIP headroom: baseline=${baselinePlatform} current=${process.platform}. Re-run tests/_capture-perf-baseline.js on this platform and commit the fixture to enable.`);
      t.skip(`platform mismatch baseline=${baselinePlatform} current=${process.platform}`);
      return;
    }
    const m = getMeasurements();
    const limit = BASELINE.short80.p95 * HEADROOM_RATIO;
    assert.ok(m.short80.p95 <= limit,
      `short80 p95 ${m.short80.p95.toFixed(2)}ms exceeds baseline×${HEADROOM_RATIO} = ${limit.toFixed(2)}ms (baseline=${BASELINE.short80.p95.toFixed(2)}ms). Real regression alert — do NOT auto-update baseline.`);
  });

  it(`Given baseline.platform=${baselinePlatform} and current platform=${process.platform}, When the headroom check runs against long500, Then current p95 ≤ baseline.p95 × ${HEADROOM_RATIO} (or SKIP)`, (t) => {
    if (!BASELINE) { t.skip('baseline missing — see [perf-gate] BASELINE_MISSING log above'); return; }
    if (!samePlatform) { t.skip(`platform mismatch baseline=${baselinePlatform} current=${process.platform}`); return; }
    const m = getMeasurements();
    const limit = BASELINE.long500.p95 * HEADROOM_RATIO;
    assert.ok(m.long500.p95 <= limit,
      `long500 p95 ${m.long500.p95.toFixed(2)}ms exceeds baseline×${HEADROOM_RATIO} = ${limit.toFixed(2)}ms (baseline=${BASELINE.long500.p95.toFixed(2)}ms). Real regression alert — do NOT auto-update baseline.`);
  });
});

// Stretch metric: opt-in via PERF_STRETCH=1. Kept off by default to avoid
// log bloat — no consumer reads this in CI. Devs curious about the p50 trend
// can flip the env locally.
describe('perf-gate: stretch goal (opt-in via PERF_STRETCH=1)', { skip: PERF_OFF || process.env.PERF_STRETCH !== '1' }, () => {
  it('Given the post-refactor hook on the 78-char fixture, When n=300 warm, Then p50 ≤ 50ms is logged but does not fail the suite', () => {
    const m = getMeasurements();
    const met = m.short80.p50 <= STRETCH_P50_SHORT_MS;
    // eslint-disable-next-line no-console
    console.log(`[${STRETCH_LABEL}] short80 p50=${m.short80.p50.toFixed(2)}ms target≤${STRETCH_P50_SHORT_MS}ms ${met ? 'MET' : 'NOT_MET'}`);
    assert.ok(true);
  });
});
