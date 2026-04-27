'use strict';

/**
 * build-graph.test.js — Slice 5.2 (Task 6.2).
 *
 * Exercises lib/build-graph.buildGraph() against a synthetic vault fixture
 * tree (concepts/, skills/, pipelines/) so the test does not depend on the
 * user's real Obsidian vault. Per spec Req 8.2, assertions are CONCRETE
 * numeric values — not "greater than zero" handwaves.
 *
 * Coverage:
 *   - 3+ skills with varying descriptions/wikilinks
 *   - one skill with no description (graceful inclusion + empty edges)
 *   - one pair of bidirectional concept-concept edges (asserts symmetry)
 *   - alias_index populated with both original and normalized forms
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

let VAULT_DIR;
let buildGraph;

before(() => {
  // Build the fixture vault.
  VAULT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'build-graph-vault-'));
  fs.mkdirSync(path.join(VAULT_DIR, 'concepts'));
  fs.mkdirSync(path.join(VAULT_DIR, 'skills'));
  fs.mkdirSync(path.join(VAULT_DIR, 'pipelines'));

  // 2 concepts, with bidirectional link symmetry to test
  fs.writeFileSync(path.join(VAULT_DIR, 'concepts', 'debugging.md'), `---
aliases: [debug, depuração]
---
# Debugging
Related to [[testing]] and [[investigate]].
`);
  fs.writeFileSync(path.join(VAULT_DIR, 'concepts', 'testing.md'), `---
aliases: [test, qa]
---
# Testing
`);

  // 3 skills:
  fs.writeFileSync(path.join(VAULT_DIR, 'skills', 'investigate.md'), `---
aliases: [investigar]
invocation: /investigate
category: debugging
---
# Investigate
Uses [[debugging]] concept.
`);
  fs.writeFileSync(path.join(VAULT_DIR, 'skills', 'ship.md'), `---
aliases: [deploy]
invocation: /ship
category: deployment
---
# Ship
`);
  // skill with NO frontmatter (no description path) — graceful inclusion
  fs.writeFileSync(path.join(VAULT_DIR, 'skills', 'orphan.md'), `# Orphan
This skill has no frontmatter at all.
`);

  // 1 pipeline
  fs.writeFileSync(path.join(VAULT_DIR, 'pipelines', 'bugfix.md'), `---
steps: [investigate, fix, ship]
triggers: [bug, broken]
---
# Bugfix Pipeline
Refers to [[investigate]] and [[ship]].
`);

  // Set env BEFORE fresh-requiring vault-config + paths + build-graph.
  process.env.SKILL_ADVISOR_VAULT_PATH = VAULT_DIR;
  delete require.cache[require.resolve('../lib/vault-config')];
  delete require.cache[require.resolve('../lib/paths')];
  delete require.cache[require.resolve('../lib/build-graph')];
  ({ buildGraph } = require('../lib/build-graph'));
});

after(() => {
  delete process.env.SKILL_ADVISOR_VAULT_PATH;
});

describe('build-graph: node enumeration (Req 8.2)', () => {
  it('Given the fixture vault (2 concepts, 3 skills, 1 pipeline), When buildGraph runs, Then nodes contains exactly 6 entries', () => {
    const g = buildGraph();
    const ids = Object.keys(g.nodes);
    assert.equal(ids.length, 6, `expected 6 nodes, got ${ids.length}: ${ids.join(',')}`);
  });

  it('Given the fixture, When buildGraph runs, Then 2 concept nodes, 3 skill nodes, 1 pipeline node are present', () => {
    const g = buildGraph();
    const counts = { concept: 0, skill: 0, pipeline: 0 };
    for (const id of Object.keys(g.nodes)) counts[g.nodes[id].type]++;
    assert.deepEqual(counts, { concept: 2, skill: 3, pipeline: 1 });
  });
});

describe('build-graph: edge resolution (Req 8.2)', () => {
  it('Given a wikilink from skill:investigate to concept:debugging, When buildGraph runs, Then the edge appears in skill:investigate.edges', () => {
    const g = buildGraph();
    assert.ok(g.nodes['skill:investigate'].edges.includes('concept:debugging'),
      `edges: ${g.nodes['skill:investigate'].edges.join(',')}`);
  });

  it('Given two concepts mutually linked, When buildGraph runs, Then bidirectional edges exist (concept:debugging↔concept:testing)', () => {
    const g = buildGraph();
    // debugging links to testing explicitly via wikilink; the bidirectional
    // back-edge is added by build-graph step 5.
    assert.ok(g.nodes['concept:debugging'].edges.includes('concept:testing'));
    assert.ok(g.nodes['concept:testing'].edges.includes('concept:debugging'),
      'bidirectional symmetry missing');
  });

  it('Given a pipeline with wikilinks to two skills, When buildGraph runs, Then both skill nodeIds appear in pipeline edges', () => {
    const g = buildGraph();
    const e = g.nodes['pipeline:bugfix'].edges;
    assert.ok(e.includes('skill:investigate'), `expected skill:investigate in ${e.join(',')}`);
    assert.ok(e.includes('skill:ship'));
  });
});

describe('build-graph: graceful no-frontmatter (Req 8.2)', () => {
  it('Given a skill file with no frontmatter, When buildGraph runs, Then it is included in the node set with empty aliases array and no error', () => {
    const g = buildGraph();
    const orphan = g.nodes['skill:orphan'];
    assert.ok(orphan, 'orphan skill must be in the node set');
    assert.deepEqual(orphan.aliases, []);
    assert.equal(orphan.invocation, '/orphan'); // default fallback
  });
});

describe('build-graph: extractWikilinks pipe form (Slice 6.6 polish)', () => {
  it('Given a body containing aliased wikilink [[name|display]], When extractWikilinks runs, Then the canonical name (left of |) is extracted, not the display alias', () => {
    delete require.cache[require.resolve('../lib/build-graph')];
    const { extractWikilinks } = require('../lib/build-graph');
    const links = extractWikilinks('See [[debugging|debug]] and [[testing|qa]] for context.');
    assert.deepEqual(links, ['debugging', 'testing']);
  });

  it('Given a body with mixed plain and aliased wikilinks, When extractWikilinks runs, Then both forms produce canonical lowercase names with no duplicates', () => {
    const { extractWikilinks } = require('../lib/build-graph');
    const links = extractWikilinks('[[Foo]] and [[Foo|alias-of-foo]] should dedupe.');
    assert.deepEqual(links, ['foo']);
  });
});

describe('build-graph: scanDir on missing directory (Slice 6.6 polish)', () => {
  it('Given a non-existent directory path, When buildGraph runs (covering scanDir defensively), Then it returns a graph with empty nodes for that directory bucket and no throw', () => {
    // We can exercise this by pointing the env to a vault dir whose
    // subdirectories (concepts/, skills/, pipelines/) do NOT exist.
    const ghostVault = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-vault-'));
    // Note: we do NOT create concepts/skills/pipelines/ inside.
    process.env.SKILL_ADVISOR_VAULT_PATH = ghostVault;
    delete require.cache[require.resolve('../lib/vault-config')];
    delete require.cache[require.resolve('../lib/paths')];
    delete require.cache[require.resolve('../lib/build-graph')];
    const { buildGraph: bg } = require('../lib/build-graph');
    const g = bg();
    assert.deepEqual(Object.keys(g.nodes), []);
    assert.deepEqual(Object.keys(g.alias_index), []);
    // Restore for the alias_index test below.
    process.env.SKILL_ADVISOR_VAULT_PATH = VAULT_DIR;
    delete require.cache[require.resolve('../lib/vault-config')];
    delete require.cache[require.resolve('../lib/paths')];
    delete require.cache[require.resolve('../lib/build-graph')];
    ({ buildGraph } = require('../lib/build-graph'));
  });
});

describe('build-graph: frontmatter-only file (Slice 6.6 polish)', () => {
  it('Given a vault file with frontmatter but EMPTY body, When buildGraph runs, Then the node is included with empty wikilinks and no throw', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-only-vault-'));
    fs.mkdirSync(path.join(root, 'concepts'));
    fs.mkdirSync(path.join(root, 'skills'));
    fs.mkdirSync(path.join(root, 'pipelines'));
    fs.writeFileSync(path.join(root, 'concepts', 'stub.md'), `---
aliases: [stub-alias]
---
`);
    process.env.SKILL_ADVISOR_VAULT_PATH = root;
    delete require.cache[require.resolve('../lib/vault-config')];
    delete require.cache[require.resolve('../lib/paths')];
    delete require.cache[require.resolve('../lib/build-graph')];
    const { buildGraph: bg } = require('../lib/build-graph');
    const g = bg();
    assert.ok(g.nodes['concept:stub']);
    assert.deepEqual(g.nodes['concept:stub'].edges, []);
    // Restore main fixture binding.
    process.env.SKILL_ADVISOR_VAULT_PATH = VAULT_DIR;
    delete require.cache[require.resolve('../lib/vault-config')];
    delete require.cache[require.resolve('../lib/paths')];
    delete require.cache[require.resolve('../lib/build-graph')];
    ({ buildGraph } = require('../lib/build-graph'));
  });
});

describe('build-graph: alias_index (Req 8.2)', () => {
  it('Given aliases declared in frontmatter, When buildGraph runs, Then both original and accent-normalized forms are in alias_index pointing to the same nodeId', () => {
    const g = buildGraph();
    assert.equal(g.alias_index['debug'], 'concept:debugging');
    // 'depuração' → normalized 'depuracao'
    assert.equal(g.alias_index['depuração'], 'concept:debugging');
    assert.equal(g.alias_index['depuracao'], 'concept:debugging');
  });
});
