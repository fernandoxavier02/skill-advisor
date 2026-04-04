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

// ── Config ───────────────────────────────────────────────────────

const NAME_WEIGHT = 3;
const DESC_WEIGHT = 2;

const rawThreshold = parseFloat(process.env.ADVISOR_THRESHOLD || '0.35');
const THRESHOLD = Number.isFinite(rawThreshold) && rawThreshold >= 0 && rawThreshold <= 1 ? rawThreshold : 0.35;
const ENABLED = (process.env.ADVISOR_ENABLED || 'true').toLowerCase() !== 'false';
const STALENESS_DAYS = 7;

// ── Path resolution ──────────────────────────────────────────────

function getIndexLitePath() {
  const pluginLib = path.resolve(__dirname, '..', 'lib', 'advisor-index-lite.json');
  try {
    fs.accessSync(pluginLib, fs.constants.R_OK);
    return pluginLib;
  } catch {
    try {
      const { getIndexPath } = require(path.resolve(__dirname, '..', 'lib', 'paths'));
      return getIndexPath('lite');
    } catch {
      return pluginLib;
    }
  }
}

// ── Stopwords (PT-BR + EN) ───────────────────────────────────────

const STOPWORDS = new Set([
  'a', 'o', 'e', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'no', 'na',
  'que', 'se', 'por', 'ao', 'os', 'as', 'dos', 'das', 'eu', 'me', 'meu', 'minha',
  'the', 'an', 'is', 'it', 'to', 'in', 'of', 'and', 'or', 'for', 'on', 'at',
  'i', 'my', 'we', 'you', 'this', 'that', 'with', 'be', 'have', 'do', 'can',
  'esse', 'essa', 'este', 'esta', 'isso', 'aqui', 'como', 'mais', 'muito', 'tem',
  'ser', 'ter', 'fazer', 'vai', 'vou', 'quero', 'preciso', 'pode', 'favor',
]);

// ── Tokenizer ────────────────────────────────────────────────────

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/) // split on spaces AND hyphens
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
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

// ── Main ─────────────────────────────────────────────────────────

function main() {
  if (!ENABLED) return;

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
    return; // corrupt JSON — silent exit
  }

  if (!Array.isArray(index) || index.length === 0) return;

  const promptTokens = tokenize(prompt);
  if (promptTokens.length === 0) return;

  // Score entries with early exit after finding 3 above threshold
  const scored = [];
  for (const entry of index) {
    const score = scoreEntry(promptTokens, entry);
    if (score >= THRESHOLD) {
      scored.push({ ...entry, score });
      if (scored.length >= 10) break; // enough candidates
    }
  }

  if (scored.length === 0) return;

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  // Sanitize output (strip ANSI/control chars from entry data)
  const matches = top
    .map(e => {
      const inv = String(e.invocation || '').replace(/[\x00-\x1f\x1b]/g, '');
      return `${inv} (${(e.score * 100).toFixed(0)}%)`;
    })
    .join(', ');

  console.log(`[Advisor] Considere /advisor — detectei relevancia com: ${matches}`);
}

if (require.main === module) {
  main();
}

module.exports = { tokenize, scoreEntry, STOPWORDS, NAME_WEIGHT, DESC_WEIGHT };
