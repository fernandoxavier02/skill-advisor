'use strict';

// Performance measurement utility for hot-path benchmarking.
//
// File-name contract: leading `_` keeps this file out of the `node --test
// tests/*.test.js` glob (see package.json), so it is loaded as a plain
// CommonJS helper rather than executed as a test suite.
//
// Validates Requirement 4.2 (Hot-Path Hook Performance and Testability) by
// providing the measurement primitive that `tests/advisor-nudge-core.test.js`
// will use to assert the Ceiling+Headroom budget defined in design.md
// (P6 / CI-1). No external dependencies — only `process.hrtime.bigint`,
// per the design constraint that perf measurement be self-contained.

/**
 * Measure p50, p95 and mean wall-clock duration of a synchronous function
 * across `n` iterations using `process.hrtime.bigint` (nanosecond precision).
 *
 * The function is invoked `n` times back-to-back; per-call duration is
 * captured in nanoseconds (BigInt) and converted to milliseconds (Number)
 * only at the aggregation step to avoid precision loss inside the hot loop.
 *
 * @param {() => unknown} fn  Synchronous function to benchmark. Return value
 *                            is ignored; throw to abort the measurement.
 * @param {number} [n=100]    Iteration count. Must be a positive integer.
 * @returns {{ p50: number, p95: number, mean: number }}
 *          All three values in milliseconds. `p50` and `p95` are nearest-rank
 *          percentiles over the sorted sample; `mean` is the arithmetic
 *          average of the same sample.
 * @throws {TypeError}  If `fn` is not a function.
 * @throws {RangeError} If `n` is not a positive integer.
 */
function measureP50P95(fn, n = 100) {
  if (typeof fn !== 'function') {
    throw new TypeError('measureP50P95: fn must be a function');
  }
  if (!Number.isInteger(n) || n <= 0) {
    throw new RangeError('measureP50P95: n must be a positive integer');
  }

  // Pre-allocate to avoid array growth cost inside the timing loop.
  const samplesNs = new Array(n);

  for (let i = 0; i < n; i++) {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    samplesNs[i] = end - start;
  }

  // Convert to milliseconds (Number) once, after sampling is done.
  const samplesMs = samplesNs.map((ns) => Number(ns) / 1e6);

  // Sort ascending for percentile extraction; mean uses unsorted sum but
  // sorting here is O(n log n) on n=100 — negligible.
  const sorted = samplesMs.slice().sort((a, b) => a - b);

  const p50 = percentile(sorted, 0.50);
  const p95 = percentile(sorted, 0.95);

  let sum = 0;
  for (let i = 0; i < samplesMs.length; i++) {
    sum += samplesMs[i];
  }
  const mean = sum / samplesMs.length;

  return { p50, p95, mean };
}

/**
 * Nearest-rank percentile over an already-sorted ascending array.
 * Chosen over linear interpolation because the consumer asserts ceilings
 * (`p95 <= 200ms`) where nearest-rank is the conservative reading.
 *
 * @param {number[]} sorted  Ascending-sorted samples (length >= 1).
 * @param {number}   q       Quantile in [0, 1].
 * @returns {number}
 */
function percentile(sorted, q) {
  // ceil(q * n) - 1, clamped to [0, n-1]. Matches the standard
  // nearest-rank definition used by most perf tooling.
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(q * sorted.length) - 1)
  );
  return sorted[idx];
}

module.exports = { measureP50P95 };
