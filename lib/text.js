'use strict';

/**
 * text.js — Shared text processing utilities for Skill Advisor.
 *
 * Exports:
 *   normalizeAccents(s)  — NFD decompose + strip combining marks + lowercase + trim
 *   STOPWORDS             — Set of 54 PT-BR + EN stopwords
 *   SYNONYMS              — Map of 50+ PT-BR → EN[] translation pairs
 *   tokenize(text)        — Full tokenization pipeline
 */

// ── Accent normalization ──────────────────────────────────────────

function normalizeAccents(s) {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// ── Stopwords (PT-BR + EN) ────────────────────────────────────────

const STOPWORDS = new Set([
  'a', 'o', 'e', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'no', 'na',
  'que', 'se', 'por', 'ao', 'os', 'as', 'dos', 'das', 'eu', 'me', 'meu', 'minha',
  'the', 'an', 'is', 'it', 'to', 'in', 'of', 'and', 'or', 'for', 'on', 'at',
  'i', 'my', 'we', 'you', 'this', 'that', 'with', 'be', 'have', 'do', 'can',
  'esse', 'essa', 'este', 'esta', 'isso', 'aqui', 'como', 'mais', 'muito', 'tem',
  'ser', 'ter', 'fazer', 'vai', 'vou', 'quero', 'preciso', 'pode', 'favor',
]);

// ── Synonym bridge (PT-BR → EN + domain terms) ──────────────────

const SYNONYMS = new Map([
  // PT-BR → EN direct translations
  ['auditar', ['audit', 'review']],
  ['auditoria', ['audit', 'review']],
  ['seguranca', ['security', 'safe']],
  ['revisar', ['review', 'audit']],
  ['revisao', ['review']],
  ['codigo', ['code']],
  ['corrigir', ['fix', 'debug']],
  ['correcao', ['fix', 'bug']],
  ['bug', ['bug', 'debug', 'fix']],
  ['erro', ['error', 'debug', 'bug']],
  ['investigar', ['investigate', 'debug']],
  ['depurar', ['debug', 'investigate']],
  ['depuracao', ['debug']],
  ['deploy', ['deploy', 'ship']],
  ['implantar', ['deploy', 'ship']],
  ['implantacao', ['deploy']],
  ['producao', ['production', 'deploy']],
  ['testar', ['test', 'qa']],
  ['teste', ['test', 'qa']],
  ['testes', ['test', 'qa']],
  ['qualidade', ['quality', 'review']],
  ['banco', ['database', 'db', 'sql']],
  ['dados', ['data', 'database']],
  ['documentar', ['document', 'docs']],
  ['documentacao', ['documentation', 'docs']],
  ['criar', ['create', 'build', 'scaffold']],
  ['construir', ['build', 'create']],
  ['feature', ['feature', 'implement']],
  ['funcionalidade', ['feature', 'implement']],
  ['planejar', ['plan', 'design']],
  ['design', ['design', 'plan']],
  ['arquitetura', ['architecture', 'design']],
  ['performance', ['performance', 'optimize']],
  ['otimizar', ['optimize', 'performance']],
  ['lento', ['slow', 'performance']],
  ['rapido', ['fast', 'performance']],
  ['frontend', ['frontend', 'ui', 'css', 'react']],
  ['backend', ['backend', 'api', 'server']],
  ['api', ['api', 'endpoint']],
  ['commit', ['commit', 'git']],
  ['push', ['push', 'ship', 'deploy']],
  ['pr', ['pr', 'pull', 'review']],
  ['merge', ['merge', 'ship']],
  ['skill', ['skill']],
  ['plugin', ['plugin']],
  ['mcp', ['mcp']],
  ['prompt', ['prompt']],
  ['refatorar', ['refactor', 'restructure', 'simplify', 'code']],
  ['refactoring', ['refactor', 'simplify']],
  ['refatoracao', ['refactor', 'simplify']],
  ['modulo', ['module', 'service', 'component']],
  ['simplificar', ['simplify', 'refactor']],
  ['limpar', ['clean', 'refactor', 'simplify']],
  ['migrar', ['migrate', 'migration']],
  ['migracao', ['migration']],
  ['login', ['auth', 'login', 'authentication']],
  ['autenticacao', ['auth', 'authentication']],
  ['dashboard', ['dashboard', 'ui', 'frontend']],
]);

// ── Tokenizer ────────────────────────────────────────────────────

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  const raw = text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));

  // Expand synonyms: each PT-BR token also adds its EN equivalents
  const expanded = [];
  for (const token of raw) {
    expanded.push(token);
    const syns = SYNONYMS.get(token);
    if (syns) {
      for (const s of syns) {
        if (!expanded.includes(s)) expanded.push(s);
      }
    }
  }
  return expanded;
}

module.exports = { normalizeAccents, STOPWORDS, SYNONYMS, tokenize };
