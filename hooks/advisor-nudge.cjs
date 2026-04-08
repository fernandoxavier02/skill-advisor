#!/usr/bin/env node
/**
 * advisor-nudge.cjs — Lightweight UserPromptSubmit hook.
 *
 * Reads the lite index from disk, keyword-matches against the user prompt,
 * and writes a 1-line nudge to stdout if confidence is above threshold.
 *
 * Constraints:
 *   - Ephemeral process (no in-memory cache)
 *   - Must complete in <50ms on Windows
 *   - Reads advisor-index-lite.json (<100KB)
 *   - Pure Node.js, no LLM calls, no network
 */

const fs = require('fs');
const path = require('path');
const { debugLog } = require(path.resolve(__dirname, '..', 'lib', 'errors'));
const { SEARCH_WEIGHTS: SW, THRESHOLDS: TH } = require('../lib/constants');
const { tokenize, STOPWORDS, SYNONYMS } = require('../lib/text');

// ── Config ───────────────────────────────────────────────────────

const NAME_WEIGHT = SW.NAME_WEIGHT;
const DESC_WEIGHT = SW.DESC_WEIGHT;

const rawThreshold = parseFloat(process.env.ADVISOR_THRESHOLD || String(TH.DEFAULT_SCORE));
const THRESHOLD = Number.isFinite(rawThreshold) && rawThreshold >= 0 && rawThreshold <= 1 ? rawThreshold : TH.DEFAULT_SCORE;
const ENABLED = (process.env.ADVISOR_ENABLED || '').toLowerCase();
const STALENESS_DAYS = TH.STALENESS_DAYS;

// ── Path resolution ──────────────────────────────────────────────

function getIndexLitePath() {
  const pluginLib = path.resolve(__dirname, '..', 'lib', 'advisor-index-lite.json');
  try {
    fs.accessSync(pluginLib, fs.constants.R_OK);
    return pluginLib;
  } catch (err) {
    debugLog('FS_READ', 'accessSync failed for plugin lib path', { path: pluginLib, cause: err.message });
    try {
      const { getIndexPath } = require(path.resolve(__dirname, '..', 'lib', 'paths'));
      return getIndexPath('lite');
    } catch (err2) {
      debugLog('MODULE_LOAD', 'Failed to load paths module', { cause: err2.message });
      return pluginLib;
    }
  }
}

// ── Scoring ──────────────────────────────────────────────────────

function scoreEntry(promptTokens, entry) {
  if (promptTokens.length === 0) return 0;
  const descTokens = entry.description ? new Set(tokenize(entry.description)) : new Set();
  const nameTokens = new Set(tokenize(entry.name));

  let matches = 0;
  const total = promptTokens.length;

  for (const token of promptTokens) {
    if (nameTokens.has(token)) matches += NAME_WEIGHT;
    else if (descTokens.has(token)) matches += DESC_WEIGHT;
  }

  return total > 0 ? matches / (total * NAME_WEIGHT) : 0;
}

// ── Semantic search (pre-computed embeddings) ────────────────────

let semantic = null;
try {
  semantic = require(path.resolve(__dirname, '..', 'lib', 'semantic'));
} catch (err) {
  debugLog('MODULE_LOAD', 'Semantic module not available', { cause: err.message });
}

// ── Main ─────────────────────────────────────────────────────────

function main() {
  // Env var override: explicit true/false takes precedence
  if (ENABLED === 'false') return;
  if (ENABLED !== 'true') {
    // No env override — read config file (disabled by default)
    try {
      const configPath = path.resolve(__dirname, '..', 'lib', 'advisor-config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.enabled !== true) return;
    } catch (err) {
      debugLog('FS_READ', 'Config file missing or malformed — hook disabled', { cause: err.message });
      return; // missing or malformed config = disabled
    }
  }

  const prompt = process.env.CLAUDE_USER_PROMPT || '';
  if (prompt.trim().startsWith('/')) return;
  if (prompt.trim().length < 5) return;

  const indexPath = getIndexLitePath();

  // Two FS calls: stat first (mtime), then read. Minimizes TOCTOU window.
  let raw, mtimeMs;
  try {
    mtimeMs = fs.statSync(indexPath).mtimeMs;
    raw = fs.readFileSync(indexPath, 'utf8');
  } catch {
    console.log('[Advisor] Index nao encontrado. Rode /advisor-index para criar.');
    return;
  }

  // Check staleness
  const ageDays = (Date.now() - mtimeMs) / (1000 * 60 * 60 * 24);
  if (ageDays > STALENESS_DAYS) {
    console.log(`[Advisor] Index desatualizado (${Math.floor(ageDays)}d). Rode /advisor-index para atualizar.`);
    return;
  }

  // Parse index
  let index;
  try {
    index = JSON.parse(raw);
  } catch {
    console.log('[Advisor] Index corrompido. Rode /advisor-index para regenerar.');
    return;
  }

  if (!Array.isArray(index) || index.length === 0) return;

  const promptTokens = tokenize(prompt);
  if (promptTokens.length === 0) return;

  // Try semantic search first (pre-computed embeddings, ~15ms)
  const libDir = path.resolve(__dirname, '..', 'lib');
  let scored = [];

  if (semantic) {
    const loaded = semantic.loadEmbeddings(libDir);
    if (loaded && semantic.isReady()) {
      const results = semantic.semanticSearch(promptTokens, SW.MAX_SEMANTIC_RESULTS);
      // Map semantic results back to index entries
      const indexById = new Map(index.map(e => [e.id, e]));
      scored = results
        .map(r => {
          const entry = indexById.get(r.id);
          return entry ? { ...entry, score: r.score } : null;
        })
        .filter(Boolean);
    }
  }

  // Fallback to keyword matching if semantic didn't produce results
  if (scored.length === 0) {
    for (const entry of index) {
      const score = scoreEntry(promptTokens, entry);
      if (score >= THRESHOLD) {
        scored.push({ ...entry, score });
        if (scored.length >= 10) break;
      }
    }
  }

  if (scored.length === 0) return;

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, SW.MAX_DISPLAY_RESULTS);

  // Sanitize output: allowlist for invocation field (prevents prompt injection from third-party plugins)
  const matches = top
    .map(e => {
      const raw = String(e.invocation || '');
      const inv = raw.replace(/[^a-zA-Z0-9:/_-]/g, '').slice(0, 60);
      if (!inv) return null;
      return `${inv} (${(e.score * 100).toFixed(0)}%)`;
    })
    .filter(Boolean)
    .join(', ');

  console.log(`[Advisor] Considere /advisor — detectei relevancia com: ${matches}`);
}

if (require.main === module) {
  main();
}

module.exports = { tokenize, scoreEntry, STOPWORDS, NAME_WEIGHT, DESC_WEIGHT };
