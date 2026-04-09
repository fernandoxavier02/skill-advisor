'use strict';

const fs = require('fs');
const { writeJSON } = require('./jsonl');
const { debugLog } = require('./errors');

/**
 * Build replay candidates: one per unique first-skill, picking most recent.
 * When multiple combos share the same first skill, the most recent (by lastSeen) wins.
 *
 * Returns: [{sequence, count, lastSeen}]
 */
function buildReplayCandidates(combos) {
  if (!Array.isArray(combos) || combos.length === 0) return [];

  // Group by first skill in sequence, keep most recent
  const byFirst = new Map();
  for (const combo of combos) {
    if (!Array.isArray(combo.sequence) || combo.sequence.length < 2) continue;
    const firstSkill = combo.sequence[0];

    if (!byFirst.has(firstSkill) || combo.lastSeen > byFirst.get(firstSkill).lastSeen) {
      byFirst.set(firstSkill, combo);
    }
  }

  return Array.from(byFirst.values()).map(c => ({
    sequence: c.sequence,
    count: c.count,
    lastSeen: c.lastSeen,
  }));
}

/**
 * Build replay candidates from combos file and write output.
 */
function buildReplayFromPath(combosPath, outputPath) {
  let combos;
  try {
    combos = JSON.parse(fs.readFileSync(combosPath, 'utf8'));
  } catch {
    debugLog('FS_READ', 'No combos file, skipping replay', { combosPath });
    writeJSON(outputPath, []);
    return [];
  }

  const result = buildReplayCandidates(combos);
  writeJSON(outputPath, result);
  if (result.length > 0) {
    console.log(`  Replay candidates: ${result.length} replayable sequences`);
  }
  return result;
}

module.exports = { buildReplayCandidates, buildReplayFromPath };
