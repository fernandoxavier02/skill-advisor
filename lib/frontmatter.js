'use strict';

/**
 * frontmatter.js — Unified YAML frontmatter parser.
 *
 * Merges capabilities from build-index.js (BOM, pipe/fold multiline)
 * and build-graph.js (YAML dash lists, inline arrays, scalar coercion).
 *
 * Exports: parseFrontmatter(content) → object | null
 *          coerceScalar(s)           → boolean | number | null | string
 */

function coerceScalar(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  const n = Number(s);
  if (!Number.isNaN(n) && s !== '') return n;
  return s;
}

function parseFrontmatter(content) {
  if (typeof content !== 'string') return null;

  // Strip BOM (common on Windows-created files)
  const clean = content.replace(/^\uFEFF/, '');
  const match = clean.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};
  const lines = yaml.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines and comment lines
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }

    // Key: value line (top-level key — no leading spaces, allows underscore prefix)
    const topKeyMatch = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)/);
    if (!topKeyMatch) {
      i++;
      continue;
    }

    const key = topKeyMatch[1];
    const rest = topKeyMatch[2].trim();

    // Inline array: key: [a, b, c]
    if (rest.startsWith('[') && rest.endsWith(']')) {
      const inner = rest.slice(1, -1);
      result[key] = inner
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      i++;
      continue;
    }

    // Pipe/fold multiline: key: | or key: >
    if (rest === '|' || rest === '>') {
      const items = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (nextLine.startsWith('  ')) {
          items.push(nextLine.trim());
          j++;
        } else {
          break;
        }
      }
      result[key] = items.join(' ').trim();
      i = j;
      continue;
    }

    // Empty value — could be followed by a YAML dash list block
    if (rest === '') {
      const items = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        // indented dash list item
        const listItem = nextLine.match(/^\s+-\s+(.*)/);
        if (listItem) {
          items.push(listItem[1].trim());
          j++;
        } else if (nextLine.trim() === '') {
          // blank line inside list — keep going
          j++;
        } else {
          break;
        }
      }
      if (items.length > 0) {
        result[key] = items;
        i = j;
        continue;
      }
      // No list items — value is null
      result[key] = null;
      i++;
      continue;
    }

    // Quoted scalar: "value" or 'value'
    const quotedMatch = rest.match(/^["'](.*)["']$/);
    if (quotedMatch) {
      result[key] = quotedMatch[1];
      i++;
      continue;
    }

    // Plain scalar — coerce booleans, numbers, null
    result[key] = coerceScalar(rest);
    i++;
  }

  // Return null if no keys were parsed (empty block)
  return Object.keys(result).length > 0 ? result : null;
}

module.exports = { parseFrontmatter, coerceScalar };
