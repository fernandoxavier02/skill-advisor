const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { AdvisorError, debugLog, ERROR_CODES } = require('../lib/errors');

describe('AdvisorError', () => {
  it('instantiates with code, message, and context', () => {
    const context = { filePath: '/test/path' };
    const err = new AdvisorError(ERROR_CODES.FS_READ, 'Read failed', { context });
    assert.equal(err.code, ERROR_CODES.FS_READ);
    assert.equal(err.message, 'Read failed');
    assert.deepEqual(err.context, context);
  });

  it('extends Error', () => {
    const err = new AdvisorError(ERROR_CODES.FS_READ, 'msg');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof AdvisorError);
  });

  it('captures cause', () => {
    const original = new Error('Original error');
    const err = new AdvisorError(ERROR_CODES.PARSE_JSON, 'Parse failed', { cause: original });
    assert.equal(err.cause, original);
  });
});

describe('ERROR_CODES', () => {
  it('exports all 6 expected codes', () => {
    assert.ok(ERROR_CODES.FS_READ);
    assert.ok(ERROR_CODES.FS_WALK);
    assert.ok(ERROR_CODES.PARSE_JSON);
    assert.ok(ERROR_CODES.PARSE_FRONTMATTER);
    assert.ok(ERROR_CODES.MODULE_LOAD);
    assert.ok(ERROR_CODES.EMBED_LOAD);
  });
});

describe('debugLog', () => {
  const originalEnv = process.env.ADVISOR_DEBUG;
  const originalStderrWrite = process.stderr.write;

  it('is a no-op when ADVISOR_DEBUG is unset', () => {
    delete process.env.ADVISOR_DEBUG;
    let written = false;
    process.stderr.write = () => { written = true; };
    
    debugLog(ERROR_CODES.FS_READ, 'should not log', { path: 'foo' });
    
    process.stderr.write = originalStderrWrite;
    assert.equal(written, false);
  });

  it('writes to stderr when ADVISOR_DEBUG is set', () => {
    process.env.ADVISOR_DEBUG = '1';
    let output = '';
    process.stderr.write = (chunk) => { output += chunk; };
    
    const context = { filePath: 'test.js' };
    debugLog(ERROR_CODES.FS_READ, 'test message', context);
    
    process.stderr.write = originalStderrWrite;
    assert.ok(output.includes('[ADVISOR_DEBUG]'));
    assert.ok(output.includes(ERROR_CODES.FS_READ));
    assert.ok(output.includes('test message'));
    assert.ok(output.includes('test.js'));
  });

  // Cleanup
  process.env.ADVISOR_DEBUG = originalEnv;
});
