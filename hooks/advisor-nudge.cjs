#!/usr/bin/env node
// advisor-nudge.cjs — UserPromptSubmit shim. I/O only; logic lives in lib/advisor-nudge-core.js.
// Ephemeral process, no async, no in-memory cache, <50ms warm.
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { debugLog } = require(path.resolve(__dirname, '..', 'lib', 'errors'));
const { THRESHOLDS: TH } = require('../lib/constants');
const { tokenize, STOPWORDS } = require('../lib/text');
const { runNudge, scoreEntry, NAME_WEIGHT, DESC_WEIGHT } = require('../lib/advisor-nudge-core');

const HOME = os.homedir() || process.env.HOME || process.env.USERPROFILE || '/tmp';
const ADVISOR_CACHE = path.join(HOME, '.claude', 'advisor', 'cache');
const PROMPT_LENGTH_THRESHOLD = 5;
const LIB_DIR = path.resolve(__dirname, '..', 'lib');

const safe = (fn, tag, msg) => { try { return fn(); } catch (err) { debugLog(tag, msg, { cause: err.message }); return null; } };
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

function getIndexLitePath() {
  const pluginLib = path.join(LIB_DIR, 'advisor-index-lite.json');
  try { fs.accessSync(pluginLib, fs.constants.R_OK); return pluginLib; } catch (err) {
    debugLog('FS_READ', 'accessSync failed for plugin lib path', { path: pluginLib, cause: err.message });
    return safe(() => require(path.join(LIB_DIR, 'paths')).getIndexPath('lite'), 'MODULE_LOAD', 'Failed to load paths module') || pluginLib;
  }
}

function readPromptSync() {
  const envPrompt = process.env.CLAUDE_USER_PROMPT;
  if (envPrompt !== undefined && envPrompt !== '') return envPrompt;
  try {
    const trimmed = (fs.readFileSync(0, 'utf8') || '').trim();
    if (!trimmed || !trimmed.startsWith('{')) return trimmed;
    try { const d = JSON.parse(trimmed); return typeof d.prompt === 'string' ? d.prompt : ''; }
    catch (err) { debugLog('PARSE_JSON', 'Stdin JSON parse failed, falling back to raw', { cause: err.message }); return trimmed; }
  } catch (err) { debugLog('FS_READ', 'Stdin unavailable', { cause: err.message }); return ''; }
}

function isEnabled() {
  const flag = (process.env.ADVISOR_ENABLED || '').toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  const cfg = readJson(path.join(LIB_DIR, 'advisor-config.json'));
  if (!cfg) debugLog('FS_READ', 'Config file missing or malformed — hook disabled');
  return cfg ? cfg.enabled === true : false;
}

const loadEmbeddings = () => safe(() => { const s = require(path.join(LIB_DIR, 'semantic')); return s.loadEmbeddings(LIB_DIR) ? s : null; }, 'MODULE_LOAD', 'Semantic module not available');

const loadGraph = () => safe(() => {
  const g = require(path.join(LIB_DIR, 'graph-search'));
  const data = g.loadGraph(path.resolve(__dirname, '..', 'vault-graph'));
  return { search: (tokens, n) => g.graphSearch(tokens, data, n) };
}, 'MODULE_LOAD', 'Graph search module not available');

function resolveScoreThreshold() {
  try {
    const { resolveEffectiveThreshold } = require('../lib/threshold-config');
    const envNum = process.env.ADVISOR_THRESHOLD ? parseFloat(process.env.ADVISOR_THRESHOLD) : undefined;
    return resolveEffectiveThreshold({ envValue: envNum, defaultValue: TH.DEFAULT_SCORE });
  } catch { return TH.DEFAULT_SCORE; }
}

function main(promptOverride) {
  if (!isEnabled()) return;
  const result = runNudge({
    prompt: typeof promptOverride === 'string' ? promptOverride : readPromptSync(),
    indexLitePath: getIndexLitePath(),
    embeddingsLoader: loadEmbeddings,
    graphLoader: loadGraph,
    hookDataLoader: () => readJson(path.join(ADVISOR_CACHE, 'advisor-hook-data.json')),
    discoveryStateLoader: () => readJson(path.join(ADVISOR_CACHE, 'advisor-discovery-seen.json')) || {},
    threshold: PROMPT_LENGTH_THRESHOLD,
    scoreThreshold: resolveScoreThreshold(),
    env: { ADVISOR_BRANCH: process.env.ADVISOR_BRANCH || '' },
    now: Date.now,
  });
  for (const line of result.output) console.log(line);
}

if (require.main === module) main();

module.exports = { tokenize, scoreEntry, readPromptSync, STOPWORDS, NAME_WEIGHT, DESC_WEIGHT };
