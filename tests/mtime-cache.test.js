'use strict';

/**
 * mtime-cache.test.js — Slice 2.3 (Task 3.5) RED tests for `lib/mtime-cache.js`.
 *
 * Contract:
 *   withMtimeCache(filePath, loader) returns a memoized loader function:
 *     - First call (cold): invokes loader(), records mtime via fs.statSync, returns result
 *     - Subsequent calls with unchanged mtime: returns cached result, loader NOT invoked
 *     - mtime changed since last call: invokes loader() again, updates cache
 *     - File missing on stat: invokes loader() each time (no caching), no throw
 *     - loader() throws: error propagates, cache stays empty for that path
 *
 * Cache scope: module-scoped (lives inside lib/mtime-cache.js — NOT global, NOT process).
 * Reset hook: __resetCacheForTests() exported BUT only callable when SKILL_ADVISOR_TEST=1.
 */

const { describe, it, mock, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Test env flag MUST be set BEFORE requiring the module — the reset hook gate
// reads it once at module load. Tests cannot bypass this safety.
process.env.SKILL_ADVISOR_TEST = '1';
const { withMtimeCache, __resetCacheForTests } = require('../lib/mtime-cache');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mtime-cache-test-'));

function tmpFile(name, content) {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, content);
  return p;
}

beforeEach(() => __resetCacheForTests());

describe('mtime-cache: cold + warm', () => {
  it('Given a fresh withMtimeCache wrapper and a file, When invoked once, Then the underlying loader runs exactly once and the result is returned', () => {
    const file = tmpFile('cold.json', '{"v":1}');
    const loader = mock.fn(() => ({ data: 'first' }));
    const memoized = withMtimeCache(file, loader);
    const r = memoized();
    assert.equal(loader.mock.callCount(), 1);
    assert.deepEqual(r, { data: 'first' });
  });

  it('Given two consecutive calls with the file mtime unchanged, When the second call resolves, Then the loader was invoked exactly once across both calls', () => {
    const file = tmpFile('warm.json', '{"v":1}');
    const loader = mock.fn(() => ({ data: 'cached' }));
    const memoized = withMtimeCache(file, loader);
    const r1 = memoized();
    const r2 = memoized();
    assert.equal(loader.mock.callCount(), 1, 'loader must run once');
    assert.equal(r1, r2, 'cached reference returned');
  });

  it('Given 100 consecutive calls with file unchanged, When all complete, Then loader invoked exactly once', () => {
    const file = tmpFile('hundred.json', '{"v":1}');
    const loader = mock.fn(() => ({ data: 'x' }));
    const memoized = withMtimeCache(file, loader);
    for (let i = 0; i < 100; i++) memoized();
    assert.equal(loader.mock.callCount(), 1);
  });
});

describe('mtime-cache: invalidation', () => {
  it('Given a cached entry and the file mtime advances, When the wrapper is called again, Then the loader is invoked a second time and the new value is returned', () => {
    const file = tmpFile('mutate.json', '{"v":1}');
    let n = 0;
    const loader = mock.fn(() => ({ data: ++n }));
    const memoized = withMtimeCache(file, loader);
    const r1 = memoized();
    // Advance mtime by writing again with a forced future timestamp.
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(file, future, future);
    const r2 = memoized();
    assert.equal(loader.mock.callCount(), 2);
    assert.notDeepEqual(r1, r2);
  });
});

describe('mtime-cache: cached null/undefined (test-coverage 🟠)', () => {
  it('Given a loader that returns null, When called twice on the same file, Then loader runs exactly once and both calls return null', () => {
    const file = tmpFile('null.json', '{}');
    const loader = mock.fn(() => null);
    const memo = withMtimeCache(file, loader);
    assert.equal(memo(), null);
    assert.equal(memo(), null);
    assert.equal(loader.mock.callCount(), 1);
  });

  it('Given a loader that returns undefined, When called twice, Then loader runs once and both calls return undefined', () => {
    const file = tmpFile('undef.json', '{}');
    const loader = mock.fn(() => undefined);
    const memo = withMtimeCache(file, loader);
    assert.equal(memo(), undefined);
    assert.equal(memo(), undefined);
    assert.equal(loader.mock.callCount(), 1);
  });
});

describe('mtime-cache: delete-then-recreate cycle (test-coverage 🟠)', () => {
  it('Given a cached file, When deleted then recreated with new content, Then loader runs again on the post-recreation call (new value served, no stale)', () => {
    const file = tmpFile('cycle.json', '{"v":1}');
    let n = 0;
    const loader = mock.fn(() => ({ data: ++n }));
    const memo = withMtimeCache(file, loader);
    const r1 = memo();           // cold
    assert.equal(loader.mock.callCount(), 1);

    fs.unlinkSync(file);
    const r2 = memo();           // file missing → bypass cache, loader runs
    assert.equal(loader.mock.callCount(), 2);

    // Recreate with future mtime to guarantee mtime-cache invalidation.
    fs.writeFileSync(file, '{"v":2}');
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(file, future, future);
    const r3 = memo();           // post-recreation
    assert.equal(loader.mock.callCount(), 3);

    assert.notDeepEqual(r1, r3);
    assert.notDeepEqual(r2, r3);
  });
});

describe('mtime-cache: same-tick rewrite (cache hardening 🟠)', () => {
  it('Given two writes producing the same mtime but different sizes, When the wrapper is called twice, Then the second call detects the change via size and reinvokes', () => {
    const file = tmpFile('same-tick.json', '{"a":1}');
    let n = 0;
    const loader = mock.fn(() => ({ data: ++n }));
    const memo = withMtimeCache(file, loader);
    const r1 = memo();
    assert.equal(loader.mock.callCount(), 1);

    // Force an mtime collision by writing different content but stamping the
    // same mtime as the first write.
    const sig = fs.statSync(file);
    fs.writeFileSync(file, '{"a":1,"b":2,"c":3,"d":4}'); // larger
    fs.utimesSync(file, sig.atime, sig.mtime);
    const r2 = memo();
    assert.equal(loader.mock.callCount(), 2, 'size-based key must catch same-mtime rewrite');
    assert.notDeepEqual(r1, r2);
  });
});

describe('mtime-cache: failure modes', () => {
  it('Given a path that does not exist, When the wrapper is called twice, Then the loader is invoked twice (no caching when stat fails) and no throw', () => {
    const ghost = path.join(TMP, '__ghost__.json');
    const loader = mock.fn(() => null);
    const memoized = withMtimeCache(ghost, loader);
    assert.doesNotThrow(() => memoized());
    assert.doesNotThrow(() => memoized());
    assert.equal(loader.mock.callCount(), 2);
  });

  it('Given a loader that throws on first call, When the wrapper is called again, Then the loader runs again (no poisoned cache entry)', () => {
    const file = tmpFile('throwy.json', '{"v":1}');
    let calls = 0;
    const loader = mock.fn(() => {
      calls++;
      if (calls === 1) throw new Error('boom');
      return { ok: true };
    });
    const memoized = withMtimeCache(file, loader);
    assert.throws(() => memoized(), /boom/);
    const r2 = memoized();
    assert.deepEqual(r2, { ok: true });
    assert.equal(loader.mock.callCount(), 2);
  });
});

describe('mtime-cache: scope and reset hook', () => {
  it('Given two separate withMtimeCache wrappers around the same file, When each is called, Then they share the cache (keyed by absolute path, not by wrapper identity)', () => {
    const file = tmpFile('shared.json', '{"v":1}');
    const loader1 = mock.fn(() => ({ from: 1 }));
    const loader2 = mock.fn(() => ({ from: 2 }));
    const w1 = withMtimeCache(file, loader1);
    const w2 = withMtimeCache(file, loader2);
    const r1 = w1();
    const r2 = w2();
    // Second wrapper hits cache populated by first; loader2 NOT called.
    assert.equal(loader1.mock.callCount(), 1);
    assert.equal(loader2.mock.callCount(), 0);
    assert.deepEqual(r1, r2);
  });

  it('Given the test reset hook is invoked, When a previously cached file is accessed via a fresh wrapper, Then the loader runs again', () => {
    const file = tmpFile('reset.json', '{"v":1}');
    const loader = mock.fn(() => ({ ok: true }));
    const w = withMtimeCache(file, loader);
    w();
    assert.equal(loader.mock.callCount(), 1);
    __resetCacheForTests();
    w();
    assert.equal(loader.mock.callCount(), 2);
  });
});
