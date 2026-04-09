'use strict';

const fs = require('fs');
const path = require('path');
const { debugLog } = require('./errors');

/**
 * Read a JSONL file, parsing each line individually.
 * Skips malformed lines (defensive — source data is bash-generated).
 * Returns { data: object[], errorCount: number }.
 */
function readJSONL(filePath) {
  if (typeof filePath !== 'string') return { data: [], errorCount: 0 };

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return { data: [], errorCount: 0 };
  }

  const lines = raw.split('\n');
  const data = [];
  let errorCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && Object.prototype.hasOwnProperty.call(parsed, '__proto__')) {
        errorCount++;
        debugLog('PARSE_JSON', 'Rejected dangerous key in JSONL line', { filePath });
        continue;
      }
      data.push(parsed);
    } catch {
      errorCount++;
      debugLog('PARSE_JSON', 'Skipped malformed JSONL line', { filePath, line: trimmed.slice(0, 80) });
    }
  }

  return { data, errorCount };
}

/**
 * Write a JSON value to file, creating parent dirs if needed.
 */
function writeJSON(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Append a single JSON object as a line to a JSONL file.
 * Creates parent dirs if needed.
 */
function appendJSONL(filePath, obj) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(filePath, JSON.stringify(obj) + '\n', 'utf8');
}

module.exports = { readJSONL, writeJSON, appendJSONL };
