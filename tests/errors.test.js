const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('errors.js', () => {
  describe('ERROR_CODES', () => {
    it('exports all expected codes', () => {
      const { ERROR_CODES } = require('../lib/errors');
      assert.equal(ERROR_CODES.FS_READ, 'FS_READ');
      assert.equal(ERROR_CODES.FS_WALK, 'FS_WALK');
      assert.equal(ERROR_CODES.PARSE_JSON, 'PARSE_JSON');
      assert.equal(ERROR_CODES.PARSE_FRONTMATTER, 'PARSE_FRONTMATTER');
      assert.equal(ERROR_CODES.MODULE_LOAD, 'MODULE_LOAD');
      assert.equal(ERROR_CODES.EMBED_LOAD, 'EMBED_LOAD');
    });

    it('has exactly 6 codes', () => {
      const { ERROR_CODES } = require('../lib/errors');
      assert.equal(Object.keys(ERROR_CODES).length, 6);
    });
  });

  describe('AdvisorError', () => {
    const { AdvisorError, ERROR_CODES } = require('../lib/errors');

    it('extends Error', () => {
      const err = new AdvisorError(ERROR_CODES.FS_READ, 'test');
      assert.ok(err instanceof Error);
    });

    it('sets name to AdvisorError', () => {
      const err = new AdvisorError(ERROR_CODES.FS_READ, 'test');
      assert.equal(err.name, 'AdvisorError');
    });

    it('sets code property', () => {
      const err = new AdvisorError(ERROR_CODES.FS_READ, 'test');
      assert.equal(err.code, 'FS_READ');
    });

    it('sets message property', () => {
      const err = new AdvisorError(ERROR_CODES.FS_READ, 'something failed');
      assert.equal(err.message, 'something failed');
    });

    it('sets context to empty object when not provided', () => {
      const err = new AdvisorError(ERROR_CODES.FS_READ, 'test');
      assert.deepEqual(err.context, {});
    });

    it('sets context when provided', () => {
      const ctx = { path: '/foo/bar', line: 42 };
      const err = new AdvisorError(ERROR_CODES.FS_READ, 'test', { context: ctx });
      assert.deepEqual(err.context, ctx);
    });

    it('sets cause when provided', () => {
      const original = new Error('original');
      const err = new AdvisorError(ERROR_CODES.PARSE_JSON, 'wrapped', { cause: original });
      assert.equal(err.cause, original);
    });

    it('does not set cause when not provided', () => {
      const err = new AdvisorError(ERROR_CODES.FS_READ, 'test');
      assert.equal(err.cause, undefined);
    });
  });

  describe('debugLog', () => {
    const { debugLog } = require('../lib/errors');
    let originalDebug;

    beforeEach(() => {
      originalDebug = process.env.ADVISOR_DEBUG;
      delete process.env.ADVISOR_DEBUG;
    });

    afterEach(() => {
      if (originalDebug !== undefined) {
        process.env.ADVISOR_DEBUG = originalDebug;
      } else {
        delete process.env.ADVISOR_DEBUG;
      }
    });

    it('is a no-op when ADVISOR_DEBUG is unset', () => {
      assert.doesNotThrow(() => {
        debugLog('FS_READ', 'test message', { path: '/foo' });
      });
    });

    it('writes to stderr when ADVISOR_DEBUG is set', () => {
      process.env.ADVISOR_DEBUG = '1';
      const chunks = [];
      const originalWrite = process.stderr.write;
      process.stderr.write = function (chunk) {
        chunks.push(chunk);
        return true;
      };

      debugLog('FS_READ', 'file not found', { path: '/tmp/test.json' });

      process.stderr.write = originalWrite;

      assert.equal(chunks.length, 1);
      const output = chunks[0];
      assert.ok(output.includes('[ADVISOR_DEBUG]'), `expected [ADVISOR_DEBUG] in: ${output}`);
      assert.ok(output.includes('FS_READ'), `expected FS_READ in: ${output}`);
      assert.ok(output.includes('file not found'), `expected message in: ${output}`);
      assert.ok(output.includes('/tmp/test.json'), `expected context in: ${output}`);
    });

    it('output format includes code, message, and context', () => {
      process.env.ADVISOR_DEBUG = '1';
      const chunks = [];
      const originalWrite = process.stderr.write;
      process.stderr.write = function (chunk) {
        chunks.push(chunk);
        return true;
      };

      debugLog('PARSE_JSON', 'bad json', { file: 'a.json', cause: 'unexpected token' });

      process.stderr.write = originalWrite;

      const output = chunks[0];
      assert.match(output, /^\[ADVISOR_DEBUG\] PARSE_JSON: bad json \{.*\}\n$/);
    });

    it('omits context when not provided', () => {
      process.env.ADVISOR_DEBUG = '1';
      const chunks = [];
      const originalWrite = process.stderr.write;
      process.stderr.write = function (chunk) {
        chunks.push(chunk);
        return true;
      };

      debugLog('MODULE_LOAD', 'no module');

      process.stderr.write = originalWrite;

      const output = chunks[0];
      assert.match(output, /^\[ADVISOR_DEBUG\] MODULE_LOAD: no module\n$/);
    });
  });
});
