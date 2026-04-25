'use strict';

/**
 * smoke-runner.js — Full /advisor smoke test (F3, Approach B).
 *
 * DDD:
 *   SmokeTest       — canned-prerequisite validation of the advisor stack
 *   SmokeTestResult — value object { passed, checks, loadout_size,
 *                     duration_ms, matched_fingerprint, reason }
 *
 * Runs a structural + behavioral smoke on the user's installation:
 *   1. full index parses as array
 *   2. lite index parses as array
 *   3. embeddings parse if present (optional — wizard may have skipped)
 *   4. lib/constants.js loads (exercises the user-config merge)
 *   5. PIPELINE_OWNERS and CANONICAL_FLOWS parity holds
 *   6. canned task keyword-matches against the lite index without crash
 *
 * Upgrade over v0.3.5's ultra-light smoke (which only parsed 2 JSON files):
 * this version exercises the merge logic and tokenization path, so a
 * misconfigured pipeline-owners-user.json fails loudly here instead of
 * silently breaking the first real `/advisor` call.
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PLUGIN_ROOT = path.resolve(__dirname, '..');

const CANNED_TASKS = Object.freeze([
  Object.freeze({
    task: 'fix typo in line 47 of auth.ts',
    expected: 'short_standalone',
    description: 'Simple mechanical fix — no fingerprint match',
  }),
  Object.freeze({
    task: 'create a spec for the auth refactor using kiro',
    expected: 'kiro_match',
    description: 'Kiro-named task — expected to match kiro fingerprint keywords',
  }),
]);

function makeSmokeTestResult(partial) {
  return Object.freeze({
    passed: partial.passed === true,
    checks: Object.freeze([...(partial.checks || [])].map((c) => Object.freeze({ ...c }))),
    loadout_size: Number.isInteger(partial.loadout_size) ? partial.loadout_size : 0,
    duration_ms: Number.isInteger(partial.duration_ms) ? partial.duration_ms : 0,
    matched_fingerprint:
      typeof partial.matched_fingerprint === 'string'
        ? partial.matched_fingerprint
        : null,
    reason: typeof partial.reason === 'string' ? partial.reason : null,
  });
}

function validateJsonFile(filePath, { requireArray = false } = {}) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, reason: 'file_not_found' };
  }
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return { ok: false, reason: `read_failed:${err.message.slice(0, 50)}` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, reason: `parse_failed:${err.message.slice(0, 50)}` };
  }
  if (requireArray && !Array.isArray(parsed)) {
    return { ok: false, reason: 'not_an_array' };
  }
  return {
    ok: true,
    entry_count: Array.isArray(parsed) ? parsed.length : null,
    bytes: raw.length,
  };
}

function validateConstantsLoad(pluginRoot) {
  const constantsPath = path.join(pluginRoot, 'lib', 'constants.js');
  try {
    // Fresh require so a freshly-written pipeline-owners-user.json is picked up
    delete require.cache[require.resolve(constantsPath)];
    const constants = require(constantsPath);
    if (!Array.isArray(constants.PIPELINE_OWNERS)) {
      return { ok: false, reason: 'PIPELINE_OWNERS_not_array' };
    }
    if (
      !constants.CANONICAL_FLOWS ||
      typeof constants.CANONICAL_FLOWS !== 'object'
    ) {
      return { ok: false, reason: 'CANONICAL_FLOWS_not_object' };
    }
    const missingFlows = constants.PIPELINE_OWNERS.filter(
      (o) => !constants.CANONICAL_FLOWS[o]
    );
    if (missingFlows.length > 0) {
      return {
        ok: false,
        reason: `missing_canonical_flows:${missingFlows.join(',')}`,
      };
    }
    return { ok: true, owner_count: constants.PIPELINE_OWNERS.length };
  } catch (err) {
    return { ok: false, reason: `constants_load_failed:${err.message.slice(0, 60)}` };
  }
}

function cannedTokenSmoke(liteIndex) {
  if (!Array.isArray(liteIndex) || liteIndex.length === 0) {
    return { ok: false, reason: 'lite_index_empty' };
  }
  // Does at least one entry match a canned-task keyword? Trivial presence
  // check — proves the index is structurally traversable.
  for (const canned of CANNED_TASKS) {
    const words = canned.task.toLowerCase().split(/\s+/);
    for (const entry of liteIndex) {
      const hay = `${entry.name || ''} ${entry.description || ''}`.toLowerCase();
      if (words.some((w) => w.length > 3 && hay.includes(w))) {
        return { ok: true, matched_task: canned.task };
      }
    }
  }
  // No canned task matched any entry — technically passes the structural
  // check but the index might be anemic. We still return ok because the
  // traversal did not crash. Record a hint.
  return { ok: true, matched_task: null, hint: 'no_canned_task_matched' };
}

function runSmoke(options = {}) {
  const started = Date.now();
  const pluginRoot =
    options.pluginRoot ||
    process.env.CLAUDE_PLUGIN_ROOT ||
    DEFAULT_PLUGIN_ROOT;

  const checks = [];

  const fullIndex = validateJsonFile(
    path.join(pluginRoot, 'lib', 'advisor-index-full.json'),
    { requireArray: true }
  );
  checks.push({ name: 'full_index', optional: false, ...fullIndex });

  const liteIndexResult = validateJsonFile(
    path.join(pluginRoot, 'lib', 'advisor-index-lite.json'),
    { requireArray: true }
  );
  checks.push({ name: 'lite_index', optional: false, ...liteIndexResult });

  const embeddings = validateJsonFile(
    path.join(pluginRoot, 'lib', 'advisor-embeddings.json')
  );
  checks.push({ name: 'embeddings', optional: true, ...embeddings });

  const constantsCheck = validateConstantsLoad(pluginRoot);
  checks.push({ name: 'constants_load', optional: false, ...constantsCheck });

  // Traversal check: load the lite index we just validated and run a token smoke
  let tokenSmoke = { ok: false, reason: 'skipped_due_to_prior_failure' };
  if (liteIndexResult.ok) {
    try {
      const liteRaw = fs.readFileSync(
        path.join(pluginRoot, 'lib', 'advisor-index-lite.json'),
        'utf8'
      );
      const lite = JSON.parse(liteRaw);
      tokenSmoke = cannedTokenSmoke(lite);
    } catch (err) {
      tokenSmoke = { ok: false, reason: `token_smoke_failed:${err.message.slice(0, 50)}` };
    }
  }
  checks.push({ name: 'token_smoke', optional: false, ...tokenSmoke });

  const required = checks.filter((c) => !c.optional);
  const passed = required.every((c) => c.ok === true);
  const firstFail = required.find((c) => !c.ok);

  return makeSmokeTestResult({
    passed,
    checks,
    duration_ms: Date.now() - started,
    reason: firstFail ? `${firstFail.name}:${firstFail.reason}` : null,
  });
}

module.exports = {
  CANNED_TASKS,
  makeSmokeTestResult,
  validateJsonFile,
  validateConstantsLoad,
  cannedTokenSmoke,
  runSmoke,
};
