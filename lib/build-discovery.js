'use strict';

const fs = require('fs');
const { DISCOVERY_PARAMS } = require('./constants');
const { writeJSON } = require('./jsonl');
const { debugLog } = require('./errors');

/**
 * Find discovery candidates: high-affinity skills the user has never used.
 * Trigger: affinityScore > MIN_AFFINITY_SCORE AND usageCount == 0.
 * Returns max MAX_CANDIDATES entries sorted by affinityScore descending.
 */
function findCandidates(affinity, index) {
  if (!Array.isArray(affinity) || affinity.length === 0) return [];

  // Build index lookup by skill name (strip namespace prefix)
  const indexByName = new Map();
  if (Array.isArray(index)) {
    for (const entry of index) {
      const colonIdx = entry.id ? entry.id.indexOf(':') : -1;
      const bareName = colonIdx >= 0 ? entry.id.slice(colonIdx + 1) : entry.name;
      indexByName.set(bareName, entry);
    }
  }

  const candidates = affinity
    .filter(a =>
      a.affinityScore > DISCOVERY_PARAMS.MIN_AFFINITY_SCORE &&
      a.usageCount === 0 &&
      indexByName.has(a.skillId)
    )
    .sort((a, b) => b.affinityScore - a.affinityScore)
    .slice(0, DISCOVERY_PARAMS.MAX_CANDIDATES)
    .map(a => {
      const entry = indexByName.get(a.skillId);
      return {
        skillId: a.skillId,
        affinityScore: a.affinityScore,
        name: entry.name,
        invocation: entry.invocation,
      };
    });

  return candidates;
}

/**
 * Build discovery candidates from file paths and write output.
 */
function buildDiscoveryFromPaths(affinityPath, indexPath, outputPath) {
  let affinity, index;
  try {
    affinity = JSON.parse(fs.readFileSync(affinityPath, 'utf8'));
  } catch {
    debugLog('FS_READ', 'No affinity file, skipping discovery', { affinityPath });
    writeJSON(outputPath, []);
    return [];
  }
  try {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
    debugLog('FS_READ', 'No index file, skipping discovery', { indexPath });
    writeJSON(outputPath, []);
    return [];
  }

  const result = findCandidates(affinity, index);
  writeJSON(outputPath, result);
  if (result.length > 0) {
    console.log(`  Discovery candidates: ${result.length} unused high-affinity skills`);
  }
  return result;
}

module.exports = { findCandidates, buildDiscoveryFromPaths };
