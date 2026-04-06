const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const {
  walkDir,
  extractNameFromFrontmatter,
  extractPluginName,
  generateBatches,
} = require('../lib/build-catalog');

const FIXTURES = path.join(__dirname, 'fixtures');
const SAMPLE_PLUGIN = path.join(FIXTURES, 'sample-plugin');

// ---------------------------------------------------------------------------
// 1. walkDir
// ---------------------------------------------------------------------------
describe('walkDir', () => {
  it('returns files from fixture directory', () => {
    const files = walkDir(SAMPLE_PLUGIN);
    assert.ok(files.length > 0, 'should find files in sample-plugin');
    // Should find at least plugin.json, test-agent.md, test-cmd.md
    const basenames = files.map(f => path.basename(f));
    assert.ok(basenames.includes('plugin.json'), 'should find plugin.json');
    assert.ok(basenames.includes('test-agent.md'), 'should find test-agent.md');
    assert.ok(basenames.includes('test-cmd.md'), 'should find test-cmd.md');
  });

  it('respects maxDepth parameter', () => {
    // sample-plugin has: plugin.json (depth 0), agents/test-agent.md (depth 1),
    // deep/nested/dir/file.txt (depth 3)
    // With maxDepth=0, should only see top-level files
    const shallow = walkDir(SAMPLE_PLUGIN, 0);
    const deepFile = shallow.find(f => f.includes('nested'));
    assert.ok(!deepFile, 'should not find deeply nested file with maxDepth=0');
  });

  it('respects maxEntries parameter', () => {
    const limited = walkDir(SAMPLE_PLUGIN, 6, 2);
    assert.ok(limited.length <= 2, `expected at most 2 files, got ${limited.length}`);
  });

  it('skips node_modules directory', () => {
    const files = walkDir(SAMPLE_PLUGIN);
    const inNodeModules = files.filter(f => f.includes('node_modules'));
    assert.equal(inNodeModules.length, 0, 'should not include files from node_modules');
  });

  it('skips .git directory', () => {
    const files = walkDir(SAMPLE_PLUGIN);
    const inGit = files.filter(f => f.includes('.git'));
    assert.equal(inGit.length, 0, 'should not include files from .git');
  });

  it('returns empty array for non-existent directory', () => {
    const files = walkDir('/nonexistent/path/xyz');
    assert.deepEqual(files, []);
  });
});

// ---------------------------------------------------------------------------
// 2. extractNameFromFrontmatter
// ---------------------------------------------------------------------------
describe('extractNameFromFrontmatter', () => {
  it('extracts unquoted name', () => {
    const content = '---\nname: my-skill\ndescription: test\n---\nContent';
    assert.equal(extractNameFromFrontmatter(content), 'my-skill');
  });

  it('extracts double-quoted name', () => {
    const content = '---\nname: "My Skill"\ndescription: test\n---';
    assert.equal(extractNameFromFrontmatter(content), 'My Skill');
  });

  it('extracts single-quoted name', () => {
    const content = "---\nname: 'My Skill'\ndescription: test\n---";
    assert.equal(extractNameFromFrontmatter(content), 'My Skill');
  });

  it('returns null when no name field', () => {
    const content = '---\ndescription: test only\n---';
    assert.equal(extractNameFromFrontmatter(content), null);
  });

  it('returns null for content without frontmatter', () => {
    assert.equal(extractNameFromFrontmatter('just plain text'), null);
  });
});

// ---------------------------------------------------------------------------
// 3. extractPluginName
// ---------------------------------------------------------------------------
describe('extractPluginName', () => {
  it('extracts from cache path', () => {
    const filePath = '/home/user/.claude/plugins/cache/my-org/my-plugin/1.0.0/skills/SKILL.md';
    assert.equal(extractPluginName(filePath), 'my-org/my-plugin');
  });

  it('extracts from skills path', () => {
    const filePath = '/home/user/.claude/skills/my-skill/SKILL.md';
    assert.equal(extractPluginName(filePath), 'my-skill');
  });

  it('returns unknown for unrecognized path', () => {
    assert.equal(extractPluginName('/random/path/file.md'), 'unknown');
  });

  it('handles Windows-style backslashes', () => {
    const filePath = 'C:\\Users\\test\\.claude\\plugins\\cache\\org\\plugin\\1.0\\SKILL.md';
    const result = extractPluginName(filePath);
    assert.equal(result, 'org/plugin');
  });
});

// ---------------------------------------------------------------------------
// 4. generateBatches (smoke test)
// ---------------------------------------------------------------------------
describe('generateBatches', () => {
  it('returns expected shape with sources, pending, batches, existingCount', () => {
    // This calls scanSources which scans real directories.
    // The shape is what matters, not the actual content.
    const result = generateBatches();
    assert.ok('sources' in result, 'should have sources');
    assert.ok('pending' in result, 'should have pending');
    assert.ok('batches' in result, 'should have batches');
    assert.ok('existingCount' in result, 'should have existingCount');
    assert.ok(Array.isArray(result.sources), 'sources should be array');
    assert.ok(Array.isArray(result.pending), 'pending should be array');
    assert.ok(Array.isArray(result.batches), 'batches should be array');
    assert.equal(typeof result.existingCount, 'number', 'existingCount should be number');
  });

  it('pending is subset of sources', () => {
    const result = generateBatches();
    const sourceIds = new Set(result.sources.map(s => s.name.toLowerCase()));
    for (const p of result.pending) {
      assert.ok(sourceIds.has(p.name.toLowerCase()), `pending item ${p.name} should be in sources`);
    }
  });

  it('batches contain only pending items', () => {
    const result = generateBatches();
    const allBatched = result.batches.flat();
    assert.equal(allBatched.length, result.pending.length, 'all pending items should be in batches');
  });
});
