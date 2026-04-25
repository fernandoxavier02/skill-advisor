'use strict';

/**
 * user-config.js — User-extension config loader for pipeline-owners curation.
 *
 * Reads `~/.claude/advisor/pipeline-owners-user.json` (or the path from env
 * `SKILL_ADVISOR_USER_CONFIG_PATH`) and returns a validated extension object
 * with `pipeline_owners`, `canonical_flows`, and `pipeline_fingerprints`.
 *
 * Merge contract (enforced in constants.js): the extension is APPEND-ONLY.
 * User-declared owners colliding with the base list are filtered out with a
 * warning. User-declared flows/fingerprints for unknown owners are ignored.
 *
 * Fail-soft: a missing file, malformed JSON, or schema violations all degrade
 * silently to `EMPTY_EXTENSION` with a single warning to stderr. The plugin
 * continues on the hardcoded base.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const EMPTY_EXTENSION = Object.freeze({
  pipeline_owners: Object.freeze([]),
  canonical_flows: Object.freeze({}),
  pipeline_fingerprints: Object.freeze({}),
});

function defaultUserConfigPath() {
  if (process.env.SKILL_ADVISOR_USER_CONFIG_PATH) {
    return process.env.SKILL_ADVISOR_USER_CONFIG_PATH;
  }
  return path.join(os.homedir(), '.claude', 'advisor', 'pipeline-owners-user.json');
}

function validateExtension(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    errors.push('extension root must be an object');
    return errors;
  }
  const owners = obj.pipeline_owners;
  const flows = obj.canonical_flows || {};
  const fingerprints = obj.pipeline_fingerprints || {};

  if (owners !== undefined && !Array.isArray(owners)) {
    errors.push('pipeline_owners must be an array when present');
    return errors;
  }
  if (typeof flows !== 'object' || Array.isArray(flows)) {
    errors.push('canonical_flows must be an object when present');
    return errors;
  }
  if (typeof fingerprints !== 'object' || Array.isArray(fingerprints)) {
    errors.push('pipeline_fingerprints must be an object when present');
    return errors;
  }

  for (const owner of owners || []) {
    if (typeof owner !== 'string' || owner.length === 0) {
      errors.push(`owner entry must be a non-empty string (got ${JSON.stringify(owner)})`);
      continue;
    }
    const flow = flows[owner];
    if (!Array.isArray(flow) || flow.length === 0) {
      errors.push(`owner "${owner}" missing canonical_flows[owner] (non-empty array required)`);
    }
    const fp = fingerprints[owner];
    if (!fp || typeof fp !== 'object' || Array.isArray(fp)) {
      errors.push(`owner "${owner}" missing pipeline_fingerprints[owner] (object required)`);
    }
  }

  return errors;
}

function loadUserConfig(customPath) {
  const p = customPath || defaultUserConfigPath();

  if (!fs.existsSync(p)) return EMPTY_EXTENSION;

  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (err) {
    process.stderr.write(`[skill-advisor] user-config read failed at ${p}: ${err.message}\n`);
    return EMPTY_EXTENSION;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`[skill-advisor] user-config parse failed at ${p}: ${err.message}\n`);
    return EMPTY_EXTENSION;
  }

  const errors = validateExtension(parsed);
  if (errors.length > 0) {
    process.stderr.write(`[skill-advisor] user-config validation failed at ${p}: ${errors.join('; ')}\n`);
    return EMPTY_EXTENSION;
  }

  return Object.freeze({
    pipeline_owners: Object.freeze([...(parsed.pipeline_owners || [])]),
    canonical_flows: Object.freeze(
      Object.fromEntries(
        Object.entries(parsed.canonical_flows || {}).map(([k, v]) => [
          k,
          Object.freeze([...v]),
        ])
      )
    ),
    pipeline_fingerprints: Object.freeze(
      Object.fromEntries(
        Object.entries(parsed.pipeline_fingerprints || {}).map(([k, v]) => [
          k,
          Object.freeze({
            best_for: v.best_for || '',
            typical_tasks: Object.freeze([...(v.typical_tasks || [])]),
            not_for: Object.freeze([...(v.not_for || [])]),
            complexity_match: Object.freeze([...(v.complexity_match || [])]),
          }),
        ])
      )
    ),
  });
}

module.exports = {
  loadUserConfig,
  validateExtension,
  defaultUserConfigPath,
  EMPTY_EXTENSION,
};
