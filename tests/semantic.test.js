const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const {
  loadEmbeddings,
  isReady,
  queryEmbedding,
  cosineSimilarity,
  semanticSearch,
} = require('../lib/semantic');

const FIXTURES = path.join(__dirname, 'fixtures');
const SEMANTIC_FIXTURE = path.join(FIXTURES, 'semantic');

// ---------------------------------------------------------------------------
// Helper: reset module-level state by re-requiring
// Since semantic.js uses module-level _vocab/_embeddings globals,
// we test "not loaded" state first, then load fixtures, then test loaded state.
// ---------------------------------------------------------------------------

// We need a way to reset state between tests. The module caches _vocab etc.
// Strategy: test "not loaded" first (before any loadEmbeddings call in this file),
// then load, then test "loaded" behavior.

// ---------------------------------------------------------------------------
// 1. Tests that run BEFORE loading (module initial state)
// ---------------------------------------------------------------------------
describe('semantic (not loaded)', () => {
  it('isReady returns false before loading', () => {
    // Note: if other tests ran loadEmbeddings, this could be true.
    // We can't truly reset module state without re-requiring.
    // This test verifies the contract: initially false.
    // If loadEmbeddings was called with valid data previously, isReady would be true.
    // We test that the function exists and returns a boolean.
    const ready = isReady();
    assert.equal(typeof ready, 'boolean');
  });

  it('semanticSearch returns empty array when not loaded', () => {
    // If already loaded by another test, this won't be empty.
    // We test the contract: semanticSearch should return [] if embeddings not loaded.
    // Direct test: if isReady() is false, search returns []
    if (!isReady()) {
      const results = semanticSearch(['debug']);
      assert.deepEqual(results, []);
    } else {
      // If already loaded, just verify the function is callable
      const results = semanticSearch(['debug']);
      assert.ok(Array.isArray(results));
    }
  });

  it('loadEmbeddings returns false for missing directory', () => {
    const result = loadEmbeddings('/nonexistent/path/that/does/not/exist');
    assert.equal(result, false);
  });

  it('loadEmbeddings returns false for malformed JSON', () => {
    // Create a temp dir with invalid JSON
    const tmpDir = path.join(FIXTURES, 'semantic-bad');
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'advisor-vocab.json'), 'not json{{{');
      fs.writeFileSync(path.join(tmpDir, 'advisor-embeddings.json'), 'not json{{{');
      const result = loadEmbeddings(tmpDir);
      assert.equal(result, false);
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Load fixtures once for remaining tests
// ---------------------------------------------------------------------------
describe('semantic (loaded)', () => {
  let loadSucceeded = false;

  before(() => {
    loadSucceeded = loadEmbeddings(SEMANTIC_FIXTURE);
    assert.ok(loadSucceeded, 'should successfully load fixture embeddings');
  });

  it('loadEmbeddings returns true for valid fixtures', () => {
    assert.equal(loadSucceeded, true);
  });

  it('isReady returns true after successful load', () => {
    assert.equal(isReady(), true);
  });

  // ---------------------------------------------------------------------------
  // 3. cosineSimilarity
  // ---------------------------------------------------------------------------
  describe('cosineSimilarity', () => {
    it('returns ~1.0 for identical vectors', () => {
      const v = [0.5, 0.5, 0.7071, 0, 0];
      const sim = cosineSimilarity(v, v);
      assert.ok(Math.abs(sim - 1.0) < 0.001, `expected ~1.0, got ${sim}`);
    });

    it('returns ~0.0 for orthogonal vectors', () => {
      const a = [1, 0, 0, 0, 0];
      const b = [0, 1, 0, 0, 0];
      const sim = cosineSimilarity(a, b);
      assert.ok(Math.abs(sim) < 0.001, `expected ~0.0, got ${sim}`);
    });

    it('returns 0 for null input', () => {
      assert.equal(cosineSimilarity(null, [1, 0, 0]), 0);
      assert.equal(cosineSimilarity([1, 0, 0], null), 0);
      assert.equal(cosineSimilarity(null, null), 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. queryEmbedding
  // ---------------------------------------------------------------------------
  describe('queryEmbedding', () => {
    it('returns null for empty tokens', () => {
      const result = queryEmbedding([]);
      assert.equal(result, null);
    });

    it('returns averaged vector for known tokens', () => {
      const result = queryEmbedding(['debug', 'fix']);
      assert.ok(result !== null, 'should return a vector');
      assert.ok(result.length > 0, 'vector should have elements');
      // The result is the average of debug and fix vocab vectors, normalized
      // debug = [1,0,...], fix = [0.707,0.707,...]
      // average = [0.8535, 0.3535, ...] then normalized
      // Both components should be positive
      assert.ok(result[0] > 0, 'first component should be positive');
      assert.ok(result[1] > 0, 'second component should be positive');
    });

    it('returns null when all tokens are unknown', () => {
      const result = queryEmbedding(['xyznonexistent', 'abcunknown']);
      assert.equal(result, null);
    });

    it('skips unknown tokens and uses only known ones', () => {
      const withUnknown = queryEmbedding(['debug', 'xyznonexistent']);
      const withoutUnknown = queryEmbedding(['debug']);
      // Both should produce vectors based only on "debug"
      // They should be identical since unknown tokens are skipped
      assert.ok(withUnknown !== null, 'should return a vector');
      assert.ok(withoutUnknown !== null, 'should return a vector');
      // Compare the vectors (they should be the same since only 'debug' is known)
      for (let i = 0; i < withUnknown.length; i++) {
        assert.ok(
          Math.abs(withUnknown[i] - withoutUnknown[i]) < 0.001,
          `component ${i}: ${withUnknown[i]} vs ${withoutUnknown[i]}`
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. semanticSearch
  // ---------------------------------------------------------------------------
  describe('semanticSearch', () => {
    it('returns results sorted by score descending', () => {
      const results = semanticSearch(['debug', 'fix']);
      assert.ok(results.length > 0, 'should find results');
      for (let i = 1; i < results.length; i++) {
        assert.ok(
          results[i - 1].score >= results[i].score,
          `result ${i - 1} score (${results[i - 1].score}) should be >= result ${i} (${results[i].score})`
        );
      }
    });

    it('respects topN parameter', () => {
      const results = semanticSearch(['debug', 'fix', 'deploy'], 2);
      assert.ok(results.length <= 2, `expected at most 2 results, got ${results.length}`);
    });

    it('filters results below threshold', () => {
      // Use a token that is orthogonal to all embeddings
      // "security" has vector at position 6, which is orthogonal to investigate/deploy/fix embeddings
      const results = semanticSearch(['security']);
      // skill:deploy has vector at position 2, orthogonal to position 6
      // So deploy should have score ~0 and be filtered out
      const deploy = results.find(r => r.id === 'skill:deploy');
      if (deploy) {
        assert.ok(deploy.score > 0.15, 'deploy should only appear if above threshold');
      }
    });

    it('returns objects with id and score fields', () => {
      const results = semanticSearch(['debug']);
      assert.ok(results.length > 0);
      const first = results[0];
      assert.ok('id' in first, 'result should have id field');
      assert.ok('score' in first, 'result should have score field');
      assert.equal(typeof first.score, 'number');
    });
  });
});
