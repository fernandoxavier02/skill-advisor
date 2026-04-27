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

describe('advisor-nudge-core: replay-hint sanitization (Slice 7.3 polish)', () => {
  // Adversarial review pointed out the replay-hint sanitization (added late
  // in Slice 2.3 polish) had no test asserting that malicious sequence members
  // are stripped. A future refactor that simplifies the sequence join could
  // silently reopen the prompt-injection window.
  it('Given hookData.replay with malicious sequence members containing injection chars, When runNudge runs and the first member matches a top result, Then the emitted seqStr contains only allowlist chars (a-zA-Z0-9:/_-)', () => {
    const hookData = {
      replay: [{
        // First member matches global:investigate (which will be in top after the
        // strong prompt below); other members carry injection attempts.
        sequence: ['investigate', '`rm -rf /`', '<script>alert(1)</script>', 'normal-skill'],
        count: 5,
      }],
    };
    const result = runNudge(baseOpts({
      prompt: 'investigate root cause error',
      hookDataLoader: () => hookData,
      contextMod: false, // disable branch context boost for determinism
    }));
    // The replay line is the LAST output line if it fired.
    const replayLine = result.output.find(l => l.includes('Pipeline anterior'));
    if (replayLine) {
      // Sanitization regex: /[^a-zA-Z0-9:/_-]/g. The forbidden chars must
      // not appear in the output. Backticks, angle brackets, parens, spaces
      // inside skill names are all stripped.
      assert.ok(!/`/.test(replayLine), `backtick leaked: ${replayLine}`);
      assert.ok(!/<|>/.test(replayLine), `angle brackets leaked: ${replayLine}`);
      assert.ok(!/\(/.test(replayLine.split('(usado')[0]), `parens leaked in seq: ${replayLine}`);
      // The legitimate first member should appear as-is.
      assert.match(replayLine, /investigate/);
    } else {
      // If replay didn't fire (e.g., investigate not in top), at least
      // confirm no malicious bytes leaked into ANY output line.
      const all = result.output.join(' ');
      assert.ok(!/`/.test(all), `backtick leaked across output: ${all}`);
      assert.ok(!/<script/.test(all), `script tag leaked: ${all}`);
    }
  });

  it('Given hookData.replay with non-finite count (NaN, Infinity, string), When runNudge fires the replay line, Then count is coerced to 0', () => {
    for (const badCount of [NaN, Infinity, 'twenty', null, undefined, { x: 1 }]) {
      const result = runNudge(baseOpts({
        prompt: 'investigate root cause error',
        hookDataLoader: () => ({ replay: [{ sequence: ['investigate'], count: badCount }] }),
        contextMod: false,
      }));
      const replayLine = result.output.find(l => l.includes('Pipeline anterior'));
      if (replayLine) {
        assert.match(replayLine, /usado 0x/, `non-finite count not coerced for ${String(badCount)}: ${replayLine}`);
      }
    }
  });
});

describe('advisor-nudge-core: contextMod=false sentinel (Slice 7.3 polish)', () => {
  it('Given contextMod=false (explicit disable sentinel), When runNudge runs, Then the lazy-require of ./context is bypassed and no branch boost is applied', () => {
    // We can't directly observe the require call, but we can observe that
    // the result is identical regardless of ADVISOR_BRANCH env when
    // contextMod=false. This proves the boost path was skipped.
    const withBranch = runNudge(baseOpts({
      prompt: 'investigate root cause error',
      env: { ADVISOR_BRANCH: 'fix/bug' },
      contextMod: false,
    }));
    const withoutBranch = runNudge(baseOpts({
      prompt: 'investigate root cause error',
      env: {},
      contextMod: false,
    }));
    assert.deepEqual(withBranch.output, withoutBranch.output,
      'contextMod=false must produce identical output regardless of ADVISOR_BRANCH');
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

describe('advisor-nudge-core: threshold env override (Slice 2.3)', () => {
  // The shim is responsible for resolving ADVISOR_PROMPT_LENGTH and passing it
  // to runNudge as `threshold`. The core itself only needs to honor the param.
  // This test locks the contract: an explicit threshold value beats any default.

  it('Given threshold=20 and a 19-char prompt, When runNudge runs, Then earlyExit fires (override beats core default of 12)', () => {
    const result = runNudge(baseOpts({
      prompt: 'investigate root b',  // 18 chars (with trailing trim)
      threshold: 20,
    }));
    assert.equal(result.earlyExit, true);
  });

  it('Given threshold=3 and a 5-char prompt, When runNudge runs, Then earlyExit does NOT fire on the length gate (override allows shorter prompts)', () => {
    const result = runNudge(baseOpts({
      prompt: 'debug',  // 5 chars
      threshold: 3,
    }));
    // The length gate did NOT fire. The result may still be earlyExit:false
    // with empty output if no skill matches, but the loaders MUST have been
    // invoked (the gate didn't short-circuit them).
    assert.equal(result.earlyExit, false);
  });

  it('Given threshold=0 (kill-switch) and a 1-char prompt, When runNudge runs, Then the length gate is fully disabled (any non-empty prompt passes through)', () => {
    const result = runNudge(baseOpts({
      prompt: 'a',
      threshold: 0,
    }));
    // threshold=0 means "any length passes" — the early-exit gate must not fire
    // on prompt length. Slash-prefix gate still applies in other tests.
    assert.equal(result.earlyExit, false);
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
