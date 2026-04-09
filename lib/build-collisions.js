'use strict';

const fs = require('fs');
const path = require('path');
const { cosineSimilarity } = require('./semantic');
const { COLLISION_PARAMS } = require('./constants');
const { writeJSON } = require('./jsonl');
const { debugLog } = require('./errors');

/**
 * Detect skill collisions via pairwise cosine similarity on pre-computed embeddings.
 * Returns array of [id1, id2, similarity] tuples for pairs above threshold.
 * O(n²) but only runs at build time — acceptable for <1000 skills.
 */
function detectCollisions(embeddings, threshold) {
  if (!embeddings || typeof embeddings !== 'object') return [];

  const thr = typeof threshold === 'number' ? threshold : COLLISION_PARAMS.SIMILARITY_THRESHOLD;
  const ids = Object.keys(embeddings);
  const collisions = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = embeddings[ids[i]];
      const b = embeddings[ids[j]];
      const sim = cosineSimilarity(a, b);
      if (sim > thr) {
        collisions.push([ids[i], ids[j], Math.round(sim * 1000) / 1000]);
      }
    }
  }

  return collisions;
}

/**
 * Build collisions from an embeddings file in a directory.
 * Writes advisor-collisions.json to outputPath.
 */
function buildCollisionsFromDir(embeddingsDir, outputPath) {
  const embPath = path.join(embeddingsDir, 'advisor-embeddings.json');

  let embeddings;
  try {
    embeddings = JSON.parse(fs.readFileSync(embPath, 'utf8'));
  } catch {
    debugLog('EMBED_LOAD', 'No embeddings file found, skipping collision detection', { embPath });
    writeJSON(outputPath, []);
    return [];
  }

  const collisions = detectCollisions(embeddings);
  writeJSON(outputPath, collisions);

  if (collisions.length > 0) {
    console.log(`  Collision detection: ${collisions.length} pairs above ${COLLISION_PARAMS.SIMILARITY_THRESHOLD} threshold`);
  }

  return collisions;
}

module.exports = { detectCollisions, buildCollisionsFromDir };
