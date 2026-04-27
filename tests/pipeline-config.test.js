'use strict';

/**
 * pipeline-config.test.js — BDD invariants for Skill_Advisor_Pipeline_Config
 *
 * Validates:
 *   - P2 (Pure Module Load): require('./pipeline-config') triggers ZERO
 *     filesystem reads at module load.
 *   - P3 (Lazy User Config Idempotence): loadEffectivePipelineConfig
 *     reads ~/.claude/advisor/pipeline-owners-user.json exactly once per
 *     unchanged mtime.
 *   - DI-1 (Module Load Purity): export shape and frozen base data.
 *
 * Requirements: 2.3, 2.4, 2.5
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MODULE_PATH = require.resolve('../lib/pipeline-config.js');

// ---------------------------------------------------------------------------
// AC 2.5 / Property P2 — Pure Module Load (zero fs reads at require time)
// ---------------------------------------------------------------------------

describe('Pipeline_Config — module load purity', () => {
  it('Given a fresh require of pipeline-config, When module load completes, Then no domain fs reads happened', () => {
    // Node's CommonJS loader itself uses fs.readFileSync to read the .js
    // module text. The invariant we care about is: the module's BODY does
    // not perform any domain-level I/O at load (e.g., reading
    // pipeline-owners-user.json, statting advisor data, walking dirs).
    // We therefore filter out reads whose path is the pipeline-config
    // module file itself or any other .js/.json under node_modules / lib
    // which Node's require chain loads transitively via its loader.
    const MODULE_FILE = MODULE_PATH;

    // Patch both sync and async fs APIs by symmetry. Today the module
    // is sync-only; tomorrow a refactor toward async fs at module load
    // would silently bypass a sync-only patch and the purity test would
    // become a false-green. Patching fs.promises.* defends against that.
    const originals = {
      readFileSync: fs.readFileSync,
      statSync: fs.statSync,
      readdirSync: fs.readdirSync,
      existsSync: fs.existsSync,
      promisesReadFile: fs.promises.readFile,
      promisesStat: fs.promises.stat,
      promisesReaddir: fs.promises.readdir,
    };
    const domainCalls = [];
    const isLoaderCall = (p) => {
      // Node's CJS loader reads the source text of pipeline-config.js
      // itself. That is an artifact of `require`, not domain I/O.
      const s = String(p);
      return s === MODULE_FILE;
    };

    fs.readFileSync = (...args) => {
      if (!isLoaderCall(args[0])) domainCalls.push(['readFileSync', String(args[0])]);
      return originals.readFileSync(...args);
    };
    fs.statSync = (...args) => {
      if (!isLoaderCall(args[0])) domainCalls.push(['statSync', String(args[0])]);
      return originals.statSync(...args);
    };
    fs.readdirSync = (...args) => {
      domainCalls.push(['readdirSync', String(args[0])]);
      return originals.readdirSync(...args);
    };
    fs.existsSync = (...args) => {
      // Node's loader uses existsSync to probe candidate paths; we only
      // flag existsSync against paths under ~/.claude/advisor (domain).
      const s = String(args[0]);
      if (s.includes('.claude') && s.includes('advisor')) {
        domainCalls.push(['existsSync', s]);
      }
      return originals.existsSync(...args);
    };
    fs.promises.readFile = (...args) => {
      domainCalls.push(['promises.readFile', String(args[0])]);
      return originals.promisesReadFile(...args);
    };
    fs.promises.stat = (...args) => {
      domainCalls.push(['promises.stat', String(args[0])]);
      return originals.promisesStat(...args);
    };
    fs.promises.readdir = (...args) => {
      domainCalls.push(['promises.readdir', String(args[0])]);
      return originals.promisesReaddir(...args);
    };

    try {
      delete require.cache[MODULE_PATH];
      // Also drop the user-config cache so a transitive require would
      // re-execute its body (it will not, because pipeline-config does
      // not require it at load).
      try { delete require.cache[require.resolve('../lib/user-config.js')]; } catch {}

      require('../lib/pipeline-config.js');

      assert.equal(
        domainCalls.length,
        0,
        `pipeline-config triggered ${domainCalls.length} domain fs call(s) at module load — must be zero. Calls: ${JSON.stringify(domainCalls)}`,
      );
    } finally {
      // Restore sync APIs.
      fs.readFileSync = originals.readFileSync;
      fs.statSync = originals.statSync;
      fs.readdirSync = originals.readdirSync;
      fs.existsSync = originals.existsSync;
      // Restore promise APIs.
      fs.promises.readFile = originals.promisesReadFile;
      fs.promises.stat = originals.promisesStat;
      fs.promises.readdir = originals.promisesReaddir;
    }
  });
});

// ---------------------------------------------------------------------------
// AC 2.3 — Module exports the expected surface
// ---------------------------------------------------------------------------

describe('Pipeline_Config — module exports', () => {
  it('exports PIPELINE_OWNERS, CANONICAL_FLOWS, PIPELINE_FINGERPRINTS, merge functions, loadEffectivePipelineConfig', () => {
    delete require.cache[MODULE_PATH];
    const pc = require('../lib/pipeline-config.js');

    assert.ok(Array.isArray(pc.PIPELINE_OWNERS), 'PIPELINE_OWNERS must be an array');
    assert.ok(pc.PIPELINE_OWNERS.length >= 5, 'PIPELINE_OWNERS must have at least the 5 canonical owners');
    assert.ok(Object.isFrozen(pc.PIPELINE_OWNERS), 'PIPELINE_OWNERS must be frozen');

    assert.ok(pc.CANONICAL_FLOWS && typeof pc.CANONICAL_FLOWS === 'object', 'CANONICAL_FLOWS must be an object');
    assert.ok(Object.isFrozen(pc.CANONICAL_FLOWS), 'CANONICAL_FLOWS must be frozen');

    assert.ok(pc.PIPELINE_FINGERPRINTS && typeof pc.PIPELINE_FINGERPRINTS === 'object', 'PIPELINE_FINGERPRINTS must be an object');
    assert.ok(Object.isFrozen(pc.PIPELINE_FINGERPRINTS), 'PIPELINE_FINGERPRINTS must be frozen');

    assert.equal(typeof pc.mergeOwners, 'function', 'mergeOwners must be a function');
    assert.equal(typeof pc.mergeFlows, 'function', 'mergeFlows must be a function');
    assert.equal(typeof pc.mergeFingerprints, 'function', 'mergeFingerprints must be a function');

    assert.equal(typeof pc.loadEffectivePipelineConfig, 'function', 'loadEffectivePipelineConfig must be a function');
  });

  it('PIPELINE_OWNERS contains the 5 canonical owners', () => {
    delete require.cache[MODULE_PATH];
    const { PIPELINE_OWNERS } = require('../lib/pipeline-config.js');
    const sorted = PIPELINE_OWNERS.slice().sort();
    assert.deepEqual(
      sorted,
      ['compound-engineering', 'kiro', 'pipeline-orchestrator', 'sdd', 'superpowers'],
    );
  });

  it('CANONICAL_FLOWS keys parity with PIPELINE_OWNERS', () => {
    delete require.cache[MODULE_PATH];
    const { PIPELINE_OWNERS, CANONICAL_FLOWS } = require('../lib/pipeline-config.js');
    assert.deepEqual(
      Object.keys(CANONICAL_FLOWS).sort(),
      PIPELINE_OWNERS.slice().sort(),
    );
  });

  it('PIPELINE_FINGERPRINTS keys parity with PIPELINE_OWNERS', () => {
    delete require.cache[MODULE_PATH];
    const { PIPELINE_OWNERS, PIPELINE_FINGERPRINTS } = require('../lib/pipeline-config.js');
    assert.deepEqual(
      Object.keys(PIPELINE_FINGERPRINTS).sort(),
      PIPELINE_OWNERS.slice().sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// AC 2.4 / Property P3 — Lazy user-config idempotence by mtime
// ---------------------------------------------------------------------------

describe('Pipeline_Config — lazy user config idempotence', () => {
  let TMP_DIR;
  let USER_CONFIG_PATH;
  let savedEnv;

  before(() => {
    TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-config-test-'));
    USER_CONFIG_PATH = path.join(TMP_DIR, 'pipeline-owners-user.json');
    savedEnv = process.env.SKILL_ADVISOR_USER_CONFIG_PATH;
    process.env.SKILL_ADVISOR_USER_CONFIG_PATH = USER_CONFIG_PATH;
  });

  after(() => {
    if (savedEnv === undefined) {
      delete process.env.SKILL_ADVISOR_USER_CONFIG_PATH;
    } else {
      process.env.SKILL_ADVISOR_USER_CONFIG_PATH = savedEnv;
    }
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('Given loadEffectivePipelineConfig is called twice with same mtime, Then user-config file is read exactly once', () => {
    fs.writeFileSync(
      USER_CONFIG_PATH,
      JSON.stringify({
        pipeline_owners: ['my-custom-owner'],
        canonical_flows: { 'my-custom-owner': ['/my-custom-owner:run'] },
        pipeline_fingerprints: {
          'my-custom-owner': {
            best_for: 'custom flows',
            typical_tasks: ['x'],
            not_for: ['y'],
            complexity_match: ['simple'],
          },
        },
      }),
    );

    delete require.cache[MODULE_PATH];
    const pc = require('../lib/pipeline-config.js');

    const originalReadFileSync = fs.readFileSync;
    let userConfigReads = 0;
    fs.readFileSync = (p, ...rest) => {
      if (typeof p === 'string' && p === USER_CONFIG_PATH) userConfigReads++;
      return originalReadFileSync(p, ...rest);
    };

    try {
      const first = pc.loadEffectivePipelineConfig();
      const second = pc.loadEffectivePipelineConfig();
      const third = pc.loadEffectivePipelineConfig();

      assert.equal(
        userConfigReads,
        1,
        `expected exactly 1 read of user-config (mtime unchanged across 3 calls), got ${userConfigReads}`,
      );

      assert.ok(first.owners.includes('my-custom-owner'), 'first call must merge user owner');
      assert.ok(second.owners.includes('my-custom-owner'), 'second call must merge user owner');
      assert.ok(third.owners.includes('my-custom-owner'), 'third call must merge user owner');
    } finally {
      fs.readFileSync = originalReadFileSync;
    }
  });

  it('Given user-config mtime changes, When loadEffectivePipelineConfig is re-called, Then user-config is re-read', () => {
    // Initial state already written from previous test scenario.
    fs.writeFileSync(USER_CONFIG_PATH, JSON.stringify({ pipeline_owners: [], canonical_flows: {}, pipeline_fingerprints: {} }));
    // Ensure mtime advances on systems with low-resolution timers.
    const future = new Date(Date.now() + 5_000);
    fs.utimesSync(USER_CONFIG_PATH, future, future);

    delete require.cache[MODULE_PATH];
    const pc = require('../lib/pipeline-config.js');

    pc.loadEffectivePipelineConfig(); // primes cache

    // mutate file with a new mtime
    fs.writeFileSync(
      USER_CONFIG_PATH,
      JSON.stringify({
        pipeline_owners: ['v2-owner'],
        canonical_flows: { 'v2-owner': ['/v2-owner:run'] },
        pipeline_fingerprints: {
          'v2-owner': {
            best_for: 'v2', typical_tasks: ['t'], not_for: ['n'], complexity_match: ['medium'],
          },
        },
      }),
    );
    const future2 = new Date(Date.now() + 10_000);
    fs.utimesSync(USER_CONFIG_PATH, future2, future2);

    const result = pc.loadEffectivePipelineConfig();
    assert.ok(result.owners.includes('v2-owner'), 'mtime change must invalidate cache and pick up new owner');
  });

  it('Given user-config does not exist, When loadEffectivePipelineConfig is called, Then it returns base config without throwing', () => {
    fs.rmSync(USER_CONFIG_PATH, { force: true });
    delete require.cache[MODULE_PATH];
    const pc = require('../lib/pipeline-config.js');

    const result = pc.loadEffectivePipelineConfig();
    assert.ok(Array.isArray(result.owners));
    assert.ok(result.owners.length >= 5, 'must include all base owners when no user config');
    assert.ok(typeof result.flows === 'object' && result.flows !== null);
    assert.ok(typeof result.fingerprints === 'object' && result.fingerprints !== null);
  });
});

// ---------------------------------------------------------------------------
// Merge function semantics — preserved from constants.js extraction
// ---------------------------------------------------------------------------

describe('Pipeline_Config — merge functions', () => {
  it('mergeOwners returns base when extension is empty', () => {
    delete require.cache[MODULE_PATH];
    const { mergeOwners, PIPELINE_OWNERS } = require('../lib/pipeline-config.js');
    const merged = mergeOwners(PIPELINE_OWNERS, { pipeline_owners: [], canonical_flows: {}, pipeline_fingerprints: {} });
    assert.deepEqual(merged.slice().sort(), PIPELINE_OWNERS.slice().sort());
  });

  it('mergeOwners filters out user owner colliding with base', () => {
    delete require.cache[MODULE_PATH];
    const { mergeOwners, PIPELINE_OWNERS } = require('../lib/pipeline-config.js');
    const merged = mergeOwners(PIPELINE_OWNERS, {
      pipeline_owners: ['superpowers', 'novel'],
      canonical_flows: { 'superpowers': ['/x'], novel: ['/y'] },
      pipeline_fingerprints: { 'superpowers': { best_for: 'x' }, novel: { best_for: 'y' } },
    });
    const sp = merged.filter((o) => o === 'superpowers');
    assert.equal(sp.length, 1, 'collision filter must keep exactly one base copy');
    assert.ok(merged.includes('novel'), 'novel owner must be appended');
  });

  it('mergeFlows ignores user flow for owner not in allowed list', () => {
    delete require.cache[MODULE_PATH];
    const { mergeFlows, CANONICAL_FLOWS, PIPELINE_OWNERS } = require('../lib/pipeline-config.js');
    const merged = mergeFlows(CANONICAL_FLOWS, {
      pipeline_owners: ['ghost'],
      canonical_flows: { ghost: ['/ghost:run'] },
      pipeline_fingerprints: { ghost: { best_for: '' } },
    }, PIPELINE_OWNERS);
    assert.equal(merged.ghost, undefined);
  });
});
