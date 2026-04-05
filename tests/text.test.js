const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAccents, STOPWORDS, SYNONYMS, tokenize } = require('../lib/text');

describe('normalizeAccents', () => {
  it('strips accents from Portuguese characters', () => {
    assert.equal(normalizeAccents('correção'), 'correcao');
    assert.equal(normalizeAccents('segurança'), 'seguranca');
    assert.equal(normalizeAccents('índice'), 'indice');
  });

  it('lowercases input', () => {
    assert.equal(normalizeAccents('HELLO World'), 'hello world');
  });

  it('trims whitespace', () => {
    assert.equal(normalizeAccents('  hello  '), 'hello');
  });

  it('handles empty string', () => {
    assert.equal(normalizeAccents(''), '');
  });
});

describe('STOPWORDS', () => {
  it('contains PT-BR stopwords', () => {
    assert.ok(STOPWORDS.has('quero'));
    assert.ok(STOPWORDS.has('preciso'));
    assert.ok(STOPWORDS.has('fazer'));
  });

  it('contains EN stopwords', () => {
    assert.ok(STOPWORDS.has('the'));
    assert.ok(STOPWORDS.has('and'));
    assert.ok(STOPWORDS.has('for'));
  });

  it('is a Set instance', () => {
    assert.ok(STOPWORDS instanceof Set);
  });

  it('has expected size (~54 entries)', () => {
    assert.ok(STOPWORDS.size >= 50, `Expected >= 50, got ${STOPWORDS.size}`);
  });
});

describe('SYNONYMS', () => {
  it('contains PT-BR to EN pairs', () => {
    assert.deepEqual(SYNONYMS.get('auditar'), ['audit', 'review']);
    assert.ok(SYNONYMS.get('seguranca').includes('security'));
  });

  it('is a Map instance', () => {
    assert.ok(SYNONYMS instanceof Map);
  });

  it('each value is an array of strings', () => {
    for (const [key, val] of SYNONYMS) {
      assert.ok(Array.isArray(val), `Value for ${key} is not an array`);
      for (const s of val) {
        assert.equal(typeof s, 'string', `Non-string value in synonym ${key}`);
      }
    }
  });

  it('has expected size (50+ entries)', () => {
    assert.ok(SYNONYMS.size >= 50, `Expected >= 50, got ${SYNONYMS.size}`);
  });
});

describe('tokenize', () => {
  it('lowercases and splits on spaces', () => {
    const tokens = tokenize('Hello World Test');
    assert.ok(tokens.includes('hello'));
    assert.ok(tokens.includes('world'));
    assert.ok(tokens.includes('test'));
  });

  it('removes stopwords', () => {
    const tokens = tokenize('the quick brown fox');
    assert.ok(!tokens.includes('the'));
  });

  it('strips accents (Portuguese)', () => {
    const tokens = tokenize('correção de segurança');
    assert.ok(tokens.includes('correcao'));
    assert.ok(tokens.includes('seguranca'));
  });

  it('removes punctuation', () => {
    const tokens = tokenize('hello, world! test.');
    assert.ok(tokens.includes('hello'));
    assert.ok(tokens.includes('world'));
    assert.ok(tokens.includes('test'));
  });

  it('returns empty for empty string', () => {
    assert.deepEqual(tokenize(''), []);
  });

  it('returns empty for null/undefined', () => {
    assert.deepEqual(tokenize(null), []);
    assert.deepEqual(tokenize(undefined), []);
  });

  it('returns empty for only stopwords', () => {
    assert.deepEqual(tokenize('the a an is'), []);
  });

  it('filters single-char tokens', () => {
    const tokens = tokenize('a b c test');
    assert.ok(!tokens.includes('a'));
    assert.ok(!tokens.includes('b'));
    assert.ok(tokens.includes('test'));
  });

  it('expands synonyms from PT-BR to EN', () => {
    const tokens = tokenize('auditar');
    assert.ok(tokens.includes('auditar'));
    assert.ok(tokens.includes('audit'));
    assert.ok(tokens.includes('review'));
  });

  it('combined: strips accents AND expands synonyms', () => {
    const tokens = tokenize('correção de segurança');
    assert.ok(tokens.includes('correcao'));
    assert.ok(tokens.includes('seguranca'));
  });
});
