'use strict';

/**
 * BDD scenarios for the Threshold bounded context — Given/When/Then.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  PRESETS,
  EMPTY_THRESHOLD_CONFIG,
  makeThresholdConfig,
  resolveEffectiveThreshold,
} = require('../../lib/threshold-config.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'threshold-feature-'));
const STATE_FILE = path.join(TMP, 'setup.json');

before(() => {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({
      version: 1,
      threshold_config: { value: PRESETS.strict, preset: 'strict' },
    })
  );
});

after(() => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});

describe('Feature: Hook threshold tuning', () => {
  describe('Scenario: User picks a named preset "balanced"', () => {
    it('Given the wizard shows 3 presets, When the user picks "balanced", Then ThresholdConfig is { value: 0.5, preset: "balanced" }', () => {
      const cfg = makeThresholdConfig('balanced');
      assert.equal(cfg.value, 0.5);
      assert.equal(cfg.preset, 'balanced');
    });
  });

  describe('Scenario: User picks "Keep default"', () => {
    it('Given the 3 presets, When the user picks "Keep default" (null preset), Then no ThresholdConfig is written', () => {
      const cfg = makeThresholdConfig(null);
      assert.equal(cfg, EMPTY_THRESHOLD_CONFIG);
      assert.equal(cfg.value, null);
    });
  });

  describe('Scenario: Wizard-persisted threshold beats compiled default', () => {
    it('Given setup.json has threshold_config.value=0.7 and default is 0.2, When the hook resolves, Then 0.7 is used', () => {
      const prev = process.env.SKILL_ADVISOR_SETUP_PATH;
      process.env.SKILL_ADVISOR_SETUP_PATH = STATE_FILE;
      try {
        const v = resolveEffectiveThreshold({
          envValue: undefined,
          defaultValue: 0.2,
        });
        assert.equal(v, 0.7);
      } finally {
        if (prev === undefined) delete process.env.SKILL_ADVISOR_SETUP_PATH;
        else process.env.SKILL_ADVISOR_SETUP_PATH = prev;
      }
    });
  });

  describe('Scenario: ADVISOR_THRESHOLD env var beats everything', () => {
    it('Given the env var sets 0.9 and state also sets a value, When the hook resolves, Then env wins', () => {
      const v = resolveEffectiveThreshold({
        envValue: 0.9,
        state: { threshold_config: { value: 0.3 } },
        defaultValue: 0.2,
      });
      assert.equal(v, 0.9);
    });
  });

  describe('Scenario: Nothing configured — compiled default wins', () => {
    it('Given no env var and no state, When the hook resolves, Then the compiled default is returned', () => {
      const v = resolveEffectiveThreshold({
        envValue: undefined,
        state: null,
        defaultValue: 0.2,
      });
      assert.equal(v, 0.2);
    });
  });
});
