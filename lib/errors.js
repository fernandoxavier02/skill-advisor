'use strict';

const ERROR_CODES = {
  FS_READ: 'FS_READ',
  FS_WALK: 'FS_WALK',
  PARSE_JSON: 'PARSE_JSON',
  PARSE_FRONTMATTER: 'PARSE_FRONTMATTER',
  MODULE_LOAD: 'MODULE_LOAD',
  EMBED_LOAD: 'EMBED_LOAD',
};

class AdvisorError extends Error {
  constructor(code, message, { cause, context } = {}) {
    super(message);
    this.name = 'AdvisorError';
    this.code = code;
    this.context = context || {};
    if (cause) this.cause = cause;
  }
}

function debugLog(code, message, context) {
  if (!process.env.ADVISOR_DEBUG) return; // zero overhead when disabled
  const ctx = context ? ` ${JSON.stringify(context)}` : '';
  process.stderr.write(`[ADVISOR_DEBUG] ${code}: ${message}${ctx}\n`);
}

module.exports = { AdvisorError, debugLog, ERROR_CODES };
