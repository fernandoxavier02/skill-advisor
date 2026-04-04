const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { tokenize, scoreEntry, STOPWORDS } = require('../hooks/advisor-nudge.cjs');

describe('tokenize', () => {
  it('lowercases and splits on spaces', () => {
    const tokens = tokenize('Fix the Bug');
    assert.ok(tokens.includes('fix'));
    assert.ok(tokens.includes('bug'));
  });

  it('removes stopwords', () => {
    const tokens = tokenize('fix the bug in the code');
    assert.ok(!tokens.includes('the'));
    assert.ok(!tokens.includes('in'));
  });

  it('strips accents (Portuguese)', () => {
    const tokens = tokenize('correção depuração análise');
    assert.ok(tokens.includes('correcao'));
    assert.ok(tokens.includes('depuracao'));
    assert.ok(tokens.includes('analise'));
  });

  it('removes punctuation', () => {
    const tokens = tokenize('fix! the, bug? now.');
    assert.ok(tokens.includes('fix'));
    assert.ok(tokens.includes('bug'));
    assert.ok(tokens.includes('now'));
  });

  it('returns empty for empty string', () => {
    assert.deepEqual(tokenize(''), []);
  });

  it('returns empty for null/undefined', () => {
    assert.deepEqual(tokenize(null), []);
    assert.deepEqual(tokenize(undefined), []);
  });

  it('returns empty for only stopwords', () => {
    const tokens = tokenize('the a in of');
    assert.equal(tokens.length, 0);
  });

  it('filters single-char tokens', () => {
    const tokens = tokenize('a b c debug');
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0], 'debug');
  });

  it('handles PT-BR stopwords', () => {
    const tokens = tokenize('quero fazer um deploy para producao');
    assert.ok(!tokens.includes('quero'));
    assert.ok(!tokens.includes('fazer'));
    assert.ok(!tokens.includes('um'));
    assert.ok(!tokens.includes('para'));
    assert.ok(tokens.includes('deploy'));
    assert.ok(tokens.includes('producao'));
  });
});

describe('scoreEntry', () => {
  const sampleEntry = {
    name: 'investigate',
    description: 'Systematic debugging with root cause investigation and error analysis',
    invocation: '/investigate',
    category: 'debugging',
  };

  it('scores higher when prompt matches name', () => {
    const tokens = tokenize('investigate the error');
    const score = scoreEntry(tokens, sampleEntry);
    assert.ok(score > 0, 'should have positive score');
  });

  it('scores higher for name match than description match', () => {
    const nameTokens = tokenize('investigate');
    const descTokens = tokenize('debugging');
    const nameScore = scoreEntry(nameTokens, sampleEntry);
    const descScore = scoreEntry(descTokens, sampleEntry);
    assert.ok(nameScore > descScore, `name score (${nameScore}) should beat desc score (${descScore})`);
  });

  it('returns 0 for empty prompt tokens', () => {
    assert.equal(scoreEntry([], sampleEntry), 0);
  });

  it('returns 0 for entry with no description', () => {
    const noDesc = { name: 'foo', description: '', invocation: '/foo' };
    const tokens = tokenize('fix the bug');
    assert.equal(scoreEntry(tokens, noDesc), 0);
  });

  it('returns 0 when no keywords match', () => {
    const tokens = tokenize('banana strawberry mango');
    const score = scoreEntry(tokens, sampleEntry);
    assert.equal(score, 0);
  });

  it('returns score between 0 and 1', () => {
    const tokens = tokenize('investigate debugging error root cause');
    const score = scoreEntry(tokens, sampleEntry);
    assert.ok(score >= 0 && score <= 1, `score ${score} out of [0,1] range`);
  });

  it('handles multiple matching keywords', () => {
    const tokens = tokenize('debugging error analysis root cause');
    const score = scoreEntry(tokens, sampleEntry);
    assert.ok(score > 0.1, 'multiple matches should score well');
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
});
