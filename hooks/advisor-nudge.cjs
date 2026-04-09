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
const os = require('os');
const { debugLog } = require(path.resolve(__dirname, '..', 'lib', 'errors'));
const { SEARCH_WEIGHTS: SW, THRESHOLDS: TH, FUSION_WEIGHTS: FW, DISCOVERY_PARAMS } = require('../lib/constants');
const { tokenize, STOPWORDS, SYNONYMS } = require('../lib/text');

// ── V2 paths (D1/D2) ────────────────────────────────────────────
const HOME = os.homedir() || process.env.HOME || process.env.USERPROFILE || '/tmp';
const ADVISOR_CACHE = path.join(HOME, '.claude', 'advisor', 'cache');

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

let graphMod = null;
try {
  graphMod = require(path.resolve(__dirname, '..', 'lib', 'graph-search'));
} catch (err) {
  debugLog('MODULE_LOAD', 'Graph search module not available', { cause: err.message });
}

let contextMod = null;
try {
  contextMod = require(path.resolve(__dirname, '..', 'lib', 'context'));
} catch (err) {
  debugLog('MODULE_LOAD', 'Context module not available', { cause: err.message });
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

  // ── Signal Fusion (F0): combine semantic + keyword + graph ───
  const libDir = path.resolve(__dirname, '..', 'lib');
  const indexById = new Map(index.map(e => [e.id, e]));

  // Collect per-skill scores from each signal layer
  const semanticScores = new Map(); // id → score
  const keywordScores = new Map();
  const graphScores = new Map();

  // Layer 1: Semantic search (pre-computed embeddings)
  if (semantic) {
    const loaded = semantic.loadEmbeddings(libDir);
    if (loaded && semantic.isReady()) {
      const results = semantic.semanticSearch(promptTokens, SW.MAX_SEMANTIC_RESULTS);
      for (const r of results) {
        if (indexById.has(r.id)) semanticScores.set(r.id, r.score);
      }
    }
  }

  // Layer 2: Keyword matching (always available, cap at 20 to limit iteration)
  let kwCount = 0;
  for (const entry of index) {
    const score = scoreEntry(promptTokens, entry);
    if (score >= THRESHOLD) {
      keywordScores.set(entry.id, score);
      if (++kwCount >= 20) break;
    }
  }

  // Layer 3: Graph search (optional — only if vault graph loaded)
  // Graph node IDs use "skill:" prefix while index uses "global:", "project:", etc.
  // Build a reverse lookup: bare name → index id
  const nameToIndexId = new Map();
  for (const [id] of indexById) {
    const colonIdx = id.indexOf(':');
    if (colonIdx >= 0) nameToIndexId.set(id.slice(colonIdx + 1), id);
  }

  if (graphMod) {
    try {
      const graphDir = path.resolve(__dirname, '..', 'vault-graph');
      const graph = graphMod.loadGraph(graphDir);
      const results = graphMod.graphSearch(promptTokens, graph, SW.MAX_SEMANTIC_RESULTS);
      for (const r of results) {
        if (!r.nodeId.startsWith('skill:')) continue;
        const bareName = r.nodeId.slice(6); // strip "skill:" prefix
        const indexId = nameToIndexId.get(bareName);
        if (indexId) {
          // Clamp to 1.0 — graph scores can exceed 1.0 with convergence+category boosts
          graphScores.set(indexId, Math.min(r.score, 1.0));
        }
      }
    } catch (err) {
      debugLog('GRAPH_LOAD', 'Graph not available for fusion', { cause: err.message });
    }
  }

  // Fuse scores: weighted average of available signals
  const allIds = new Set([...semanticScores.keys(), ...keywordScores.keys(), ...graphScores.keys()]);
  let scored = [];

  for (const id of allIds) {
    const entry = indexById.get(id);
    if (!entry) continue;

    const sem = semanticScores.get(id) || 0;
    const kw = keywordScores.get(id) || 0;
    const gr = graphScores.get(id) || 0;

    // Weighted average with only non-zero signals contributing
    let totalWeight = 0;
    let totalScore = 0;
    if (sem > 0) { totalScore += sem * FW.SEMANTIC; totalWeight += FW.SEMANTIC; }
    if (kw > 0) { totalScore += kw * FW.KEYWORD; totalWeight += FW.KEYWORD; }
    if (gr > 0) { totalScore += gr * FW.GRAPH; totalWeight += FW.GRAPH; }

    const fusedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    if (fusedScore >= THRESHOLD) {
      scored.push({ ...entry, score: fusedScore });
    }
  }

  if (scored.length === 0) return;

  // ── V2: Load hook-data bundle (D3) ──────────────────────────────
  let hookData = null;
  try {
    const bundlePath = path.join(ADVISOR_CACHE, 'advisor-hook-data.json');
    hookData = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  } catch {
    debugLog('FS_READ', 'Hook data bundle not found, v2 features disabled');
  }

  // ── V2: Affinity boost ──────────────────────────────────────────
  if (hookData && Array.isArray(hookData.affinity)) {
    const affinityMap = new Map();
    for (const a of hookData.affinity) {
      affinityMap.set(a.skillId, a.affinityScore);
    }
    // Strip namespace prefix from scored entries to match affinity skillIds
    for (const entry of scored) {
      const colonIdx = entry.id ? entry.id.indexOf(':') : -1;
      const bareName = colonIdx >= 0 ? entry.id.slice(colonIdx + 1) : entry.name;
      const affinity = affinityMap.get(bareName) || affinityMap.get(entry.name);
      if (affinity) {
        entry.score = Math.min(1.0, entry.score + affinity * 0.2); // +20% of affinity
      }
    }
  }

  // ── V2: Context boost (F2 — branch category) ───────────────────
  if (contextMod) {
    try {
      const branchName = process.env.ADVISOR_BRANCH || '';
      const branchCategory = contextMod.getBranchCategory(branchName);
      if (branchCategory) {
        for (const entry of scored) {
          if (entry.category === branchCategory) {
            entry.score = Math.min(1.0, entry.score + 0.1); // +10% category match
          }
        }
      }
    } catch (err) {
      debugLog('CONTEXT', 'Branch context boost failed', { cause: err.message });
    }
  }

  // Re-sort after boosts
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

  // ── V2: Discovery nudge (F1.4) ─────────────────────────────────
  // Hook is read-only (D4). lastNudgeTs is written by /advisor command.
  // Cooldown is approximate: nudge appears → user runs /advisor → command writes timestamp.
  if (hookData && Array.isArray(hookData.discovery) && hookData.discovery.length > 0) {
    try {
      const seenPath = path.join(ADVISOR_CACHE, 'advisor-discovery-seen.json');
      let seen = {};
      try { seen = JSON.parse(fs.readFileSync(seenPath, 'utf8')); } catch { /* first run — no seen file */ }

      const lastNudge = seen.lastNudgeTs ? new Date(seen.lastNudgeTs).getTime() : 0;
      if (Date.now() - lastNudge > DISCOVERY_PARAMS.NUDGE_COOLDOWN_MS) {
        const seenSkills = (seen.seen && typeof seen.seen === 'object') ? seen.seen : {};
        for (const candidate of hookData.discovery) {
          if (seenSkills[candidate.skillId]) continue;
          const inv = String(candidate.invocation || '').replace(/[^a-zA-Z0-9:/_-]/g, '').slice(0, 60);
          if (inv) {
            console.log(`[Advisor] Voce sabia? ${inv} tem alta relevancia mas nunca foi usado. Experimente!`);
          }
          break; // max 1 discovery nudge per invocation
        }
      }
    } catch (err) {
      debugLog('DISCOVERY', 'Discovery nudge failed', { cause: err.message });
    }
  }

  // ── V2: Replay hint (F3.2) ─────────────────────────────────────
  if (hookData && Array.isArray(hookData.replay) && hookData.replay.length > 0) {
    // Build set of bare names from top results for structured comparison
    const topBareNames = new Set(top.map(e => {
      const ci = e.id ? e.id.indexOf(':') : -1;
      return ci >= 0 ? e.id.slice(ci + 1) : e.name;
    }));

    for (const candidate of hookData.replay) {
      const firstSkill = candidate.sequence[0];
      if (topBareNames.has(firstSkill)) {
        const seqStr = candidate.sequence.join(' \u2192 ');
        console.log(`[Advisor] Pipeline anterior: ${seqStr} (usado ${candidate.count}x). Rode /advisor para replay.`);
        break;
      }
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { tokenize, scoreEntry, STOPWORDS, NAME_WEIGHT, DESC_WEIGHT };
