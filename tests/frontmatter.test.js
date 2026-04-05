const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseFrontmatter, coerceScalar } = require('../lib/frontmatter');

describe('parseFrontmatter', () => {
  it('extracts basic key:value strings', () => {
    const content = '---\nname: test-skill\ndescription: A test skill\n---\n\nBody';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'test-skill');
    assert.equal(fm.description, 'A test skill');
  });

  it('returns null for content without frontmatter delimiters', () => {
    assert.equal(parseFrontmatter('Just plain text'), null);
  });

  it('returns null for empty frontmatter block', () => {
    assert.equal(parseFrontmatter('---\n---\n\nBody'), null);
  });

  it('strips UTF-8 BOM and parses correctly', () => {
    const content = '\uFEFF---\nname: bom-skill\n---\n\nBody';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'bom-skill');
  });

  it('handles Windows CRLF line endings identically to LF', () => {
    const lf = '---\nname: win-skill\ndescription: Windows test\n---\n\nContent';
    const crlf = '---\r\nname: win-skill\r\ndescription: Windows test\r\n---\r\n\r\nContent';
    assert.deepEqual(parseFrontmatter(crlf), parseFrontmatter(lf));
  });

  it('strips double-quoted values', () => {
    const content = '---\nname: "my-skill"\ndescription: "A quoted description"\n---';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'my-skill');
    assert.equal(fm.description, 'A quoted description');
  });

  it('strips single-quoted values', () => {
    const content = "---\nname: 'my-skill'\n---";
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'my-skill');
  });

  it('parses inline array key: [a, b, c]', () => {
    const content = '---\naliases: [item1, item2, item3]\n---';
    const fm = parseFrontmatter(content);
    assert.deepEqual(fm.aliases, ['item1', 'item2', 'item3']);
  });

  it('trims elements in inline array with spaces', () => {
    const content = '---\naliases: [ a , b , c ]\n---';
    const fm = parseFrontmatter(content);
    assert.deepEqual(fm.aliases, ['a', 'b', 'c']);
  });

  it('parses YAML dash list as array', () => {
    const content = '---\naliases:\n  - item1\n  - item2\n---';
    const fm = parseFrontmatter(content);
    assert.deepEqual(fm.aliases, ['item1', 'item2']);
  });

  it('handles YAML dash list with blank lines inside block', () => {
    const content = '---\naliases:\n  - item1\n\n  - item2\n---';
    const fm = parseFrontmatter(content);
    assert.deepEqual(fm.aliases, ['item1', 'item2']);
  });

  it('coerces true/false to JS booleans', () => {
    const content = '---\ndestructive: false\nrequires_user_input: true\n---';
    const fm = parseFrontmatter(content);
    assert.equal(fm.destructive, false);
    assert.equal(fm.requires_user_input, true);
  });

  it('coerces numeric strings to JS numbers', () => {
    const content = '---\nestimated_tokens: 5000\npi: 3.14\n---';
    const fm = parseFrontmatter(content);
    assert.equal(fm.estimated_tokens, 5000);
    assert.equal(fm.pi, 3.14);
  });

  it('coerces null and ~ to JS null', () => {
    const content = '---\ncategory: null\ndomain: ~\n---';
    const fm = parseFrontmatter(content);
    assert.equal(fm.category, null);
    assert.equal(fm.domain, null);
  });

  it('skips comment lines', () => {
    const content = '---\n# This is a comment\nname: test-skill\n---';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'test-skill');
    assert.equal(Object.keys(fm).length, 1);
  });

  it('skips blank lines between keys', () => {
    const content = '---\nname: test\n\ndescription: desc\n---';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'test');
    assert.equal(fm.description, 'desc');
  });

  it('handles pipe multiline (|) with indented continuation', () => {
    const content = '---\nname: test\ndescription: |\n  line one\n  line two\n---';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'test');
    assert.ok(fm.description.includes('line one'));
    assert.ok(fm.description.includes('line two'));
  });

  it('handles mixed fields: strings + arrays + booleans in single block', () => {
    const content = '---\nname: mixed-skill\ndestructive: false\naliases:\n  - one\n  - two\n---';
    const fm = parseFrontmatter(content);
    assert.equal(fm.name, 'mixed-skill');
    assert.equal(fm.destructive, false);
    assert.deepEqual(fm.aliases, ['one', 'two']);
  });

  it('parses keys with underscore prefix', () => {
    const content = '---\n_key: value\n---';
    const fm = parseFrontmatter(content);
    assert.equal(fm._key, 'value');
  });
});

describe('coerceScalar', () => {
  it("returns boolean true for 'true'", () => {
    assert.equal(coerceScalar('true'), true);
  });

  it("returns boolean false for 'false'", () => {
    assert.equal(coerceScalar('false'), false);
  });

  it("returns null for 'null'", () => {
    assert.equal(coerceScalar('null'), null);
  });

  it("returns null for '~'", () => {
    assert.equal(coerceScalar('~'), null);
  });

  it("returns number 42 for '42'", () => {
    assert.equal(coerceScalar('42'), 42);
  });

  it("returns number 3.14 for '3.14'", () => {
    assert.equal(coerceScalar('3.14'), 3.14);
  });

  it("returns string 'hello' for 'hello'", () => {
    assert.equal(coerceScalar('hello'), 'hello');
  });

  it("returns empty string for ''", () => {
    assert.equal(coerceScalar(''), '');
  });
});
