'use strict';

// Performance baseline capture for hooks/advisor-nudge.cjs.
//
// File-name contract: leading `_` keeps this file out of the
// `node --test tests/*.test.js` glob (see package.json), so it loads as a
// runnable script — not a test suite. Re-run with `node tests/_perf-capture.js`
// to refresh tests/fixtures/perf-baseline.json.
//
// Methodology:
//   - Spawns hooks/advisor-nudge.cjs as a subprocess per iteration
//     (production-faithful: matches how Claude Code invokes the hook).
//   - Two prompt sizes: ~80 chars (typical) and ~500 chars (long).
//   - Warmup: WARMUP_ITERS iterations discarded per prompt (JIT/FS cache).
//   - Sample: SAMPLE_ITERS iterations measured per prompt.
//   - p50/p95 are nearest-rank percentiles, mean is arithmetic average,
//     all in milliseconds — see tests/_perf-harness.js.
//
// Slice 3.1 captures only — no asserts. Slice 3.7 will assert
// `p95 atual <= baseline.p95 * 1.10` against the JSON written here.
//
// _Requirements: 4.2_

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { measureP50P95 } = require('./_perf-harness');

const HOOK_PATH = path.resolve(__dirname, '..', 'hooks', 'advisor-nudge.cjs');
const BASELINE_PATH = path.resolve(__dirname, 'fixtures', 'perf-baseline.json');
const INDEX_LITE_PATH = path.resolve(__dirname, '..', 'lib', 'advisor-index-lite.json');

const WARMUP_ITERS = 8;
const SAMPLE_ITERS = 100;

// 80-char prompt: typical task description.
const PROMPT_SHORT =
  'Debug a failing API endpoint returning 500 errors with large input payloads now.';

// 500-char prompt: long, multi-clause task with mixed PT-BR/EN tokens —
// exercises tokenizer + synonym expansion at realistic upper end.
const PROMPT_LONG =
  'Preciso refatorar o módulo de autenticação que está com falhas intermitentes em produção, ' +
  'investigar a causa raiz dos timeouts em chamadas downstream, escrever testes de integração cobrindo ' +
  'os edge cases descobertos, atualizar a documentação do endpoint REST, revisar o diff antes do deploy, ' +
  'e finalmente shipar a correção como pull request com review do time de segurança — incluindo ' +
  'plano de rollback e um checklist de QA visual antes de aprovar o merge para a branch main.';

function assertExactLength(label, prompt, target, tolerance) {
  if (Math.abs(prompt.length - target) > tolerance) {
    throw new Error(
      `${label}: expected ~${target} chars (±${tolerance}), got ${prompt.length}`
    );
  }
}

function runHookOnce(prompt) {
  const result = spawnSync(process.execPath, [HOOK_PATH], {
    input: '',
    env: {
      ...process.env,
      ADVISOR_ENABLED: 'true',
      CLAUDE_USER_PROMPT: prompt,
    },
    encoding: 'utf8',
    timeout: 5000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `advisor-nudge.cjs exited ${result.status}: ${result.stderr || result.stdout}`
    );
  }
}

function captureForPrompt(label, prompt) {
  for (let i = 0; i < WARMUP_ITERS; i++) runHookOnce(prompt);
  const stats = measureP50P95(() => runHookOnce(prompt), SAMPLE_ITERS);
  return {
    label,
    prompt_length: prompt.length,
    iterations: SAMPLE_ITERS,
    warmup_iterations: WARMUP_ITERS,
    p50_ms: round3(stats.p50),
    p95_ms: round3(stats.p95),
    mean_ms: round3(stats.mean),
  };
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function readIndexEntryCount() {
  try {
    const raw = fs.readFileSync(INDEX_LITE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function main() {
  if (!fs.existsSync(HOOK_PATH)) {
    throw new Error(`hook not found: ${HOOK_PATH}`);
  }
  if (!fs.existsSync(INDEX_LITE_PATH)) {
    throw new Error(
      `index not found: ${INDEX_LITE_PATH} — run \`npm run index\` first`
    );
  }

  assertExactLength('PROMPT_SHORT', PROMPT_SHORT, 80, 5);
  assertExactLength('PROMPT_LONG', PROMPT_LONG, 500, 25);

  const samples = [
    captureForPrompt('short_80char', PROMPT_SHORT),
    captureForPrompt('long_500char', PROMPT_LONG),
  ];

  const baseline = {
    schema_version: 1,
    captured_at: new Date().toISOString(),
    methodology: 'subprocess_spawnSync_per_iteration',
    runtime: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    environment: {
      index_entry_count: readIndexEntryCount(),
      embeddings_available: fs.existsSync(
        path.resolve(__dirname, '..', 'lib', 'advisor-embeddings.json')
      ),
      graph_available: fs.existsSync(
        path.resolve(__dirname, '..', 'vault-graph', 'adjacency.json')
      ),
    },
    samples,
  };

  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf8');

  process.stdout.write(`Wrote ${BASELINE_PATH}\n`);
  for (const s of samples) {
    process.stdout.write(
      `  ${s.label.padEnd(14)} p50=${s.p50_ms.toFixed(2)}ms ` +
        `p95=${s.p95_ms.toFixed(2)}ms mean=${s.mean_ms.toFixed(2)}ms\n`
    );
  }
}

if (require.main === module) {
  main();
}

module.exports = { runHookOnce, captureForPrompt, PROMPT_SHORT, PROMPT_LONG };
