/**
 * semantic.js — Lightweight semantic search using pre-computed embeddings.
 *
 * NO model loading at runtime. Uses:
 *   - advisor-vocab.json: word → 384-dim vector lookup
 *   - advisor-embeddings.json: skill_id → 384-dim vector
 *
 * Query embedding = average of word vectors (bag-of-words approximation).
 * Ranking = cosine similarity against pre-computed description embeddings.
 */

const fs = require('fs');
const path = require('path');
const { debugLog } = require('./errors');
const { EMBEDDING, THRESHOLDS, SEARCH_WEIGHTS } = require('./constants');

let _vocab = null;
let _embeddings = null;
let _embeddingIds = null;

/**
 * Load pre-computed embeddings from disk.
 * Returns false if files don't exist (semantic search unavailable).
 */
function loadEmbeddings(libDir) {
  const vocabPath = path.join(libDir, 'advisor-vocab.json');
  const embPath = path.join(libDir, 'advisor-embeddings.json');

  try {
    _vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
    _embeddings = JSON.parse(fs.readFileSync(embPath, 'utf8'));
    _embeddingIds = Object.keys(_embeddings);
    return true;
  } catch (err) {
    debugLog('EMBED_LOAD', 'Failed to load embeddings', { vocabPath, embPath, cause: err.message });
    _vocab = null;
    _embeddings = null;
    _embeddingIds = null;
    return false;
  }
}

function isReady() {
  return _vocab !== null && _embeddings !== null;
}

/**
 * Build an approximate query embedding from word vectors.
 * Tokens not in vocabulary are skipped.
 */
function queryEmbedding(tokens) {
  if (!_vocab || tokens.length === 0) return null;

  const dim = EMBEDDING.DIMENSIONS;
  const avg = new Float32Array(dim);
  let count = 0;

  for (const token of tokens) {
    const vec = _vocab[token];
    if (vec) {
      for (let i = 0; i < dim; i++) avg[i] += vec[i];
      count++;
    }
  }

  if (count === 0) return null;

  for (let i = 0; i < dim; i++) avg[i] /= count;

  // Normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += avg[i] * avg[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < dim; i++) avg[i] /= norm;

  return avg;
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (!a || !b) return 0;
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  return dot; // Already normalized, so dot product = cosine
}

/**
 * Search: find top N skills semantically similar to the query tokens.
 * Returns array of { id, score } sorted by score descending.
 */
function semanticSearch(tokens, topN = SEARCH_WEIGHTS.MAX_SEMANTIC_RESULTS) {
  if (!isReady()) return [];

  const qEmb = queryEmbedding(tokens);
  if (!qEmb) return [];

  const results = [];
  for (const id of _embeddingIds) {
    const descEmb = _embeddings[id];
    const score = cosineSimilarity(qEmb, descEmb);
    if (score > THRESHOLDS.SEMANTIC_MIN) {
      results.push({ id, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topN);
}

module.exports = {
  loadEmbeddings,
  isReady,
  queryEmbedding,
  cosineSimilarity,
  semanticSearch,
};
