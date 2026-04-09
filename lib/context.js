'use strict';

const path = require('path');
const { BRANCH_MAP } = require('./constants');

/**
 * Extract category from git branch name using BRANCH_MAP.
 * Expects format: prefix/description (e.g., fix/login-bug).
 * Returns category string or null if no match.
 */
function getBranchCategory(branchName) {
  if (typeof branchName !== 'string' || branchName.length === 0) return null;

  const slashIdx = branchName.indexOf('/');
  if (slashIdx < 1) return null; // no slash, or slash at start

  const prefix = branchName.slice(0, slashIdx);
  return BRANCH_MAP[prefix] || null;
}

/**
 * Extract unique file extensions from git diff --stat output lines.
 * Input: array of strings like "lib/index.js | 10 +++---" or single string.
 * Returns Set of extensions (e.g., {'.js', '.md'}).
 */
function getFileExtensions(diffStat) {
  if (!diffStat) return new Set();

  const lines = Array.isArray(diffStat) ? diffStat : [diffStat];
  const exts = new Set();

  for (const line of lines) {
    if (typeof line !== 'string') continue;
    // Extract filename before the pipe separator
    const pipeIdx = line.indexOf('|');
    const filePart = (pipeIdx >= 0 ? line.slice(0, pipeIdx) : line).trim();
    const ext = path.extname(filePart);
    if (ext) exts.add(ext);
  }

  return exts;
}

module.exports = { getBranchCategory, getFileExtensions };
