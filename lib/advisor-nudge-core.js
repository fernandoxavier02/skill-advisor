'use strict';

/**
 * advisor-nudge-core.js — Pure scoring/fusion/discovery/replay logic.
 *
 * Slice 2.2 (Task 3.3) extraction from `hooks/advisor-nudge.cjs`.
 *
 * Architectural invariant (DI-2): this module imports ONLY from utils/domain
 * (constants, text, errors). No builder imports. The dependency-edge guard
 * (`tests/dependency-edges.test.js`) enforces this.
 *
 * I/O surface: `fs.readFileSync`/`fs.statSync` against `indexLitePath` only.
 * Every other side-effecting concern (embeddings load, graph load, hook-data
 * bundle, discovery-seen state, branch context, current time) is delegated
 * to a caller-supplied loader/getter so tests can inject deterministic stubs.
 *
 * Contract:
 *   runNudge(opts) => SuggestionResult
 *
 *   opts.prompt                — string (already extracted from stdin)
 *   opts.indexLitePath         — absolute path to lite index JSON
 *   opts.embeddingsLoader      — () => {semanticSearch, isReady} | null
 *   opts.graphLoader           — () => {search(tokens, n) => results} | null
 *   opts.hookDataLoader        — () => HookDataBundle | null
 *   opts.discoveryStateLoader  — () => SeenState | {}
 *   opts.threshold             — number, prompt-length early-exit gate
 *                                (Slice 2.3 will plumb env override here)
 *   opts.env                   — { ADVISOR_BRANCH?: string }
 *   opts.now                   — () => epoch-ms (injectable for determinism)
 *   opts.contextMod            — optional ./context override (default: real)
 *   opts.scoreThreshold        — optional fusion-score cutoff (default 0.20)
 *
 *   SuggestionResult {
 *     earlyExit: boolean,      — true if no suggestions to emit
 *     output: string[],        — ordered stdout lines for the shim
 *     scored: Entry[],         — fused+boosted candidates above scoreThreshold
 *     top: Entry[],            — top SW.MAX_DISPLAY_RESULTS slice of scored
 *   }
 *
 * Sanitization regex on `invocation` is preserved bit-for-bit from the
 * pre-refactor hook (allowlist `/[^a-zA-Z0-9:/_-]/g`, slice 60).
 */

const fs = require('fs');
const {
  SEARCH_WEIGHTS: SW,
  THRESHOLDS: TH,
  FUSION_WEIGHTS: FW,
  DISCOVERY_PARAMS,
} = require('./constants');
const { tokenize } = require('./text');
const { debugLog } = require('./errors');

const NAME_WEIGHT = SW.NAME_WEIGHT;
const DESC_WEIGHT = SW.DESC_WEIGHT;
const STALENESS_DAYS = TH.STALENESS_DAYS;
const DEFAULT_SCORE_THRESHOLD = TH.DEFAULT_SCORE;

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

function emptyResult(extra = {}) {
  return { earlyExit: false, output: [], scored: [], top: [], ...extra };
}

function runNudge(opts) {
  const o = opts || {};
  const prompt = o.prompt;
  const indexLitePath = o.indexLitePath;
  const embeddingsLoader = typeof o.embeddingsLoader === 'function' ? o.embeddingsLoader : () => null;
  const graphLoader = typeof o.graphLoader === 'function' ? o.graphLoader : () => null;
  const hookDataLoader = typeof o.hookDataLoader === 'function' ? o.hookDataLoader : () => null;
  const discoveryStateLoader = typeof o.discoveryStateLoader === 'function' ? o.discoveryStateLoader : () => ({});
  const threshold = typeof o.threshold === 'number' ? o.threshold : 5;
  const env = o.env || {};
  const now = typeof o.now === 'function' ? o.now : () => Date.now();
  const contextMod = o.contextMod !== undefined ? o.contextMod : null;
  const scoreThreshold = typeof o.scoreThreshold === 'number' ? o.scoreThreshold : DEFAULT_SCORE_THRESHOLD;

  // ── Early-exit gates (no I/O, no loader invocation) ─────────────
  if (typeof prompt !== 'string') return emptyResult({ earlyExit: true });
  const trimmed = prompt.trim();
  if (trimmed.startsWith('/')) return emptyResult({ earlyExit: true });
  if (trimmed.length < threshold) return emptyResult({ earlyExit: true });

  // ── Index read + staleness + parse (only FS the core touches) ──
  let raw, mtimeMs;
  try {
    mtimeMs = fs.statSync(indexLitePath).mtimeMs;
    raw = fs.readFileSync(indexLitePath, 'utf8');
  } catch {
    return emptyResult({
      earlyExit: true,
      output: ['[Advisor] Index nao encontrado. Rode /advisor-index para criar.'],
    });
  }

  const ageDays = (now() - mtimeMs) / (1000 * 60 * 60 * 24);
  if (ageDays > STALENESS_DAYS) {
    return emptyResult({
      earlyExit: true,
      output: [`[Advisor] Index desatualizado (${Math.floor(ageDays)}d). Rode /advisor-index para atualizar.`],
    });
  }

  let index;
  try {
    index = JSON.parse(raw);
  } catch {
    return emptyResult({
      earlyExit: true,
      output: ['[Advisor] Index corrompido. Rode /advisor-index para regenerar.'],
    });
  }

  if (!Array.isArray(index) || index.length === 0) return emptyResult();

  const promptTokens = tokenize(prompt);
  if (promptTokens.length === 0) return emptyResult();

  // ── Signal Fusion ───────────────────────────────────────────────
  const indexById = new Map(index.map(e => [e.id, e]));
  const semanticScores = new Map();
  const keywordScores = new Map();
  const graphScores = new Map();

  // Layer 1 — semantic
  const semantic = embeddingsLoader();
  if (semantic && typeof semantic.semanticSearch === 'function') {
    const ready = typeof semantic.isReady !== 'function' || semantic.isReady();
    if (ready) {
      const results = semantic.semanticSearch(promptTokens, SW.MAX_SEMANTIC_RESULTS) || [];
      for (const r of results) {
        if (r && indexById.has(r.id)) semanticScores.set(r.id, r.score);
      }
    }
  }

  // Layer 2 — keyword (cap at 20 to bound iteration)
  let kwCount = 0;
  for (const entry of index) {
    const score = scoreEntry(promptTokens, entry);
    if (score >= scoreThreshold) {
      keywordScores.set(entry.id, score);
      if (++kwCount >= 20) break;
    }
  }

  // Layer 3 — graph (skill: prefix → bare name → index id)
  const nameToIndexId = new Map();
  for (const [id] of indexById) {
    const colonIdx = id.indexOf(':');
    if (colonIdx >= 0) nameToIndexId.set(id.slice(colonIdx + 1), id);
  }
  const graph = graphLoader();
  if (graph && typeof graph.search === 'function') {
    try {
      const results = graph.search(promptTokens, SW.MAX_SEMANTIC_RESULTS) || [];
      for (const r of results) {
        if (!r || !r.nodeId || !r.nodeId.startsWith('skill:')) continue;
        const bareName = r.nodeId.slice(6);
        const indexId = nameToIndexId.get(bareName);
        if (indexId) graphScores.set(indexId, Math.min(r.score, 1.0));
      }
    } catch (err) {
      debugLog('GRAPH_LOAD', 'Graph not available for fusion', { cause: err.message });
    }
  }

  // Fuse — weighted average of available signals only
  const allIds = new Set([...semanticScores.keys(), ...keywordScores.keys(), ...graphScores.keys()]);
  const scored = [];
  for (const id of allIds) {
    const entry = indexById.get(id);
    if (!entry) continue;
    const sem = semanticScores.get(id) || 0;
    const kw = keywordScores.get(id) || 0;
    const gr = graphScores.get(id) || 0;

    let totalWeight = 0;
    let totalScore = 0;
    if (sem > 0) { totalScore += sem * FW.SEMANTIC; totalWeight += FW.SEMANTIC; }
    if (kw > 0) { totalScore += kw * FW.KEYWORD; totalWeight += FW.KEYWORD; }
    if (gr > 0) { totalScore += gr * FW.GRAPH; totalWeight += FW.GRAPH; }

    const fusedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    if (fusedScore >= scoreThreshold) scored.push({ ...entry, score: fusedScore });
  }

  if (scored.length === 0) return emptyResult();

  // ── V2: hook-data driven boosts and nudges ─────────────────────
  const hookData = hookDataLoader();

  // Affinity boost (+20% of affinity score)
  if (hookData && Array.isArray(hookData.affinity)) {
    const affinityMap = new Map();
    for (const a of hookData.affinity) affinityMap.set(a.skillId, a.affinityScore);
    for (const entry of scored) {
      const colonIdx = entry.id ? entry.id.indexOf(':') : -1;
      const bareName = colonIdx >= 0 ? entry.id.slice(colonIdx + 1) : entry.name;
      const affinity = affinityMap.get(bareName) || affinityMap.get(entry.name);
      if (affinity) entry.score = Math.min(1.0, entry.score + affinity * 0.2);
    }
  }

  // Branch-context boost (+10% category match)
  let ctx = contextMod;
  if (ctx === null) {
    try { ctx = require('./context'); } catch { ctx = undefined; }
  }
  if (ctx && typeof ctx.getBranchCategory === 'function') {
    try {
      const branchName = env.ADVISOR_BRANCH || '';
      const branchCategory = ctx.getBranchCategory(branchName);
      if (branchCategory) {
        for (const entry of scored) {
          if (entry.category === branchCategory) entry.score = Math.min(1.0, entry.score + 0.1);
        }
      }
    } catch (err) {
      debugLog('CONTEXT', 'Branch context boost failed', { cause: err.message });
    }
  }

  // Re-sort after boosts
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, SW.MAX_DISPLAY_RESULTS);

  const output = [];

  // Sanitization — preserved bit-for-bit (allowlist a-zA-Z0-9:/_-, cap 60)
  const matches = top
    .map(e => {
      const raw = String(e.invocation || '');
      const inv = raw.replace(/[^a-zA-Z0-9:/_-]/g, '').slice(0, 60);
      if (!inv) return null;
      return `${inv} (${(e.score * 100).toFixed(0)}%)`;
    })
    .filter(Boolean)
    .join(', ');

  output.push(`[Advisor] Considere /advisor — detectei relevancia com: ${matches}`);

  // Discovery nudge (cooldown via injected discoveryStateLoader + now)
  if (hookData && Array.isArray(hookData.discovery) && hookData.discovery.length > 0) {
    try {
      const seen = discoveryStateLoader() || {};
      const lastNudge = seen.lastNudgeTs ? new Date(seen.lastNudgeTs).getTime() : 0;
      if (now() - lastNudge > DISCOVERY_PARAMS.NUDGE_COOLDOWN_MS) {
        const seenSkills = (seen.seen && typeof seen.seen === 'object') ? seen.seen : {};
        for (const candidate of hookData.discovery) {
          if (seenSkills[candidate.skillId]) continue;
          const inv = String(candidate.invocation || '').replace(/[^a-zA-Z0-9:/_-]/g, '').slice(0, 60);
          if (inv) {
            output.push(`[Advisor] Voce sabia? ${inv} tem alta relevancia mas nunca foi usado. Experimente!`);
          }
          break; // max 1 discovery nudge per invocation
        }
      }
    } catch (err) {
      debugLog('DISCOVERY', 'Discovery nudge failed', { cause: err.message });
    }
  }

  // Replay hint
  if (hookData && Array.isArray(hookData.replay) && hookData.replay.length > 0) {
    const topBareNames = new Set(top.map(e => {
      const ci = e.id ? e.id.indexOf(':') : -1;
      return ci >= 0 ? e.id.slice(ci + 1) : e.name;
    }));
    for (const candidate of hookData.replay) {
      if (!candidate || !Array.isArray(candidate.sequence) || candidate.sequence.length === 0) continue;
      const firstSkill = candidate.sequence[0];
      if (topBareNames.has(firstSkill)) {
        const seqStr = candidate.sequence.join(' → ');
        output.push(`[Advisor] Pipeline anterior: ${seqStr} (usado ${candidate.count}x). Rode /advisor para replay.`);
        break;
      }
    }
  }

  return { earlyExit: false, output, scored, top };
}

module.exports = {
  runNudge,
  scoreEntry,
  // Exported for tests that want to assert the same constants the core uses
  NAME_WEIGHT,
  DESC_WEIGHT,
  DEFAULT_SCORE_THRESHOLD,
};
