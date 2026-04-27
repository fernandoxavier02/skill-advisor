'use strict';

/**
 * advisor-nudge-core.test.js — Slice 2.2 (Task 3.3) RED tests.
 *
 * Spec contract for `lib/advisor-nudge-core.js`:
 *   runNudge({
 *     prompt,                 // string (already read from stdin)
 *     indexLitePath,          // absolute path to lite index JSON
 *     embeddingsLoader,       // () => semantic-module-shape | null
 *     graphLoader,            // () => graph-data | null
 *     hookDataLoader,         // () => hook-data-bundle | null  (v2)
 *     discoveryStateLoader,   // () => seen-state-object        (v2)
 *     threshold,              // number — prompt-length early-exit gate
 *     env,                    // { ADVISOR_BRANCH?: string }
 *     now,                    // () => epoch-ms (injectable for determinism)
 *     contextMod,             // optional override for ./context (default: real module)
 *   }) => SuggestionResult { earlyExit, output: string[], scored, top }
 *
 * The core is pure logic — it MUST NOT touch process.env, Date.now, console,
 * or any FS path other than indexLitePath (read once via fs.readFileSync).
 * All other I/O is delegated to the injected loaders.
 *
 * BDD scenarios per Slice 2.2 design:
 *   1. Determinism — same opts + fixed `now` → deeply equal SuggestionResult
 *   2. Early exit — prompt shorter than `threshold` → loaders never invoked
 *   3. Isolation  — loaders returning null → graceful, no throw
 */

const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { runNudge } = require('../lib/advisor-nudge-core');

const SAMPLE_INDEX = path.resolve(__dirname, 'fixtures', 'sample-index-lite.json');

function baseOpts(overrides = {}) {
  return {
    prompt: 'investigate the login authentication bug now',
    indexLitePath: SAMPLE_INDEX,
    embeddingsLoader: () => null,
    graphLoader: () => null,
    hookDataLoader: () => null,
    discoveryStateLoader: () => ({}),
    threshold: 5,
    env: {},
    now: () => 1700000000000,
    ...overrides,
  };
}

describe('advisor-nudge-core: determinism (BDD 1)', () => {
  it('Given a runNudge call with the same opts including a fixed now timestamp, When invoked twice, Then both calls return deeply equal SuggestionResult', () => {
    const opts = baseOpts();
    const r1 = runNudge(opts);
    const r2 = runNudge(opts);
    assert.deepEqual(r1, r2);
  });

  it('Given identical opts but a fresh embeddingsLoader spy each call, When invoked twice, Then the loader is invoked exactly once per call (not memoized inside core — Slice 2.3 adds caching)', () => {
    const loader1 = mock.fn(() => null);
    const loader2 = mock.fn(() => null);
    runNudge(baseOpts({ embeddingsLoader: loader1 }));
    runNudge(baseOpts({ embeddingsLoader: loader2 }));
    assert.equal(loader1.mock.callCount(), 1);
    assert.equal(loader2.mock.callCount(), 1);
  });
});

describe('advisor-nudge-core: early exit (BDD 2)', () => {
  it('Given a prompt of length 5 with threshold 12, When runNudge runs, Then earlyExit is true and neither embeddings loader nor graph loader was invoked', () => {
    const embeddingsLoader = mock.fn(() => null);
    const graphLoader = mock.fn(() => null);
    const hookDataLoader = mock.fn(() => null);
    const discoveryStateLoader = mock.fn(() => ({}));

    const result = runNudge(baseOpts({
      prompt: 'short',
      threshold: 12,
      embeddingsLoader,
      graphLoader,
      hookDataLoader,
      discoveryStateLoader,
    }));

    assert.equal(result.earlyExit, true);
    assert.equal(embeddingsLoader.mock.callCount(), 0);
    assert.equal(graphLoader.mock.callCount(), 0);
    assert.equal(hookDataLoader.mock.callCount(), 0);
    assert.equal(discoveryStateLoader.mock.callCount(), 0);
    assert.deepEqual(result.output, []);
  });

  it('Given a prompt that starts with slash, When runNudge runs, Then earlyExit is true (slash commands bypass the advisor)', () => {
    const embeddingsLoader = mock.fn(() => null);
    const result = runNudge(baseOpts({
      prompt: '/some-command with arguments here',
      embeddingsLoader,
    }));
    assert.equal(result.earlyExit, true);
    assert.equal(embeddingsLoader.mock.callCount(), 0);
  });
});

describe('advisor-nudge-core: isolation (BDD 3)', () => {
  it('Given all loaders returning null, When runNudge runs with a normal prompt, Then it returns gracefully without throwing', () => {
    const result = runNudge(baseOpts());
    assert.ok(result, 'must return a result');
    assert.equal(typeof result, 'object');
    assert.equal(result.earlyExit, false);
    assert.ok(Array.isArray(result.output));
  });

  it('Given a missing index file, When runNudge runs, Then it returns a graceful index-missing message and earlyExit true', () => {
    const result = runNudge(baseOpts({
      indexLitePath: path.resolve(__dirname, 'fixtures', '__does_not_exist__.json'),
    }));
    assert.equal(result.earlyExit, true);
    assert.equal(result.output.length, 1);
    assert.match(result.output[0], /Index nao encontrado|Index não encontrado/);
  });

  it('Given a corrupt index file, When runNudge runs, Then it returns a graceful corruption message and earlyExit true', () => {
    // Dedicated fixture (not borrowed from malformed-skill/SKILL.md, which is
    // owned by frontmatter tests and could be edited into something parseable).
    const result = runNudge(baseOpts({
      indexLitePath: path.resolve(__dirname, 'fixtures', 'corrupt-index.json'),
    }));
    assert.equal(result.earlyExit, true);
    assert.equal(result.output.length, 1);
    assert.match(result.output[0], /corrompido|corrupt/i);
  });
});

describe('advisor-nudge-core: signature contract', () => {
  it('exports a runNudge function', () => {
    assert.equal(typeof runNudge, 'function');
  });

  it('Given opts.prompt undefined, When runNudge runs, Then earlyExit is true, no loaders invoked, output empty', () => {
    const embeddingsLoader = mock.fn(() => null);
    const graphLoader = mock.fn(() => null);
    const hookDataLoader = mock.fn(() => null);
    const discoveryStateLoader = mock.fn(() => ({}));
    const result = runNudge(baseOpts({
      prompt: undefined,
      embeddingsLoader,
      graphLoader,
      hookDataLoader,
      discoveryStateLoader,
    }));
    assert.equal(result.earlyExit, true);
    assert.deepEqual(result.output, []);
    assert.equal(embeddingsLoader.mock.callCount(), 0);
    assert.equal(graphLoader.mock.callCount(), 0);
    assert.equal(hookDataLoader.mock.callCount(), 0);
    assert.equal(discoveryStateLoader.mock.callCount(), 0);
  });
});

describe('advisor-nudge-core: positive content (BDD 4)', () => {
  it('Given a prompt matching the investigate skill, When runNudge runs against the sample fixture, Then top[0].id === global:investigate and output[0] matches the expected nudge format', () => {
    // Prompt chosen so multiple tokens hit the investigate entry's name+description
    // (investigate name=+3, root/cause/error all in desc=+2 each), pushing the
    // fused score well above the 0.20 default threshold.
    const result = runNudge(baseOpts({
      prompt: 'investigate root cause error',
    }));
    assert.equal(result.earlyExit, false);
    assert.ok(result.top.length > 0, 'expected at least one suggestion');
    assert.equal(result.top[0].id, 'global:investigate');
    assert.equal(result.output.length, 1);
    // Locks the nudge format string — catches accidental rewording in future refactors.
    assert.match(result.output[0], /^\[Advisor\] Considere \/advisor — detectei relevancia com: \/investigate \(\d+%\)/);
  });
});

describe('advisor-nudge-core: staleness boundary (test-coverage 🔴)', () => {
  // Pins the `>` strict-inequality semantics of the staleness check. A future
  // refactor that flips this to `>=` would silently start treating boundary-old
  // indexes as stale and would be caught by the second case below.
  const STALENESS_DAYS = 7;
  const ONE_DAY_MS = 86400000;
  const fs = require('node:fs');

  function indexMtimeMs() {
    return fs.statSync(SAMPLE_INDEX).mtimeMs;
  }

  it('Given now exactly STALENESS_DAYS after mtime, When runNudge runs, Then the staleness gate does NOT fire (boundary inclusive)', () => {
    const exactBoundary = indexMtimeMs() + STALENESS_DAYS * ONE_DAY_MS;
    const result = runNudge(baseOpts({ now: () => exactBoundary }));
    // At exact boundary, ageDays === STALENESS_DAYS, and `> STALENESS_DAYS` is false,
    // so we should NOT see the staleness message.
    assert.ok(!result.output.some(l => /desatualizado/.test(l)),
      `expected no staleness line, got: ${JSON.stringify(result.output)}`);
  });

  it('Given now 1ms beyond STALENESS_DAYS after mtime, When runNudge runs, Then the staleness gate fires with the desatualizado message', () => {
    const justBeyond = indexMtimeMs() + STALENESS_DAYS * ONE_DAY_MS + 1;
    const result = runNudge(baseOpts({ now: () => justBeyond }));
    assert.equal(result.earlyExit, true);
    assert.equal(result.output.length, 1);
    assert.match(result.output[0], /desatualizado/);
  });
});
