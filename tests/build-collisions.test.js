'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { detectCollisions, buildCollisionsFromDir } = require('../lib/build-collisions');

// Helper: create fake embeddings JSON
function makeEmbeddings(pairs) {
  // pairs = [ [id, vector], ... ]
  const obj = {};
  for (const [id, vec] of pairs) {
    obj[id] = vec;
  }
  return obj;
}

// Create a normalized vector (unit length) for cosine testing
function normalized(arr) {
  let norm = 0;
  for (const v of arr) norm += v * v;
  norm = Math.sqrt(norm);
  return arr.map(v => v / norm);
}

describe('detectCollisions', () => {
  it('finds collisions above threshold', () => {
    // Two nearly identical vectors → cosine ~1.0
    const v1 = normalized([1, 0, 0, 0]);
    const v2 = normalized([0.99, 0.01, 0, 0]);
    const v3 = normalized([0, 1, 0, 0]); // orthogonal to v1

    const embeddings = makeEmbeddings([
      ['skill:a', v1],
      ['skill:b', v2],
      ['skill:c', v3],
    ]);

    const result = detectCollisions(embeddings, 0.85);
    assert.ok(result.length >= 1);
    // a-b should collide
    const pair = result.find(r => (r[0] === 'skill:a' && r[1] === 'skill:b') || (r[0] === 'skill:b' && r[1] === 'skill:a'));
    assert.ok(pair, 'Expected skill:a and skill:b to collide');
    assert.ok(pair[2] > 0.85, `Expected similarity > 0.85, got ${pair[2]}`);
  });

  it('returns empty when no collisions', () => {
    const v1 = normalized([1, 0, 0, 0]);
    const v2 = normalized([0, 1, 0, 0]);
    const v3 = normalized([0, 0, 1, 0]);

    const embeddings = makeEmbeddings([
      ['skill:a', v1],
      ['skill:b', v2],
      ['skill:c', v3],
    ]);

    const result = detectCollisions(embeddings, 0.85);
    assert.equal(result.length, 0);
  });

  it('excludes self-similarity (diagonal)', () => {
    const v1 = normalized([1, 0, 0, 0]);
    const embeddings = makeEmbeddings([['skill:a', v1]]);

    const result = detectCollisions(embeddings, 0.85);
    assert.equal(result.length, 0);
  });

  it('does not duplicate pairs (a,b) and (b,a)', () => {
    const v1 = normalized([1, 0, 0, 0]);
    const v2 = normalized([0.99, 0.01, 0, 0]);

    const embeddings = makeEmbeddings([
      ['skill:a', v1],
      ['skill:b', v2],
    ]);

    const result = detectCollisions(embeddings, 0.85);
    assert.equal(result.length, 1); // only one pair, not two
  });

  it('returns empty for empty embeddings', () => {
    const result = detectCollisions({}, 0.85);
    assert.equal(result.length, 0);
  });

  it('returns empty for single embedding', () => {
    const v1 = normalized([1, 0, 0, 0]);
    const result = detectCollisions(makeEmbeddings([['skill:a', v1]]), 0.85);
    assert.equal(result.length, 0);
  });

  it('uses default threshold from COLLISION_PARAMS', () => {
    const v1 = normalized([1, 0, 0, 0]);
    const v2 = normalized([0.99, 0.01, 0, 0]);

    const embeddings = makeEmbeddings([
      ['skill:a', v1],
      ['skill:b', v2],
    ]);

    // No threshold arg → uses COLLISION_PARAMS.SIMILARITY_THRESHOLD (0.85)
    const result = detectCollisions(embeddings);
    assert.ok(result.length >= 1);
  });

  it('returns [id1, id2, similarity] tuples', () => {
    const v1 = normalized([1, 0, 0, 0]);
    const v2 = normalized([0.99, 0.01, 0, 0]);

    const embeddings = makeEmbeddings([
      ['skill:a', v1],
      ['skill:b', v2],
    ]);

    const result = detectCollisions(embeddings, 0.85);
    assert.equal(result[0].length, 3);
    assert.equal(typeof result[0][0], 'string');
    assert.equal(typeof result[0][1], 'string');
    assert.equal(typeof result[0][2], 'number');
  });
});

describe('buildCollisionsFromDir', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collisions-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads embeddings from dir and writes collisions JSON', () => {
    const v1 = normalized([1, 0, 0, 0]);
    const v2 = normalized([0.99, 0.01, 0, 0]);
    const embeddings = makeEmbeddings([['skill:a', v1], ['skill:b', v2]]);

    fs.writeFileSync(path.join(tmpDir, 'advisor-embeddings.json'), JSON.stringify(embeddings));
    const outputPath = path.join(tmpDir, 'advisor-collisions.json');

    const result = buildCollisionsFromDir(tmpDir, outputPath);
    assert.ok(result.length >= 1);
    assert.ok(fs.existsSync(outputPath));

    const written = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.deepEqual(written, result);
  });

  it('returns empty and writes empty array when no embeddings file', () => {
    const outputPath = path.join(tmpDir, 'advisor-collisions.json');
    const result = buildCollisionsFromDir(tmpDir, outputPath);
    assert.equal(result.length, 0);
    assert.ok(fs.existsSync(outputPath));
  });
});
