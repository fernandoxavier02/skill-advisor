'use strict';

/**
 * setup-state.js — read/write helpers for the first-run wizard state file.
 *
 * State file location: ~/.claude/advisor/setup.json (env override
 * SKILL_ADVISOR_SETUP_PATH). Schema is versioned; the wizard writes
 * advisor_version so re-runs after a plugin upgrade can re-offer steps.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const STATE_SCHEMA_VERSION = 1;
const KNOWN_STEPS = Object.freeze(['index', 'embeddings', 'owners', 'smoke']);

function defaultSetupPath() {
  if (process.env.SKILL_ADVISOR_SETUP_PATH) {
    return process.env.SKILL_ADVISOR_SETUP_PATH;
  }
  return path.join(os.homedir(), '.claude', 'advisor', 'setup.json');
}

function emptyState(advisorVersion = 'unknown') {
  return {
    version: STATE_SCHEMA_VERSION,
    advisor_version: advisorVersion,
    first_run_at: null,
    completed_at: null,
    completed_steps: [],
    plugins_detected: [],
  };
}

function readSetupState(customPath) {
  const p = customPath || defaultSetupPath();
  if (!fs.existsSync(p)) return emptyState();
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return emptyState();
    }
    return {
      version: Number.isInteger(parsed.version) ? parsed.version : STATE_SCHEMA_VERSION,
      advisor_version: String(parsed.advisor_version || 'unknown'),
      first_run_at: parsed.first_run_at || null,
      completed_at: parsed.completed_at || null,
      completed_steps: Array.isArray(parsed.completed_steps)
        ? parsed.completed_steps.filter((s) => KNOWN_STEPS.includes(s))
        : [],
      plugins_detected: Array.isArray(parsed.plugins_detected)
        ? parsed.plugins_detected
        : [],
    };
  } catch (err) {
    process.stderr.write(`[skill-advisor] setup-state read failed at ${p}: ${err.message}\n`);
    return emptyState();
  }
}

function writeSetupState(state, customPath) {
  const p = customPath || defaultSetupPath();
  const dir = path.dirname(p);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(state, null, 2) + '\n', 'utf8');
    return true;
  } catch (err) {
    process.stderr.write(`[skill-advisor] setup-state write failed at ${p}: ${err.message}\n`);
    return false;
  }
}

function isStepCompleted(state, step) {
  if (!state || !Array.isArray(state.completed_steps)) return false;
  return state.completed_steps.includes(step);
}

function markStepCompleted(state, step) {
  if (!KNOWN_STEPS.includes(step)) {
    throw new Error(`unknown setup step: ${step}`);
  }
  const nextSteps = Array.from(new Set([...(state.completed_steps || []), step]));
  return { ...state, completed_steps: nextSteps };
}

function needsFullRerun(state, currentAdvisorVersion) {
  if (!state || !state.advisor_version) return true;
  return state.advisor_version !== currentAdvisorVersion;
}

function isFirstRun(customPath) {
  const p = customPath || defaultSetupPath();
  return !fs.existsSync(p);
}

module.exports = {
  STATE_SCHEMA_VERSION,
  KNOWN_STEPS,
  defaultSetupPath,
  emptyState,
  readSetupState,
  writeSetupState,
  isStepCompleted,
  markStepCompleted,
  needsFullRerun,
  isFirstRun,
};
