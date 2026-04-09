'use strict';

const fs = require('fs');
const path = require('path');
const { writeJSON } = require('./jsonl');
const { debugLog } = require('./errors');

/**
 * Merge affinity + discovery + replay into a single advisor-hook-data.json.
 * The hook reads this one file instead of 3 separate files (D3).
 *
 * Input: cacheDir with individual JSON files.
 * Output: {affinity: [...], discovery: [...], replay: [...]}
 */
function buildHookData(cacheDir, outputPath) {
  function readOrEmpty(filename) {
    try {
      return JSON.parse(fs.readFileSync(path.join(cacheDir, filename), 'utf8'));
    } catch {
      debugLog('FS_READ', `Missing ${filename}, using empty array`, { cacheDir });
      return [];
    }
  }

  const bundle = {
    affinity: readOrEmpty('advisor-affinity.json'),
    discovery: readOrEmpty('advisor-discovery.json'),
    replay: readOrEmpty('advisor-replay-candidate.json'),
  };

  writeJSON(outputPath, bundle);
  console.log(`  Hook data bundle: affinity=${bundle.affinity.length}, discovery=${bundle.discovery.length}, replay=${bundle.replay.length}`);
  return bundle;
}

module.exports = { buildHookData };
