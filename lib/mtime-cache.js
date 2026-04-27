'use strict';

/**
 * mtime-cache.js — Module-scoped mtime-keyed loader memoization.
 *
 * Slice 2.3 (Task 3.5). Wraps a synchronous loader so it runs at most once per
 * (filePath, mtime) tuple within the lifetime of this module. Used by the
 * advisor-nudge shim to avoid re-parsing embeddings.json / adjacency.json
 * across multiple `runNudge` calls in the same process.
 *
 * For the production hook (ephemeral spawn-per-prompt) the cache is irrelevant
 * — each invocation is a fresh process. The cache pays off when the core is
 * driven from a long-lived consumer (tests, the /advisor command flow, future
 * batch tooling) that calls `runNudge` repeatedly.
 *
 * Architectural invariant (DI-2): this module imports ONLY from `node:fs`. No
 * builder imports. The dependency-edge guard enforces this.
 *
 * Cache shape:
 *   Map<absolutePath, { mtimeMs: number, value: unknown }>
 *
 * Failure modes:
 *   - fs.statSync throws (file missing / permission) → no caching, loader runs
 *     each call (matches the existing fail-soft contract of the hook)
 *   - loader throws → error propagates, NO entry written (no poisoned cache)
 *
 * Test reset hook:
 *   `__resetCacheForTests()` clears the cache. Gated by `SKILL_ADVISOR_TEST=1`
 *   read once at module load — production code cannot accidentally clear.
 */

const fs = require('node:fs');
const path = require('node:path');

const _cache = new Map();
const _testEnabled = process.env.SKILL_ADVISOR_TEST === '1';

function _statMtime(filePath) {
  try { return fs.statSync(filePath).mtimeMs; } catch { return null; }
}

/**
 * Wrap a synchronous loader so its result is memoized by the mtime of filePath.
 * @param {string} filePath - absolute path whose mtime keys the cache
 * @param {() => unknown} loader - synchronous function producing the value
 * @returns {() => unknown} memoized loader
 */
function withMtimeCache(filePath, loader) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new TypeError('withMtimeCache: filePath must be a non-empty string');
  }
  if (typeof loader !== 'function') {
    throw new TypeError('withMtimeCache: loader must be a function');
  }
  const key = path.resolve(filePath);
  return function memoizedLoader() {
    const mtimeMs = _statMtime(key);
    if (mtimeMs === null) {
      // File missing — bypass cache (do not invent a sentinel mtime that
      // could collide with a future real mtime).
      return loader();
    }
    const hit = _cache.get(key);
    if (hit && hit.mtimeMs === mtimeMs) return hit.value;
    const value = loader();
    // Loader succeeded — only NOW write the cache entry.
    _cache.set(key, { mtimeMs, value });
    return value;
  };
}

function __resetCacheForTests() {
  if (!_testEnabled) {
    throw new Error('__resetCacheForTests: SKILL_ADVISOR_TEST=1 not set; refusing to clear in production');
  }
  _cache.clear();
}

module.exports = { withMtimeCache, __resetCacheForTests };
