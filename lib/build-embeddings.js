#!/usr/bin/env node
/**
 * build-embeddings.js — Generates semantic embeddings for all skill descriptions
 * and a vocabulary of common words using a local transformer model.
 *
 * Outputs:
 *   - advisor-embeddings.json  (295 × 384 float vectors for skill descriptions)
 *   - advisor-vocab.json       (2000 × 384 float vectors for common words)
 *
 * Requires: @huggingface/transformers
 * Model: Xenova/all-MiniLM-L6-v2 (~23MB, downloaded on first run)
 * Runtime: ~2-5 min (one-time, at index build)
 */

const fs = require('fs');
const path = require('path');
const { getLibDir, getIndexPath } = require('./paths');
const { EMBEDDING } = require('./constants');

// Common words vocabulary (PT-BR + EN, domain-relevant for development)
const VOCAB_WORDS = [
  // PT-BR action verbs
  'auditar', 'revisar', 'corrigir', 'depurar', 'investigar', 'testar', 'deploy',
  'implantar', 'criar', 'construir', 'implementar', 'refatorar', 'otimizar',
  'documentar', 'planejar', 'arquitetar', 'migrar', 'configurar', 'monitorar',
  'analisar', 'validar', 'verificar', 'publicar', 'enviar', 'commitar',
  'mergear', 'proteger', 'escalar', 'simplificar', 'limpar', 'formatar',
  // PT-BR nouns
  'seguranca', 'codigo', 'bug', 'erro', 'feature', 'funcionalidade', 'banco',
  'dados', 'teste', 'qualidade', 'performance', 'arquitetura', 'design',
  'frontend', 'backend', 'api', 'login', 'autenticacao', 'dashboard',
  'componente', 'modulo', 'servico', 'rota', 'modelo', 'template',
  'plugin', 'skill', 'hook', 'mcp', 'prompt', 'documentacao', 'log',
  'producao', 'staging', 'desenvolvimento', 'ambiente', 'dependencia',
  'vulnerabilidade', 'ameaca', 'risco', 'compliance', 'auditoria',
  'integracao', 'pipeline', 'workflow', 'automacao', 'ci', 'cd',
  'container', 'docker', 'kubernetes', 'cloud', 'servidor', 'cliente',
  'usuario', 'interface', 'experiencia', 'acessibilidade', 'responsivo',
  'cache', 'memoria', 'disco', 'rede', 'latencia', 'timeout',
  'excecao', 'falha', 'crash', 'travando', 'lento', 'rapido', 'quebrado',
  // PT-BR adjectives/descriptors
  'lento', 'rapido', 'seguro', 'inseguro', 'complexo', 'simples',
  'critico', 'urgente', 'bloqueante', 'instavel', 'flaky',
  // EN action verbs
  'audit', 'review', 'fix', 'debug', 'investigate', 'test', 'deploy',
  'ship', 'create', 'build', 'implement', 'refactor', 'optimize',
  'document', 'plan', 'architect', 'migrate', 'configure', 'monitor',
  'analyze', 'validate', 'verify', 'publish', 'push', 'commit',
  'merge', 'secure', 'scale', 'simplify', 'clean', 'format', 'scaffold',
  // EN nouns
  'security', 'code', 'bug', 'error', 'feature', 'functionality', 'database',
  'data', 'test', 'quality', 'performance', 'architecture', 'design',
  'frontend', 'backend', 'api', 'login', 'authentication', 'dashboard',
  'component', 'module', 'service', 'route', 'model', 'template',
  'plugin', 'skill', 'hook', 'mcp', 'prompt', 'documentation', 'log',
  'production', 'staging', 'development', 'environment', 'dependency',
  'vulnerability', 'threat', 'risk', 'compliance', 'audit',
  'integration', 'pipeline', 'workflow', 'automation', 'ci', 'cd',
  'container', 'docker', 'kubernetes', 'cloud', 'server', 'client',
  'user', 'interface', 'experience', 'accessibility', 'responsive',
  'cache', 'memory', 'disk', 'network', 'latency', 'timeout',
  'exception', 'failure', 'crash', 'slow', 'fast', 'broken',
  // EN adjectives
  'slow', 'fast', 'secure', 'insecure', 'complex', 'simple',
  'critical', 'urgent', 'blocking', 'unstable', 'flaky',
  // EN dev domain
  'react', 'next', 'node', 'python', 'flask', 'django', 'express',
  'typescript', 'javascript', 'css', 'html', 'tailwind', 'sql',
  'postgres', 'sqlite', 'redis', 'graphql', 'rest', 'websocket',
  'jwt', 'oauth', 'cors', 'csrf', 'xss', 'injection',
  'unit', 'integration', 'e2e', 'regression', 'coverage', 'mock',
  'lint', 'prettier', 'eslint', 'webpack', 'vite', 'turbopack',
  'git', 'github', 'pr', 'branch', 'rebase', 'cherry',
  'vercel', 'aws', 'azure', 'gcp', 'neon', 'supabase',
  // Compound concepts (embedded as phrases for richer vectors)
  'code review', 'pull request', 'bug fix', 'security audit',
  'performance optimization', 'database migration', 'api endpoint',
  'error handling', 'test coverage', 'deployment pipeline',
  'design system', 'user experience', 'developer experience',
  'root cause', 'threat model', 'load testing', 'stress test',
  'code quality', 'technical debt', 'breaking change',
];

async function main() {
  console.log('Loading transformers.js...');
  const { pipeline } = await import('@huggingface/transformers');

  console.log('Loading embedding model (Xenova/all-MiniLM-L6-v2)...');
  console.log('First run downloads ~23MB. Subsequent runs use cache.');
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    dtype: 'fp32',
  });

  // Load the full index to get descriptions
  const fullIndexPath = getIndexPath('full');
  if (!fs.existsSync(fullIndexPath)) {
    console.error('ERROR: Full index not found. Run /advisor-index first.');
    process.exit(1);
  }
  const fullIndex = JSON.parse(fs.readFileSync(fullIndexPath, 'utf8'));
  console.log(`Loaded ${fullIndex.length} entries from full index.`);

  // Generate description embeddings
  console.log('\nGenerating description embeddings...');
  const descEmbeddings = {};
  for (let i = 0; i < fullIndex.length; i++) {
    const entry = fullIndex[i];
    const text = `${entry.name}: ${entry.description || ''}`.slice(0, 256);
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    descEmbeddings[entry.id] = Array.from(output.data).slice(0, EMBEDDING.DIMENSIONS);
    if ((i + 1) % 50 === 0 || i === fullIndex.length - 1) {
      process.stdout.write(`  ${i + 1}/${fullIndex.length} descriptions embedded\r`);
    }
  }
  console.log(`\n  Done: ${Object.keys(descEmbeddings).length} description embeddings`);

  // Generate vocabulary embeddings
  console.log('\nGenerating vocabulary embeddings...');
  const uniqueWords = [...new Set(VOCAB_WORDS)];
  const vocabEmbeddings = {};
  for (let i = 0; i < uniqueWords.length; i++) {
    const word = uniqueWords[i];
    const output = await embedder(word, { pooling: 'mean', normalize: true });
    vocabEmbeddings[word] = Array.from(output.data).slice(0, EMBEDDING.DIMENSIONS);
    if ((i + 1) % 50 === 0 || i === uniqueWords.length - 1) {
      process.stdout.write(`  ${i + 1}/${uniqueWords.length} words embedded\r`);
    }
  }
  console.log(`\n  Done: ${Object.keys(vocabEmbeddings).length} vocabulary embeddings`);

  // Write files
  const libDir = getLibDir();
  const embPath = path.join(libDir, 'advisor-embeddings.json');
  const vocabPath = path.join(libDir, 'advisor-vocab.json');

  fs.writeFileSync(embPath, JSON.stringify(descEmbeddings), 'utf8');
  fs.writeFileSync(vocabPath, JSON.stringify(vocabEmbeddings), 'utf8');

  const embSize = (fs.statSync(embPath).size / 1024).toFixed(1);
  const vocabSize = (fs.statSync(vocabPath).size / 1024).toFixed(1);

  console.log(`\nEmbeddings saved:`);
  console.log(`  Descriptions: ${embPath} (${embSize}KB)`);
  console.log(`  Vocabulary:   ${vocabPath} (${vocabSize}KB)`);
  console.log('\nSemantic search ready.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
}

module.exports = { main, VOCAB_WORDS };
