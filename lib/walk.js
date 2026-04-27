'use strict';

/**
 * walk.js — Unified filesystem walker for builders.
 *
 * Slice 3.1 (Task 4.1) extraction. Replaces the private walkers in
 * `lib/build-index.js` (`walk`/`findFilesRecursive`) and
 * `lib/build-catalog.js` (`walkDir`) with a single contract.
 *
 * Architectural invariant (DI-2): this module imports ONLY from `node:fs`,
 * `node:path`, and `./constants` (utility layer). No builder imports.
 *
 * Contract:
 *   walkDir(dir, opts?) => string[]  // deduped, sorted absolute paths
 *
 *     dir         absolute root directory (string, required)
 *     opts.matcher    RegExp tested against entry name, OR
 *                     function (name, fullPath) => boolean.
 *                     Default: accept all files.
 *     opts.maxDepth   number; default WALK_LIMITS.MAX_DEPTH
 *     opts.maxEntries number; default WALK_LIMITS.MAX_ENTRIES.
 *                     IMPORTANT: counts MATCHES returned, not entries
 *                     visited. A directory with 100k files but only
 *                     5 matches contributes 5 toward the cap. The legacy
 *                     build-index walker counted visits — that semantic
 *                     was intentionally dropped in Slice 3.1.
 *     opts.skipDirs   Set or Array of directory basenames to skip.
 *                     Default: ['node_modules', '.git', '.next', 'dist',
 *                     'build', 'coverage'].
 *     opts.skipHidden boolean; skip dirs whose name starts with '.'.
 *                     Default true.
 *
 *   Defenses:
 *     - LEXICAL containment guard: rejects any entry whose `path.resolve`
 *       result escapes `dir` (e.g., via `..` segments). This does NOT
 *       call `fs.realpathSync` — a symlink at `dir/sub/escape` pointing
 *       to `/etc/passwd` resolves textually to `dir/sub/escape` and
 *       passes the guard. Same behavior as the legacy build-catalog
 *       walker. Real symlink defense (realpathSync) is parked as a
 *       post-0.5.0 hardening item.
 *     - Throws TypeError when `dir` is not a string. Returns [] when
 *       `dir` does not exist (fail-soft).
 *     - Symlinks: traversal uses the file-type bits returned by
 *       readdirSync. Circular symlinks (`dir/a -> dir/`) are bounded
 *       by `maxDepth` (default 6) — recursion terminates rather than
 *       hanging.
 */

const fs = require('node:fs');
const path = require('node:path');
const { WALK_LIMITS } = require('./constants');
const { debugLog } = require('./errors');

const DEFAULT_SKIP_DIRS = Object.freeze([
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
]);

function _toMatcher(m) {
  if (m === undefined || m === null) return () => true;
  if (typeof m === 'function') return m;
  if (m instanceof RegExp) return (name) => m.test(name);
  throw new TypeError('walkDir: matcher must be a RegExp, function, or undefined');
}

function _toSkipSet(s) {
  if (s === undefined || s === null) return new Set(DEFAULT_SKIP_DIRS);
  if (s instanceof Set) return s;
  if (Array.isArray(s)) return new Set(s);
  throw new TypeError('walkDir: skipDirs must be a Set, Array, or undefined');
}

function walkDir(dir, opts = {}) {
  if (typeof dir !== 'string') {
    throw new TypeError('walkDir: dir must be a string');
  }
  const matcher = _toMatcher(opts.matcher);
  const maxDepth = typeof opts.maxDepth === 'number' ? opts.maxDepth : WALK_LIMITS.MAX_DEPTH;
  const maxEntries = typeof opts.maxEntries === 'number' ? opts.maxEntries : WALK_LIMITS.MAX_ENTRIES;
  const skipDirs = _toSkipSet(opts.skipDirs);
  const skipHidden = opts.skipHidden !== false; // default true

  const results = [];
  const root = path.resolve(dir);

  function traverse(current, depth) {
    if (depth > maxDepth || results.length >= maxEntries) return;

    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      debugLog('FS_READ', 'readdirSync failed in walkDir', { current, cause: err.message });
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxEntries) break;

      const name = entry.name;
      const isDir = entry.isDirectory();

      if (isDir) {
        if (skipDirs.has(name)) continue;
        if (skipHidden && name.startsWith('.')) continue;
      }

      const full = path.join(current, name);

      // Lexical containment guard (NOT realpath — see header doc).
      if (!path.resolve(full).startsWith(root)) continue;

      if (isDir) {
        traverse(full, depth + 1);
      } else if (entry.isFile()) {
        if (matcher(name, full)) results.push(full);
      }
    }
  }

  traverse(root, 0);

  // Dedupe + sort for deterministic output (Property P8 confluence).
  return Array.from(new Set(results)).sort();
}

module.exports = { walkDir, DEFAULT_SKIP_DIRS };
