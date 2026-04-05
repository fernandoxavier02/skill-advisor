'use strict';

/**
 * build-graph.js — Vault parser and graph builder for Skill Advisor v2.
 *
 * Scans the Obsidian vault (concepts/, skills/, pipelines/) and produces:
 *   _graph/adjacency.json  — full node/edge graph
 *   _graph/stats.json      — summary stats
 */

const fs = require('fs');
const path = require('path');
const {
  getVaultDir,
  getGraphDir,
  getGraphPath,
} = require('./paths');

// ---------------------------------------------------------------------------
// parseFrontmatter(content) → object | null
// ---------------------------------------------------------------------------
// Handles:
//   - Block scalars:   key: value
//   - Quoted scalars:  key: "value" or key: 'value'
//   - YAML list (dash):
//       key:
//         - item1
//         - item2
//   - Inline list:     key: [item1, item2]
// ---------------------------------------------------------------------------
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
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

    // Key: value line (top-level key — no leading spaces)
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

    // Empty value — could be followed by a list block
    if (rest === '') {
      // Peek ahead for indented list items
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
      // No list items — value is null/empty
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

    // Plain scalar — coerce booleans and numbers
    result[key] = coerceScalar(rest);
    i++;
  }

  return result;
}

function coerceScalar(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  const n = Number(s);
  if (!Number.isNaN(n) && s !== '') return n;
  return s;
}

// ---------------------------------------------------------------------------
// extractWikilinks(body) → string[]
// Extracts [[target]] or [[target|alias]] from text. Deduplicates. Lowercase.
// ---------------------------------------------------------------------------
function extractWikilinks(body) {
  const seen = new Set();
  const results = [];
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const target = m[1].trim().toLowerCase();
    if (!seen.has(target)) {
      seen.add(target);
      results.push(target);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// normalizeAlias(s) → string
// NFD decompose + strip combining accents → lowercase ASCII-ish key.
// Also keeps the original so both forms are indexed.
// ---------------------------------------------------------------------------
function normalizeAlias(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// ---------------------------------------------------------------------------
// scanDir(dir) → Array<{name, content, wikilinks}>
// Non-recursive: reads all .md files in dir.
// ---------------------------------------------------------------------------
function scanDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      // Body is everything after the closing ---
      const bodyMatch = content.match(/^---[\s\S]*?---\r?\n([\s\S]*)$/);
      const body = bodyMatch ? bodyMatch[1] : content;
      return {
        name: path.basename(f, '.md').toLowerCase(),
        content,
        body,
        wikilinks: extractWikilinks(body),
      };
    });
}

// ---------------------------------------------------------------------------
// buildGraph() → { nodes, alias_index }
// ---------------------------------------------------------------------------
function buildGraph() {
  const vaultDir = getVaultDir();
  const nodes = {};       // nodeId → node object (with internal wikilinks array)
  const alias_index = {}; // alias/normalized → nodeId

  // ---- 1. Parse all vault files into raw nodes ----

  // concepts/
  for (const file of scanDir(path.join(vaultDir, 'concepts'))) {
    const fm = parseFrontmatter(file.content) || {};
    const nodeId = `concept:${file.name}`;
    nodes[nodeId] = {
      type: 'concept',
      name: file.name,
      aliases: fm.aliases || [],
      domain: fm.domain || [],
      edges: [],
      _wikilinks: file.wikilinks,
    };
  }

  // skills/
  for (const file of scanDir(path.join(vaultDir, 'skills'))) {
    const fm = parseFrontmatter(file.content) || {};
    const nodeId = `skill:${file.name}`;
    nodes[nodeId] = {
      type: 'skill',
      name: file.name,
      aliases: fm.aliases || [],
      invocation: fm.invocation || `/${file.name}`,
      category: fm.category || null,
      inputs: fm.inputs || [],
      outputs: fm.outputs || [],
      estimated_tokens: fm.estimated_tokens || null,
      edges: [],
      _wikilinks: file.wikilinks,
    };
  }

  // pipelines/
  for (const file of scanDir(path.join(vaultDir, 'pipelines'))) {
    const fm = parseFrontmatter(file.content) || {};
    const nodeId = `pipeline:${file.name}`;
    nodes[nodeId] = {
      type: 'pipeline',
      name: file.name,
      aliases: fm.aliases || [],
      steps: fm.steps || [],
      triggers: fm.triggers || [],
      edges: [],
      _wikilinks: file.wikilinks,
    };
  }

  // ---- 2. Build lookup maps ----

  // name → nodeId (for wikilink resolution)
  const nameToId = {};
  for (const nodeId of Object.keys(nodes)) {
    const node = nodes[nodeId];
    nameToId[node.name] = nodeId;
  }

  // ---- 3. Build alias_index ----
  for (const nodeId of Object.keys(nodes)) {
    const node = nodes[nodeId];
    for (const alias of node.aliases) {
      // Keep original form
      alias_index[alias.toLowerCase()] = nodeId;
      // Keep normalized (accent-stripped) form
      const norm = normalizeAlias(alias);
      alias_index[norm] = nodeId;
    }
  }

  // ---- 4. Resolve wikilinks → edges ----
  for (const nodeId of Object.keys(nodes)) {
    const node = nodes[nodeId];
    for (const link of node._wikilinks) {
      const targetId = nameToId[link];
      if (targetId && !node.edges.includes(targetId)) {
        node.edges.push(targetId);
      }
    }
  }

  // ---- 5. Bidirectional concept-concept edges ----
  // If concept A has an edge to concept B, ensure B also has an edge to A.
  for (const nodeId of Object.keys(nodes)) {
    if (nodes[nodeId].type !== 'concept') continue;
    for (const targetId of nodes[nodeId].edges) {
      if (nodes[targetId] && nodes[targetId].type === 'concept') {
        if (!nodes[targetId].edges.includes(nodeId)) {
          nodes[targetId].edges.push(nodeId);
        }
      }
    }
  }

  // ---- 6. Strip internal-only fields before returning ----
  for (const nodeId of Object.keys(nodes)) {
    delete nodes[nodeId]._wikilinks;
  }

  return { nodes, alias_index };
}

// ---------------------------------------------------------------------------
// main() — write adjacency.json and stats.json to _graph/
// ---------------------------------------------------------------------------
function main() {
  const graph = buildGraph();
  const graphDir = getGraphDir();

  if (!fs.existsSync(graphDir)) {
    fs.mkdirSync(graphDir, { recursive: true });
  }

  // adjacency.json
  fs.writeFileSync(
    getGraphPath('adjacency.json'),
    JSON.stringify(graph, null, 2),
    'utf8'
  );

  // stats.json
  const nodes = graph.nodes;
  const nodeIds = Object.keys(nodes);
  const counts = { concept: 0, skill: 0, pipeline: 0 };
  let totalEdges = 0;
  for (const id of nodeIds) {
    const n = nodes[id];
    counts[n.type] = (counts[n.type] || 0) + 1;
    totalEdges += n.edges.length;
  }

  const stats = {
    generated_at: new Date().toISOString(),
    vault: getVaultDir(),
    totals: {
      nodes: nodeIds.length,
      edges: totalEdges,
      aliases: Object.keys(graph.alias_index).length,
      ...counts,
    },
  };

  fs.writeFileSync(
    getGraphPath('stats.json'),
    JSON.stringify(stats, null, 2),
    'utf8'
  );

  console.log('Graph built:');
  console.log(`  nodes   : ${stats.totals.nodes} (${stats.totals.concept} concepts, ${stats.totals.skill} skills, ${stats.totals.pipeline} pipelines)`);
  console.log(`  edges   : ${stats.totals.edges}`);
  console.log(`  aliases : ${stats.totals.aliases}`);
  console.log(`  output  : ${graphDir}`);
}

module.exports = { buildGraph, parseFrontmatter, extractWikilinks };

if (require.main === module) {
  main();
}
