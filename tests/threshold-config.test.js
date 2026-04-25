'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  PRESETS,
  EMPTY_THRESHOLD_CONFIG,
  ThresholdValidationError,
  validateThresholdValue,
  makeThresholdConfig,
  readThresholdConfigFromState,
  resolveEffectiveThreshold,
} = require('../lib/threshold-config.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'threshold-test-'));
const STATE_FILE = path.join(TMP, 'setup.json');

before(() => {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({
      version: 1,
      threshold_config: { value: 0.6, preset: 'custom' },
    })
  );
});

after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});

describe('PRESETS', () => {
  it('has three canonical names with correct values', () => {
    assert.equal(PRESETS.strict, 0.7);
    assert.equal(PRESETS.balanced, 0.5);
    assert.equal(PRESETS.chatty, 0.3);
  });

  it('is frozen', () => {
    assert.throws(() => { PRESETS.strict = 0.9; }, TypeError);
  });
});

describe('validateThresholdValue', () => {
  it('accepts 0, 0.5, 1', () => {
    assert.doesNotThrow(() => validateThresholdValue(0));
    assert.doesNotThrow(() => validateThresholdValue(0.5));
    assert.doesNotThrow(() => validateThresholdValue(1));
  });

  it('rejects non-number', () => {
    assert.throws(
      () => validateThresholdValue('0.5'),
      (err) => err instanceof ThresholdValidationError && err.reason === 'invalid_type'
    );
  });

  it('rejects NaN', () => {
    assert.throws(
      () => validateThresholdValue(NaN),
      (err) => err.reason === 'invalid_type'
    );
  });

  it('rejects Infinity', () => {
    assert.throws(
      () => validateThresholdValue(Infinity),
      (err) => err.reason === 'not_finite'
    );
  });

  it('rejects negative', () => {
    assert.throws(
      () => validateThresholdValue(-0.1),
      (err) => err.reason === 'out_of_range'
    );
  });

  it('rejects >1', () => {
    assert.throws(
      () => validateThresholdValue(1.5),
      (err) => err.reason === 'out_of_range'
    );
  });
});

describe('makeThresholdConfig', () => {
  it('returns EMPTY for null preset', () => {
    assert.equal(makeThresholdConfig(null), EMPTY_THRESHOLD_CONFIG);
  });

  it('returns EMPTY for undefined preset', () => {
    assert.equal(makeThresholdConfig(undefined), EMPTY_THRESHOLD_CONFIG);
  });

  it('maps a named preset to its value', () => {
    const cfg = makeThresholdConfig('balanced');
    assert.equal(cfg.value, 0.5);
    assert.equal(cfg.preset, 'balanced');
    assert.throws(() => { cfg.value = 0.9; }, TypeError);
  });

  it('accepts a custom value with preset "custom"', () => {
    const cfg = makeThresholdConfig('custom', 0.42);
    assert.equal(cfg.value, 0.42);
    assert.equal(cfg.preset, 'custom');
  });

  it('rejects unknown preset names', () => {
    assert.throws(
      () => makeThresholdConfig('bogus'),
      (err) => err instanceof ThresholdValidationError && err.reason === 'unknown_preset'
    );
  });

  it('validates custom value', () => {
    assert.throws(
      () => makeThresholdConfig('custom', 1.5),
      (err) => err.reason === 'out_of_range'
    );
  });
});

describe('readThresholdConfigFromState', () => {
  it('returns EMPTY when state is null', () => {
    assert.equal(readThresholdConfigFromState(null), EMPTY_THRESHOLD_CONFIG);
  });

  it('returns EMPTY when threshold_config missing', () => {
    assert.equal(readThresholdConfigFromState({}), EMPTY_THRESHOLD_CONFIG);
  });

  it('returns typed config when state is valid', () => {
    const cfg = readThresholdConfigFromState({
      threshold_config: { value: 0.7, preset: 'strict' },
    });
    assert.equal(cfg.value, 0.7);
    assert.equal(cfg.preset, 'strict');
    assert.throws(() => { cfg.value = 0.9; }, TypeError);
  });

  it('sanitizes out-of-range value to null', () => {
    const cfg = readThresholdConfigFromState({ threshold_config: { value: 99 } });
    assert.equal(cfg.value, null);
  });

  it('sanitizes non-number value to null', () => {
    const cfg = readThresholdConfigFromState({ threshold_config: { value: 'high' } });
    assert.equal(cfg.value, null);
  });
});

describe('resolveEffectiveThreshold', () => {
  it('env value wins when valid', () => {
    const v = resolveEffectiveThreshold({
      envValue: 0.9,
      state: { threshold_config: { value: 0.3 } },
      defaultValue: 0.2,
    });
    assert.equal(v, 0.9);
  });

  it('state wins over default when env invalid', () => {
    const v = resolveEffectiveThreshold({
      envValue: NaN,
      state: { threshold_config: { value: 0.3 } },
      defaultValue: 0.2,
    });
    assert.equal(v, 0.3);
  });

  it('default wins when nothing else provides', () => {
    const v = resolveEffectiveThreshold({
      envValue: undefined,
      state: null,
      defaultValue: 0.2,
    });
    assert.equal(v, 0.2);
  });

  it('env out-of-range falls through', () => {
    const v = resolveEffectiveThreshold({
      envValue: 99,
      state: { threshold_config: { value: 0.3 } },
      defaultValue: 0.2,
    });
    assert.equal(v, 0.3);
  });

  it('loads state from disk when `state` undefined and path-override is set', () => {
    const prev = process.env.SKILL_ADVISOR_SETUP_PATH;
    process.env.SKILL_ADVISOR_SETUP_PATH = STATE_FILE;
    try {
      const v = resolveEffectiveThreshold({
        envValue: undefined,
        defaultValue: 0.2,
      });
      assert.equal(v, 0.6);
    } finally {
      if (prev === undefined) delete process.env.SKILL_ADVISOR_SETUP_PATH;
      else process.env.SKILL_ADVISOR_SETUP_PATH = prev;
    }
  });
});
