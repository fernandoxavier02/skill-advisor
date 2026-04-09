'use strict';

const { readJSONL, writeJSON } = require('./jsonl');
const { COMBO_PARAMS } = require('./constants');
const { debugLog } = require('./errors');

/**
 * Extract recurring skill sequences from telemetry.
 * Groups by executed_actual sequence (exact match).
 * Only includes sequences with count >= MIN_OCCURRENCE_COUNT and length >= 2.
 *
 * Returns: [{sequence: [skillId], count, lastSeen}]
 */
function extractCombos(telemetryPath) {
  const { data: telemetry } = readJSONL(telemetryPath);
  if (telemetry.length === 0) return [];

  // Count occurrences of each unique sequence
  const seqMap = new Map(); // serialized sequence → {sequence, count, lastSeen}

  for (const entry of telemetry) {
    if (entry.action === 'cancelled') continue;
    const seq = Array.isArray(entry.executed_actual) ? entry.executed_actual : [];
    if (seq.length < 2) continue; // single-skill not a combo

    const key = JSON.stringify(seq);
    if (!seqMap.has(key)) {
      seqMap.set(key, { sequence: seq, count: 0, lastSeen: '' });
    }
    const acc = seqMap.get(key);
    acc.count++;
    if (entry.ts && entry.ts > acc.lastSeen) acc.lastSeen = entry.ts;
  }

  // Filter by min occurrence and sort by count descending
  const result = Array.from(seqMap.values())
    .filter(c => c.count >= COMBO_PARAMS.MIN_OCCURRENCE_COUNT)
    .sort((a, b) => b.count - a.count);

  return result;
}

/**
 * Build combos from telemetry file and write output.
 */
function buildCombosFromPath(telemetryPath, outputPath) {
  const result = extractCombos(telemetryPath);
  writeJSON(outputPath, result);
  if (result.length > 0) {
    console.log(`  Combo discovery: ${result.length} recurring sequences found`);
  }
  return result;
}

module.exports = { extractCombos, buildCombosFromPath };
