'use strict';

/**
 * threshold-config.js — Hook scoring threshold bounded context.
 *
 * DDD:
 *   Threshold       — advisor-nudge score cutoff (0.0–1.0). Decides when a
 *                     skill is surfaced in the hook path.
 *   ThresholdConfig — value object { value, preset }
 *                     preset: 'strict'|'balanced'|'chatty'|'custom'|null
 *   EMPTY_THRESHOLD_CONFIG — absent config (hook falls back to default)
 *
 * Presets:
 *   strict   = 0.7   — fewer, higher-confidence nudges
 *   balanced = 0.5   — middle ground
 *   chatty   = 0.3   — more nudges, more noise
 *
 * Resolution cascade for hook runtime (implemented in resolveEffectiveThreshold):
 *   1. ADVISOR_THRESHOLD env var (explicit session override)
 *   2. setup.json threshold_config.value (wizard-persisted)
 *   3. THRESHOLDS.DEFAULT_SCORE (compiled-in fallback, 0.20)
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PRESETS = Object.freeze({
  strict: 0.7,
  balanced: 0.5,
  chatty: 0.3,
});

const EMPTY_THRESHOLD_CONFIG = Object.freeze({
  value: null,
  preset: null,
});

class ThresholdValidationError extends Error {
  constructor(message, reason) {
    super(message);
    this.name = 'ThresholdValidationError';
    this.reason = reason;
  }
}

function validateThresholdValue(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ThresholdValidationError('value must be a number', 'invalid_type');
  }
  if (!Number.isFinite(value)) {
    throw new ThresholdValidationError('value must be finite', 'not_finite');
  }
  if (value < 0 || value > 1) {
    throw new ThresholdValidationError(
      `value must be in [0,1], got ${value}`,
      'out_of_range'
    );
  }
  return true;
}

function makeThresholdConfig(preset, customValue) {
  if (preset === null || preset === undefined) {
    return EMPTY_THRESHOLD_CONFIG;
  }
  if (preset === 'custom') {
    validateThresholdValue(customValue);
    return Object.freeze({ value: customValue, preset: 'custom' });
  }
  if (!Object.prototype.hasOwnProperty.call(PRESETS, preset)) {
    throw new ThresholdValidationError(
      `unknown preset "${preset}" (valid: ${Object.keys(PRESETS).join(', ')}, custom, null)`,
      'unknown_preset'
    );
  }
  return Object.freeze({ value: PRESETS[preset], preset });
}

function readThresholdConfigFromState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return EMPTY_THRESHOLD_CONFIG;
  }
  const tc = state.threshold_config;
  if (!tc || typeof tc !== 'object' || Array.isArray(tc)) {
    return EMPTY_THRESHOLD_CONFIG;
  }
  const value =
    typeof tc.value === 'number' &&
    Number.isFinite(tc.value) &&
    tc.value >= 0 &&
    tc.value <= 1
      ? tc.value
      : null;
  const preset = typeof tc.preset === 'string' ? tc.preset : null;
  return Object.freeze({ value, preset });
}

function defaultSetupPath() {
  if (process.env.SKILL_ADVISOR_SETUP_PATH) {
    return process.env.SKILL_ADVISOR_SETUP_PATH;
  }
  return path.join(os.homedir(), '.claude', 'advisor', 'setup.json');
}

function loadStateFromDisk(customPath) {
  const p = customPath || defaultSetupPath();
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Hook-facing resolver. Applies the cascade:
 *   1. explicit envValue (hook already parsed ADVISOR_THRESHOLD)
 *   2. setup.json threshold_config.value
 *   3. defaultValue (compiled-in)
 *
 * envValue, if not null/undefined, must already be a valid number in [0,1];
 * the caller is responsible for parsing and clamping it. This keeps the
 * hook path free of schema validation overhead.
 */
function resolveEffectiveThreshold({ envValue, state, defaultValue }) {
  if (typeof envValue === 'number' && Number.isFinite(envValue) && envValue >= 0 && envValue <= 1) {
    return envValue;
  }
  const effectiveState = state !== undefined ? state : loadStateFromDisk();
  const cfg = readThresholdConfigFromState(effectiveState);
  if (cfg.value !== null) return cfg.value;
  return defaultValue;
}

module.exports = {
  PRESETS,
  EMPTY_THRESHOLD_CONFIG,
  ThresholdValidationError,
  validateThresholdValue,
  makeThresholdConfig,
  readThresholdConfigFromState,
  resolveEffectiveThreshold,
};
