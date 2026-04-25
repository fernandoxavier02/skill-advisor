'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  detect,
  detectAll,
  orderByWorkflow,
  THRESHOLD_FLAG,
  THRESHOLD_STRONG,
} = require('../lib/detect-owners.js');

describe('detect — H1 explicit metadata short-circuit', () => {
  it('confidence 1.0 when manifest has pipeline: true', () => {
    const r = detect('x', [{ name: 'a', invocation: '/x:a' }], { pipeline: true });
    assert.equal(r.confidence, 1.0);
    assert.deepEqual([...r.heuristics_hit], ['H1']);
  });

  it('uses manifest.orchestration.canonical_flow when provided', () => {
    const r = detect('x',
      [
        { name: 'alpha', invocation: '/x:alpha' },
        { name: 'beta', invocation: '/x:beta' },
      ],
      { orchestration: { canonical_flow: ['/x:alpha', '/x:beta'] } }
    );
    assert.deepEqual([...r.suggested_canonical_flow], ['/x:alpha', '/x:beta']);
  });
});

describe('detect — H2 sequential naming', () => {
  it('flags 3+ skills with workflow tokens', () => {
    const skills = [
      { name: 'foo-init',    invocation: '/foo:init' },
      { name: 'foo-design',  invocation: '/foo:design' },
      { name: 'foo-impl',    invocation: '/foo:impl' },
      { name: 'foo-validate',invocation: '/foo:validate' },
    ];
    const r = detect('foo', skills);
    assert.ok([...r.heuristics_hit].includes('H2'));
    assert.ok(r.confidence >= THRESHOLD_FLAG);
  });

  it('matches phase-N naming', () => {
    const skills = [
      { name: 'phase-1', invocation: '/p:phase-1' },
      { name: 'phase-2', invocation: '/p:phase-2' },
      { name: 'phase-3', invocation: '/p:phase-3' },
    ];
    const r = detect('p', skills);
    assert.ok([...r.heuristics_hit].includes('H2'));
  });

  it('does not flag when only 2 workflow tokens', () => {
    const skills = [
      { name: 'init',   invocation: '/a:init' },
      { name: 'run',    invocation: '/a:run' },
      { name: 'random', invocation: '/a:random' },
    ];
    const r = detect('a', skills);
    assert.ok(![...r.heuristics_hit].includes('H2') || r.heuristics_hit.length > 1);
  });
});

describe('detect — H3 spec+impl+validate triad', () => {
  it('hits when at least one skill each for spec, impl, validate', () => {
    const skills = [
      { name: 'brainstorm-X', invocation: '/x:brainstorm' },
      { name: 'execute-X',    invocation: '/x:execute' },
      { name: 'verify-X',     invocation: '/x:verify' },
    ];
    const r = detect('x', skills);
    assert.ok([...r.heuristics_hit].includes('H3'));
  });

  it('does not hit without impl skill', () => {
    const skills = [
      { name: 'brainstorm', invocation: '/a:brainstorm' },
      { name: 'design',     invocation: '/a:design' },
      { name: 'verify',     invocation: '/a:verify' },
    ];
    const r = detect('a', skills);
    // Note: H2 may hit from "brainstorm/design/verify" tokens. Check H3 specifically.
    assert.ok(![...r.heuristics_hit].includes('H3'));
  });
});

describe('detect — H4 pipeline/orchestrator skill name', () => {
  it('hits when a skill is named "pipeline"', () => {
    const r = detect('p', [
      { name: 'pipeline',   invocation: '/p:pipeline' },
      { name: 'helper',     invocation: '/p:helper' },
    ]);
    assert.ok([...r.heuristics_hit].includes('H4'));
  });

  it('hits when a skill name contains "orchestrator"', () => {
    const r = detect('o', [
      { name: 'my-orchestrator', invocation: '/o:orchestrator' },
    ]);
    assert.ok([...r.heuristics_hit].includes('H4'));
  });
});

describe('detect — H5 shared-prefix cluster', () => {
  it('hits for 4+ skills sharing a prefix', () => {
    const skills = [
      { name: 'ce-brainstorm', invocation: '/ce-brainstorm' },
      { name: 'ce-plan',       invocation: '/ce-plan' },
      { name: 'ce-work',       invocation: '/ce-work' },
      { name: 'ce-commit',     invocation: '/ce-commit' },
    ];
    const r = detect('compound-engineering', skills);
    assert.ok([...r.heuristics_hit].includes('H5'));
  });

  it('does not hit with only 3 shared-prefix skills', () => {
    const skills = [
      { name: 'a-one',   invocation: '/a-one' },
      { name: 'a-two',   invocation: '/a-two' },
      { name: 'a-three', invocation: '/a-three' },
    ];
    const r = detect('a', skills);
    assert.ok(![...r.heuristics_hit].includes('H5'));
  });
});

describe('detect — non-matching cases', () => {
  it('confidence 0 for unrelated skill set', () => {
    const skills = [
      { name: 'random',  invocation: '/x:random' },
      { name: 'helper',  invocation: '/x:helper' },
    ];
    const r = detect('x', skills);
    assert.equal(r.confidence, 0);
    assert.deepEqual([...r.heuristics_hit], []);
  });

  it('returns empty suggested_canonical_flow below threshold', () => {
    const skills = [{ name: 'only-one', invocation: '/x:only' }];
    const r = detect('x', skills);
    assert.deepEqual([...r.suggested_canonical_flow], []);
  });
});

describe('detect — strong confidence', () => {
  it('sdd-like 3-skill pattern hits H2 with confidence 0.4 (below flag threshold)', () => {
    // Real SDD has /sdd:brainstorm /sdd:plan /sdd:implement — no validate skill,
    // so H3 does NOT hit. Only H2 (3 workflow tokens) hits → confidence 0.4.
    // Real SDD is protected by the hardcoded base list, not by heuristic detection.
    const skills = [
      { name: 'brainstorm', invocation: '/sdd:brainstorm' },
      { name: 'plan',       invocation: '/sdd:plan' },
      { name: 'implement',  invocation: '/sdd:implement' },
    ];
    const r = detect('sdd', skills);
    assert.ok([...r.heuristics_hit].includes('H2'));
    assert.ok(r.confidence >= 0.4 && r.confidence < THRESHOLD_FLAG);
  });

  it('full kiro-like pattern (H2+H3) reaches flag threshold', () => {
    const skills = [
      { name: 'discovery',   invocation: '/k:discovery' },
      { name: 'spec-design', invocation: '/k:design' },
      { name: 'spec-impl',   invocation: '/k:impl' },
      { name: 'validate',    invocation: '/k:validate' },
    ];
    const r = detect('k', skills);
    assert.ok([...r.heuristics_hit].includes('H2'));
    assert.ok([...r.heuristics_hit].includes('H3'));
    assert.ok(r.confidence >= THRESHOLD_FLAG);
  });
});

describe('detectAll', () => {
  it('returns results only for plugins with confidence > 0', () => {
    const map = {
      'interesting': {
        skills: [
          { name: 'init',   invocation: '/i:init' },
          { name: 'impl',   invocation: '/i:impl' },
          { name: 'verify', invocation: '/i:verify' },
        ],
      },
      'boring': {
        skills: [{ name: 'foo', invocation: '/b:foo' }],
      },
    };
    const rs = detectAll(map);
    assert.equal(rs.length, 1);
    assert.equal(rs[0].plugin_id, 'interesting');
  });

  it('returns empty array for empty input', () => {
    assert.deepEqual([...detectAll({})], []);
  });
});

describe('orderByWorkflow', () => {
  it('sorts init before impl before validate', () => {
    const skills = [
      { name: 'foo-validate', invocation: '/a:validate' },
      { name: 'foo-init',     invocation: '/a:init' },
      { name: 'foo-impl',     invocation: '/a:impl' },
    ];
    const ordered = orderByWorkflow(skills);
    assert.equal(ordered[0], '/a:init');
    assert.equal(ordered[ordered.length - 1], '/a:validate');
  });
});
