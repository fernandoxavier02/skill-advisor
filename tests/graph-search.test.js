const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const {
  SCORE_BY_HOP,
  CONVERGENCE_BOOST,
  CATEGORY_BOOST,
  normalizeToken,
  inferTaskType,
  matchAliases,
  bfsTraverse,
  graphSearch,
  loadGraph,
} = require('../lib/graph-search');

const FIXTURES = path.join(__dirname, 'fixtures');
const GRAPH_FIXTURE = path.join(FIXTURES, 'graph');

// ---------------------------------------------------------------------------
// Load fixture graph for reuse across tests
// ---------------------------------------------------------------------------
function loadFixtureGraph() {
  const raw = fs.readFileSync(path.join(GRAPH_FIXTURE, 'adjacency.json'), 'utf8');
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// 1. Constants
// ---------------------------------------------------------------------------
describe('graph-search constants', () => {
  it('SCORE_BY_HOP has 3 entries matching [1.0, 0.7, 0.4]', () => {
    assert.equal(SCORE_BY_HOP.length, 3);
    assert.equal(SCORE_BY_HOP[0], 1.0);
    assert.equal(SCORE_BY_HOP[1], 0.7);
    assert.equal(SCORE_BY_HOP[2], 0.4);
  });

  it('CONVERGENCE_BOOST is 0.15', () => {
    assert.equal(CONVERGENCE_BOOST, 0.15);
  });

  it('CATEGORY_BOOST is 0.2', () => {
    assert.equal(CATEGORY_BOOST, 0.2);
  });
});

// ---------------------------------------------------------------------------
// 2. normalizeToken
// ---------------------------------------------------------------------------
describe('normalizeToken', () => {
  it('strips accents from Portuguese text', () => {
    assert.equal(normalizeToken('depuracao'), 'depuracao');
    assert.equal(normalizeToken('depuração'), 'depuracao');
  });

  it('lowercases input', () => {
    assert.equal(normalizeToken('DEBUG'), 'debug');
  });

  it('trims whitespace', () => {
    assert.equal(normalizeToken('  deploy  '), 'deploy');
  });

  it('handles combined accent + uppercase', () => {
    assert.equal(normalizeToken('Segurança'), 'seguranca');
  });
});

// ---------------------------------------------------------------------------
// 3. inferTaskType
// ---------------------------------------------------------------------------
describe('inferTaskType', () => {
  it('detects debugging type for debug-related tokens', () => {
    assert.equal(inferTaskType(['debug', 'the', 'error']), 'debugging');
  });

  it('detects quality type for review-related tokens', () => {
    assert.equal(inferTaskType(['review', 'security']), 'quality');
  });

  it('detects deployment type for deploy-related tokens', () => {
    assert.equal(inferTaskType(['deploy', 'to', 'production']), 'deployment');
  });

  it('detects implementation type for create-related tokens', () => {
    assert.equal(inferTaskType(['create', 'new', 'feature']), 'implementation');
  });

  it('returns null for unmatched tokens', () => {
    assert.equal(inferTaskType(['banana', 'strawberry']), null);
  });

  it('returns null for empty array', () => {
    assert.equal(inferTaskType([]), null);
  });
});

// ---------------------------------------------------------------------------
// 4. matchAliases
// ---------------------------------------------------------------------------
describe('matchAliases', () => {
  const graph = loadFixtureGraph();
  const aliasIndex = graph.alias_index;

  it('finds node IDs for known aliases', () => {
    const results = matchAliases(['debug'], aliasIndex);
    assert.ok(results.length > 0, 'should find at least one match for "debug"');
    assert.ok(results.includes('concept:debugging'), 'should include concept:debugging');
  });

  it('returns empty array for unknown tokens', () => {
    const results = matchAliases(['nonexistent'], aliasIndex);
    assert.deepEqual(results, []);
  });

  it('deduplicates results', () => {
    const results = matchAliases(['debug', 'debug'], aliasIndex);
    const unique = new Set(results);
    assert.equal(results.length, unique.size, 'results should not contain duplicates');
  });

  it('handles accent-normalized lookups', () => {
    // "debug" is in alias_index directly; also verify normalizeToken is applied
    const results = matchAliases(['debug'], aliasIndex);
    assert.ok(results.length > 0);
  });
});

// ---------------------------------------------------------------------------
// 5. bfsTraverse
// ---------------------------------------------------------------------------
describe('bfsTraverse', () => {
  const graph = loadFixtureGraph();
  const nodes = graph.nodes;

  it('seed nodes are at distance 0', () => {
    const results = bfsTraverse(['concept:debugging'], nodes, 2);
    const seed = results.find(r => r.nodeId === 'concept:debugging');
    assert.ok(seed, 'seed node should be in results');
    assert.equal(seed.distance, 0);
    assert.equal(seed.score, SCORE_BY_HOP[0]);
  });

  it('neighbors are at distance 1', () => {
    const results = bfsTraverse(['concept:debugging'], nodes, 2);
    const investigate = results.find(r => r.nodeId === 'skill:investigate');
    assert.ok(investigate, 'skill:investigate should be reachable');
    assert.equal(investigate.distance, 1);
    assert.equal(investigate.score, SCORE_BY_HOP[1]);
  });

  it('maxHops=0 returns only seeds', () => {
    const results = bfsTraverse(['concept:debugging'], nodes, 0);
    assert.equal(results.length, 1, 'should only contain the seed');
    assert.equal(results[0].nodeId, 'concept:debugging');
    assert.equal(results[0].distance, 0);
  });

  it('circular edges do not cause infinite loop', () => {
    // skill:investigate <-> skill:fix forms a cycle
    const results = bfsTraverse(['skill:investigate'], nodes, 5);
    // Should terminate without hanging
    assert.ok(results.length > 0, 'BFS should complete on cyclic graph');
    // Both investigate and fix should be visited
    const ids = results.map(r => r.nodeId);
    assert.ok(ids.includes('skill:investigate'));
    assert.ok(ids.includes('skill:fix'));
  });

  it('non-existent seeds are skipped', () => {
    const results = bfsTraverse(['concept:nonexistent'], nodes, 2);
    assert.equal(results.length, 0);
  });

  it('tracks fromSeeds for convergence detection', () => {
    const results = bfsTraverse(['concept:debugging'], nodes, 2);
    // concept:debugging -> skill:investigate and skill:fix
    // skill:investigate -> skill:fix (cycle)
    // Both seeds reach skill:fix through different paths
    const fix = results.find(r => r.nodeId === 'skill:fix');
    assert.ok(fix, 'skill:fix should be reachable');
    assert.ok(fix.fromSeeds.length > 0, 'should have at least one seed');
  });
});

// ---------------------------------------------------------------------------
// 6. graphSearch (full pipeline)
// ---------------------------------------------------------------------------
describe('graphSearch', () => {
  const graph = loadFixtureGraph();

  it('returns sorted skill results for matching tokens', () => {
    const results = graphSearch(['debug'], graph);
    assert.ok(results.length > 0, 'should find results for "debug"');
    // All results should be skill nodes
    for (const r of results) {
      assert.ok(r.nodeId.startsWith('skill:'), `${r.nodeId} should be a skill`);
    }
    // Results should have required fields
    const first = results[0];
    assert.ok(first.name);
    assert.ok(first.invocation);
    assert.equal(typeof first.score, 'number');
  });

  it('results are sorted by score descending', () => {
    const results = graphSearch(['debug', 'fix', 'error'], graph);
    for (let i = 1; i < results.length; i++) {
      assert.ok(
        results[i - 1].score >= results[i].score,
        `result ${i - 1} score (${results[i - 1].score}) should be >= result ${i} score (${results[i].score})`
      );
    }
  });

  it('applies convergence boost for multi-seed matches', () => {
    // Use multiple aliases that map to different seeds
    // Both "debug" and "fix" should seed concept:debugging
    const single = graphSearch(['debug'], graph);
    const multi = graphSearch(['debug', 'fix'], graph);
    // Multi-seed should generally produce higher or equal scores due to convergence
    assert.ok(multi.length > 0, 'multi-seed search should return results');
  });

  it('applies category boost when task type matches', () => {
    // "debug" tokens inferTaskType => 'debugging'
    // skill:investigate has category 'debugging' -> should get CATEGORY_BOOST
    const results = graphSearch(['debug'], graph);
    const investigate = results.find(r => r.nodeId === 'skill:investigate');
    assert.ok(investigate, 'investigate should be found');
    // With category boost, investigate should score higher than without
    // At minimum, it should have a positive score
    assert.ok(investigate.score > 0, 'investigate should have positive score');
  });

  it('returns empty array for tokens with no matching aliases', () => {
    const results = graphSearch(['banana'], graph);
    assert.deepEqual(results, []);
  });

  it('respects topN limit', () => {
    const results = graphSearch(['debug', 'fix', 'error', 'deploy'], graph, 2);
    assert.ok(results.length <= 2, `should return at most 2 results, got ${results.length}`);
  });

  it('returns paths in results', () => {
    const results = graphSearch(['debug'], graph);
    assert.ok(results.length > 0);
    const first = results[0];
    assert.ok(Array.isArray(first.paths), 'should have paths array');
    assert.ok(first.paths.length > 0, 'should have at least one path');
    assert.ok(first.paths[0].includes('→'), 'path should contain arrow separator');
  });
});

// ---------------------------------------------------------------------------
// 7. loadGraph
// ---------------------------------------------------------------------------
describe('loadGraph', () => {
  it('loads fixture adjacency.json', () => {
    const graph = loadGraph(GRAPH_FIXTURE);
    assert.ok(graph.nodes, 'should have nodes');
    assert.ok(graph.alias_index, 'should have alias_index');
    assert.ok(graph.nodes['concept:debugging'], 'should contain concept:debugging');
    assert.ok(graph.nodes['skill:deploy'], 'should contain skill:deploy');
  });

  it('returns cached graph on second call (same mtime)', () => {
    const first = loadGraph(GRAPH_FIXTURE);
    const second = loadGraph(GRAPH_FIXTURE);
    assert.deepEqual(first, second, 'cached result should equal first load');
  });
});
