'use strict';

/**
 * graph-search.js — BFS graph traversal with distance scoring for Skill Advisor v2.
 *
 * Exports:
 *   matchAliases(tokens, aliasIndex)           → string[]
 *   bfsTraverse(seedNodeIds, graphNodes, maxHops) → BFSResult[]
 *   inferTaskType(tokens)                      → string | null
 *   graphSearch(tokens, graph, topN)           → SearchResult[]
 *   loadGraph(graphDir)                        → Graph (with mtime cache)
 *
 * Constants (exported for tests/callers):
 *   SCORE_BY_HOP     [1.0, 0.7, 0.4]
 *   CONVERGENCE_BOOST 0.15
 *   CATEGORY_BOOST    0.2
 */

const fs = require('fs');
const path = require('path');
const { getGraphPath } = require('./paths');

// ---------------------------------------------------------------------------
// Scoring constants
// ---------------------------------------------------------------------------
const SCORE_BY_HOP = [1.0, 0.7, 0.4];
const CONVERGENCE_BOOST = 0.15;
const CATEGORY_BOOST = 0.2;

// ---------------------------------------------------------------------------
// Task-type inference patterns
// ---------------------------------------------------------------------------
const TASK_PATTERNS = [
  { type: 'debugging',      re: /debug|fix|bug|error|erro|corrigir|investigar|broken|quebrado/i },
  { type: 'quality',        re: /review|audit|security|seguranca|segurança|qualidade|revisar|auditar/i },
  { type: 'deployment',     re: /deploy|ship|push|merge|release|implantar/i },
  { type: 'implementation', re: /create|build|implement|feature|criar|construir/i },
];

// ---------------------------------------------------------------------------
// normalizeToken(s) → string
// NFD decompose + strip combining accents → lowercase.
// Mirrors normalizeAlias() in build-graph.js.
// ---------------------------------------------------------------------------
function normalizeToken(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// ---------------------------------------------------------------------------
// inferTaskType(tokens) → string | null
// Scans tokens against TASK_PATTERNS. Returns first match.
// ---------------------------------------------------------------------------
function inferTaskType(tokens) {
  const joined = tokens.join(' ');
  for (const { type, re } of TASK_PATTERNS) {
    if (re.test(joined)) return type;
  }
  return null;
}

// ---------------------------------------------------------------------------
// matchAliases(tokens, aliasIndex) → string[]
// For each token, normalize and look up in aliasIndex.
// Returns deduplicated array of node IDs.
// ---------------------------------------------------------------------------
function matchAliases(tokens, aliasIndex) {
  const seen = new Set();
  const results = [];

  for (const token of tokens) {
    // Try exact lowercase first, then normalized (accent-stripped)
    const candidates = [token.toLowerCase(), normalizeToken(token)];
    for (const key of candidates) {
      const nodeId = aliasIndex[key];
      if (nodeId && !seen.has(nodeId)) {
        seen.add(nodeId);
        results.push(nodeId);
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// bfsTraverse(seedNodeIds, graphNodes, maxHops) → BFSResult[]
//
// BFSResult = { nodeId, distance, score, fromSeeds }
//
// For each visited node tracks:
//   - distance: hops from the nearest seed
//   - fromSeeds: array of seed IDs that can reach this node
//   - score: SCORE_BY_HOP[distance] (or 0 if beyond SCORE_BY_HOP range)
//
// If the same node is reachable from multiple seeds at different distances,
// the minimum distance wins. fromSeeds accumulates all seeds that reach it.
// ---------------------------------------------------------------------------
function bfsTraverse(seedNodeIds, graphNodes, maxHops) {
  // nodeId → { distance, fromSeeds: Set }
  const visited = new Map();

  // Queue entries: { nodeId, distance, seedId }
  const queue = [];

  for (const seedId of seedNodeIds) {
    if (!graphNodes[seedId]) continue;
    if (!visited.has(seedId)) {
      visited.set(seedId, { distance: 0, fromSeeds: new Set([seedId]) });
      if (maxHops > 0) {
        queue.push({ nodeId: seedId, distance: 0, seedId });
      }
    }
  }

  // For maxHops === 0, we just return the seeds themselves.
  let head = 0;
  while (head < queue.length) {
    const { nodeId, distance, seedId } = queue[head++];

    if (distance >= maxHops) continue;

    const node = graphNodes[nodeId];
    if (!node) continue;

    for (const neighborId of (node.edges || [])) {
      const nextDist = distance + 1;

      if (!visited.has(neighborId)) {
        visited.set(neighborId, { distance: nextDist, fromSeeds: new Set([seedId]) });
        queue.push({ nodeId: neighborId, distance: nextDist, seedId });
      } else {
        const entry = visited.get(neighborId);
        // Accumulate seeds regardless of distance
        entry.fromSeeds.add(seedId);
        // If we found a shorter path, update distance and re-enqueue
        if (nextDist < entry.distance) {
          entry.distance = nextDist;
          queue.push({ nodeId: neighborId, distance: nextDist, seedId });
        }
      }
    }
  }

  // Build result array
  const results = [];
  for (const [nodeId, { distance, fromSeeds }] of visited.entries()) {
    const score = distance < SCORE_BY_HOP.length ? SCORE_BY_HOP[distance] : 0;
    results.push({
      nodeId,
      distance,
      score,
      fromSeeds: Array.from(fromSeeds),
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// graphSearch(tokens, graph, topN=5) → SearchResult[]
//
// SearchResult = {
//   nodeId, name, invocation, category, score, paths, inputs, outputs
// }
//
// Full pipeline:
//   1. matchAliases → seedNodeIds
//   2. bfsTraverse  → all reachable nodes
//   3. Filter to skill nodes only
//   4. Per skill: base score from nearest-distance BFS entry
//   5. Convergence boost (+0.15 per extra seed beyond the first)
//   6. Category boost (+0.2 if skill.category === inferTaskType(tokens))
//   7. Build explain paths (seed → skill)
//   8. Sort descending by score, slice to topN
// ---------------------------------------------------------------------------
function graphSearch(tokens, graph, topN = 5) {
  const { nodes, alias_index } = graph;

  // 1. Seed nodes from alias matching
  const seedNodeIds = matchAliases(tokens, alias_index);
  if (seedNodeIds.length === 0) return [];

  // 2. BFS from all seeds (2 hops)
  const bfsResults = bfsTraverse(seedNodeIds, nodes, 2);

  // 3 + 4. Filter to skills only; group by nodeId to handle convergence
  const skillMap = new Map(); // nodeId → BFSResult

  for (const result of bfsResults) {
    if (!result.nodeId.startsWith('skill:')) continue;

    if (!skillMap.has(result.nodeId)) {
      skillMap.set(result.nodeId, result);
    } else {
      // Keep the entry with minimum distance (highest base score)
      const existing = skillMap.get(result.nodeId);
      if (result.distance < existing.distance) {
        // Merge fromSeeds
        const merged = new Set([...existing.fromSeeds, ...result.fromSeeds]);
        skillMap.set(result.nodeId, {
          ...result,
          fromSeeds: Array.from(merged),
        });
      } else {
        // Just accumulate seeds
        const merged = new Set([...existing.fromSeeds, ...result.fromSeeds]);
        existing.fromSeeds = Array.from(merged);
      }
    }
  }

  if (skillMap.size === 0) return [];

  // Infer task type for category boost
  const taskType = inferTaskType(tokens);

  // 5 + 6. Score each skill
  const scored = [];
  for (const [nodeId, bfsEntry] of skillMap.entries()) {
    const node = nodes[nodeId];
    if (!node) continue;

    let score = bfsEntry.score; // base from distance

    // Convergence boost: +0.15 for each additional seed beyond the first
    const extraSeeds = bfsEntry.fromSeeds.length - 1;
    if (extraSeeds > 0) {
      score += extraSeeds * CONVERGENCE_BOOST;
    }

    // Category boost
    if (taskType && node.category === taskType) {
      score += CATEGORY_BOOST;
    }

    // 7. Build explain paths: seed → skill
    const paths = bfsEntry.fromSeeds.map(seedId => `${seedId} → ${nodeId}`);

    scored.push({
      nodeId,
      name: node.name,
      invocation: node.invocation || `/${node.name}`,
      category: node.category || null,
      score,
      paths,
      inputs: node.inputs || [],
      outputs: node.outputs || [],
    });
  }

  // 8. Sort descending, slice to topN
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}

// ---------------------------------------------------------------------------
// loadGraph(graphDir) → { nodes, alias_index }
// Loads adjacency.json from disk with mtime-based caching.
// ---------------------------------------------------------------------------
let _graphCache = null; // { mtime, graph }

function loadGraph(graphDir) {
  const adjacencyPath = graphDir
    ? path.join(graphDir, 'adjacency.json')
    : getGraphPath('adjacency.json');

  const stat = fs.statSync(adjacencyPath);
  const mtime = stat.mtimeMs;

  if (_graphCache && _graphCache.mtime === mtime) {
    return _graphCache.graph;
  }

  const raw = fs.readFileSync(adjacencyPath, 'utf8');
  const graph = JSON.parse(raw);
  _graphCache = { mtime, graph };
  return graph;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  SCORE_BY_HOP,
  CONVERGENCE_BOOST,
  CATEGORY_BOOST,
  normalizeToken,
  inferTaskType,
  matchAliases,
  bfsTraverse,
  graphSearch,
  loadGraph,
};
