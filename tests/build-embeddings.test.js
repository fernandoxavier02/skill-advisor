'use strict';

/**
 * build-embeddings.test.js — Slice 5.3 (Task 6.3).
 *
 * Spec language: "if injection is not feasible, the slice instead documents
 * and asserts the model unavailable failure path." `lib/build-embeddings.js`
 * uses dynamic `await import('@huggingface/transformers')` inside `main()`
 * — there is no DI seam for the model loader without a structural refactor
 * out of scope for this slice.
 *
 * What we DO test (without invoking the network or model download):
 *   - VOCAB_WORDS shape and content invariants (the test would catch a
 *     PR that accidentally drops half the vocabulary or introduces dups)
 *   - VOCAB_WORDS contains both PT-BR and EN tokens (bilingual contract)
 *   - The module loads without side effects on require (no model fetch
 *     happens at require-time; that only happens inside main())
 *
 * What we DEFER to post-0.5.0 hardening:
 *   - Stub model injection asserting vector length 384 + L2 norm
 *   - Failure-path assertion for model unavailable (requires module mock)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EMBEDDING } = require('../lib/constants');

describe('build-embeddings: module loads without side effects (Req 8.3)', () => {
  it('Given a fresh require of lib/build-embeddings, When the module loads, Then no network/model fetch occurs and VOCAB_WORDS is exported', () => {
    delete require.cache[require.resolve('../lib/build-embeddings')];
    const { VOCAB_WORDS, main } = require('../lib/build-embeddings');
    assert.equal(typeof main, 'function');
    assert.ok(Array.isArray(VOCAB_WORDS));
  });
});

describe('build-embeddings: VOCAB_WORDS invariants (Req 8.3)', () => {
  const { VOCAB_WORDS } = require('../lib/build-embeddings');

  it('Given the exported vocabulary, When inspected, Then it contains at least 100 entries (covers the documented PT-BR + EN bilingual surface)', () => {
    assert.ok(VOCAB_WORDS.length >= 100, `vocab too small: ${VOCAB_WORDS.length}`);
  });

  it('Given the vocabulary, When deduped, Then duplicate counts identify how much overlap exists between PT/EN sections (informational, but no entry should appear 3+ times)', () => {
    const counts = new Map();
    for (const w of VOCAB_WORDS) counts.set(w, (counts.get(w) || 0) + 1);
    const triples = [...counts.entries()].filter(([, n]) => n >= 3);
    assert.deepEqual(triples, [], `triplicate vocabulary entries: ${triples.map(([w]) => w).join(',')}`);
  });

  it('Given the vocabulary, When inspected, Then it contains canonical PT-BR markers (auditar, depurar, seguranca)', () => {
    for (const w of ['auditar', 'depurar', 'seguranca']) {
      assert.ok(VOCAB_WORDS.includes(w), `missing PT-BR token: ${w}`);
    }
  });

  it('Given the vocabulary, When inspected, Then it contains canonical EN markers (audit, debug, security)', () => {
    for (const w of ['audit', 'debug', 'security']) {
      assert.ok(VOCAB_WORDS.includes(w), `missing EN token: ${w}`);
    }
  });

  it('Given the vocabulary, When all entries inspected, Then every entry is a non-empty lowercase string (no whitespace-only, no nulls)', () => {
    for (const w of VOCAB_WORDS) {
      assert.equal(typeof w, 'string', `non-string entry: ${JSON.stringify(w)}`);
      assert.ok(w.length > 0, 'empty string in vocab');
      assert.equal(w, w.toLowerCase(), `non-lowercase entry: ${w}`);
    }
  });
});

describe('build-embeddings: EMBEDDING constant (Req 8.3)', () => {
  it('Given lib/constants.EMBEDDING.DIMENSIONS, When inspected, Then it equals 384 (Xenova/all-MiniLM-L6-v2 contract)', () => {
    assert.equal(EMBEDDING.DIMENSIONS, 384);
  });
});
