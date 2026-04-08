const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { parseFrontmatter, inferCategory, dedup, scanSkills, buildLiteIndex } = require('../lib/build-index');

const FIXTURES = path.join(__dirname, 'fixtures');

describe('parseFrontmatter', () => {
  it('extracts name and description from valid frontmatter', () => {
    const content = '---\nname: test-skill\ndescription: A test skill for debugging\n---\n\n# Content';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'test-skill');
    assert.equal(fm.description, 'A test skill for debugging');
  });

  it('returns null for content without frontmatter', () => {
    const content = 'Just plain text without frontmatter.';
    const fm = parseFrontmatter(content);
    assert.equal(fm, null);
  });

  it('handles empty frontmatter block', () => {
    const content = '---\n---\n\nContent';
    const fm = parseFrontmatter(content);
    // Empty block between --- delimiters has no key-value pairs to parse
    // Regex matches but yields empty string, parser returns null
    assert.equal(fm, null);
  });

  it('handles quoted values', () => {
    const content = '---\nname: "my-skill"\ndescription: "A quoted description"\n---';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'my-skill');
    assert.equal(fm.description, 'A quoted description');
  });

  it('handles multiline pipe values', () => {
    const content = '---\nname: test\ndescription: |\n  line one\n  line two\n---';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'test');
    assert.ok(fm.description.includes('line one'));
    assert.ok(fm.description.includes('line two'));
  });

  it('handles Windows CRLF line endings', () => {
    const content = '---\r\nname: win-skill\r\ndescription: Windows test\r\n---\r\n\r\nContent';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'win-skill');
    assert.equal(fm.description, 'Windows test');
  });

  it('handles BOM-prefixed files (Windows UTF-8)', () => {
    const content = '\uFEFF---\nname: bom-skill\ndescription: Has BOM prefix\n---\n\nContent';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'bom-skill');
    assert.equal(fm.description, 'Has BOM prefix');
  });
});

describe('inferCategory', () => {
  it('detects debugging category', () => {
    assert.equal(inferCategory('Systematic debugging with root cause analysis'), 'debugging');
  });

  it('detects deployment category', () => {
    assert.equal(inferCategory('Deploy the project to production'), 'deployment');
  });

  it('detects quality category', () => {
    assert.equal(inferCategory('Review pull requests and run security audit'), 'quality');
  });

  it('detects planning category', () => {
    assert.equal(inferCategory('Brainstorm and design new features'), 'planning');
  });

  it('defaults to utility for unknown', () => {
    assert.equal(inferCategory('something random'), 'utility');
  });

  it('handles empty string', () => {
    assert.equal(inferCategory(''), 'utility');
  });
});

describe('scanSkills', () => {
  it('scans fixture skills directory', () => {
    const entries = scanSkills(FIXTURES, 'test');
    const names = entries.map(e => e.name);
    assert.ok(names.includes('test-investigate'), 'should find test-investigate');
    assert.ok(names.includes('test-deploy'), 'should find test-deploy');
  });

  it('skips malformed frontmatter', () => {
    const malformedDir = path.join(FIXTURES, 'malformed-skill');
    const entries = scanSkills(malformedDir, 'test');
    assert.equal(entries.length, 0);
  });

  it('handles skill with empty description', () => {
    const emptyDir = path.join(FIXTURES, 'empty-skill');
    const entries = scanSkills(emptyDir, 'test');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].name, 'empty-description');
    assert.equal(entries[0].description, '');
  });

  it('returns empty array for non-existent directory', () => {
    const entries = scanSkills('/nonexistent/path', 'test');
    assert.equal(entries.length, 0);
  });

  it('sets invocation as /name', () => {
    const entries = scanSkills(FIXTURES, 'test');
    const inv = entries.find(e => e.name === 'test-investigate');
    assert.equal(inv.invocation, '/test-investigate');
  });
});

describe('dedup', () => {
  it('removes duplicate entries by id', () => {
    const entries = [
      { type: 'skill', name: 'foo', id: 'a:foo' },
      { type: 'skill', name: 'foo', id: 'a:foo' },
      { type: 'skill', name: 'bar', id: 'c:bar' },
    ];
    const result = dedup(entries);
    assert.equal(result.length, 2);
  });

  it('preserves skills with same name from different sources', () => {
    const entries = [
      { type: 'skill', name: 'fix', id: 'plugin:superpowers:fix' },
      { type: 'skill', name: 'fix', id: 'plugin:tdd:fix' },
    ];
    const result = dedup(entries);
    assert.equal(result.length, 2);
  });

  it('keeps first occurrence for same id', () => {
    const entries = [
      { type: 'skill', name: 'foo', id: 'same-id' },
      { type: 'skill', name: 'foo-v2', id: 'same-id' },
    ];
    const result = dedup(entries);
    assert.equal(result[0].name, 'foo');
  });

  it('handles empty array', () => {
    assert.deepEqual(dedup([]), []);
  });
});

describe('buildLiteIndex', () => {
  it('strips full fields, keeps only lite fields', () => {
    const full = [{
      id: 'test:foo',
      type: 'skill',
      source: 'test',
      name: 'foo',
      description: 'desc',
      invocation: '/foo',
      category: 'utility',
    }];
    const lite = buildLiteIndex(full);
    assert.equal(lite[0].id, 'test:foo');
    assert.equal(lite[0].name, 'foo');
    assert.equal(lite[0].description, 'desc');
    assert.equal(lite[0].invocation, '/foo');
    assert.equal(lite[0].category, 'utility');
    assert.equal(lite[0].type, undefined);
    assert.equal(lite[0].source, undefined);
  });
});
