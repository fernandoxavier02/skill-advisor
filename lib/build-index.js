#!/usr/bin/env node
/**
 * build-index.js — Scans all skill/plugin/MCP sources and generates
 * two JSON index files:
 *   - advisor-index-lite.json  (~30KB, for hook cold-read)
 *   - advisor-index-full.json  (~200KB, for /advisor command)
 */

const fs = require('fs');
const path = require('path');
const { PLUGIN_DIR, SKILL_DIR, getIndexPath, getLibDir } = require('./paths');
const { parseFrontmatter } = require('./frontmatter');
const { WALK_LIMITS, TRUNCATION, THRESHOLDS } = require('./constants');

// ── Scanners ─────────────────────────────────────────────────────

const { MAX_ENTRIES: MAX_WALK_ENTRIES, MAX_DEPTH } = WALK_LIMITS;

function findFilesRecursive(dir, exactFilename) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  try {
    walk(dir, exactFilename, results, 0, { count: 0 });
  } catch { /* permission denied, etc */ }
  return results;
}

function walk(dir, filename, results, depth, counter) {
  if (depth > MAX_DEPTH || counter.count > MAX_WALK_ENTRIES) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const entry of entries) {
    counter.count++;
    if (counter.count > MAX_WALK_ENTRIES) return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, filename, results, depth + 1, counter);
    } else if (entry.name === filename) {
      results.push(full);
    }
  }
}

function scanSkills(dir, source) {
  const entries = [];
  const skillFiles = findFilesRecursive(dir, 'SKILL.md');
  for (const filePath of skillFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = parseFrontmatter(content);
      if (!fm || !fm.name) continue;
      const skillDir = path.basename(path.dirname(filePath));
      entries.push({
        id: `${source}:${fm.name}`,
        type: 'skill',
        source,
        name: fm.name,
        description: fm.description || '',
        invocation: `/${fm.name}`,
        category: inferCategory(fm.description || ''),
      });
    } catch { /* skip unreadable files */ }
  }
  return entries;
}

function scanPluginManifests() {
  const entries = [];
  if (!fs.existsSync(PLUGIN_DIR)) return entries;
  const manifestFiles = findFilesRecursive(PLUGIN_DIR, 'plugin.json');
  for (const filePath of manifestFiles) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const manifest = JSON.parse(raw);
      if (!manifest.name) continue;
      // plugin.json lives in .claude-plugin/ but content is in grandparent dir
      let pluginRoot = path.dirname(filePath);
      if (path.basename(pluginRoot) === '.claude-plugin') {
        pluginRoot = path.dirname(pluginRoot);
      }

      // Scan plugin skills
      const pluginSkillDir = path.join(pluginRoot, 'skills');
      if (fs.existsSync(pluginSkillDir)) {
        const skills = scanSkills(pluginSkillDir, `plugin:${manifest.name}`);
        entries.push(...skills);
      }

      // Scan plugin commands (with path traversal guard)
      if (Array.isArray(manifest.commands)) {
        for (const cmdPath of manifest.commands) {
          const cmdFile = path.resolve(pluginRoot, cmdPath);
          if (!cmdFile.startsWith(pluginRoot)) continue; // path traversal guard
          try {
            const content = fs.readFileSync(cmdFile, 'utf8');
            const fm = parseFrontmatter(content);
            const cmdName = fm?.name || path.basename(cmdPath, '.md');
            entries.push({
              id: `plugin:${manifest.name}:cmd:${cmdName}`,
              type: 'command',
              source: `plugin:${manifest.name}`,
              name: cmdName,
              description: fm?.description || '',
              invocation: `/${cmdName}`,
              category: inferCategory(fm?.description || ''),
            });
          } catch { /* skip unreadable */ }
        }
      }

      // Scan plugin agents (direct readdirSync, not recursive)
      const agentDir = path.join(pluginRoot, 'agents');
      if (fs.existsSync(agentDir)) {
        try {
          const agentEntries = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));
          for (const agentFile of agentEntries) {
            const fullPath = path.join(agentDir, agentFile);
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              const fm = parseFrontmatter(content);
              const agentName = fm?.name || path.basename(agentFile, '.md');
              entries.push({
                id: `plugin:${manifest.name}:agent:${agentName}`,
                type: 'agent',
                source: `plugin:${manifest.name}`,
                name: agentName,
                description: fm?.description || '',
                invocation: agentName,
                category: inferCategory(fm?.description || ''),
              });
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
      }
    } catch { /* skip malformed plugin.json */ }
  }
  return entries;
}

const BANNED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function scanMCPManifests() {
  const entries = [];
  const searchDirs = [PLUGIN_DIR];
  // Only scan cwd if it looks like a project (has .claude/ or .mcp.json)
  try {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, '.claude')) || fs.existsSync(path.join(cwd, '.mcp.json'))) {
      searchDirs.push(cwd);
    }
  } catch { /* cwd may be deleted */ }
  for (const dir of searchDirs) {
    const mcpFiles = findFilesRecursive(dir, 'mcp.json');
    for (const filePath of mcpFiles) {
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > 1_000_000) continue; // skip files > 1MB
        const raw = fs.readFileSync(filePath, 'utf8');
        const manifest = JSON.parse(raw);
        const servers = manifest.mcpServers || manifest;
        for (const [name, config] of Object.entries(servers)) {
          if (typeof config !== 'object' || BANNED_KEYS.has(name)) continue;
          entries.push({
            id: `mcp:${name}`,
            type: 'mcp',
            source: 'mcp',
            name: sanitize(name),
            description: sanitize(config.description || `MCP server: ${name}`),
            invocation: `mcp:${name}`,
            category: 'data',
          });
        }
      } catch { /* skip */ }
    }
  }
  return entries;
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  // Strip ANSI escape codes and control chars
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/[\x00-\x1f]/g, '');
}

// ── Category inference ───────────────────────────────────────────

const CATEGORY_PATTERNS = {
  planning: /brainstorm|design|architect|plan|strategy|office.hours|spec/i,
  implementation: /implement|code|scaffold|build|create|develop|feature/i,
  quality: /review|audit|test|security|lint|quality|coverage/i,
  debugging: /debug|investigate|fix|error|bug|troubleshoot/i,
  deployment: /deploy|ship|release|ci.?cd|push|merge|pr/i,
  documentation: /doc|readme|changelog|release.note|write/i,
  data: /database|query|api|mcp|fetch|search|sql/i,
  utility: /format|convert|file|util|config|setup/i,
};

function inferCategory(description) {
  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (pattern.test(description)) return category;
  }
  return 'utility';
}

// ── Dedup ────────────────────────────────────────────────────────

function dedup(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const key = `${entry.type}:${entry.name}`;
    if (!seen.has(key)) {
      seen.set(key, entry);
    }
  }
  return Array.from(seen.values());
}

// ── Build indexes ────────────────────────────────────────────────

function buildFullIndex(entries) {
  return entries;
}

function buildLiteIndex(entries) {
  return entries.map(e => ({
    id: e.id,
    name: e.name,
    description: truncate(e.description, TRUNCATION.LITE_DESC),
    invocation: e.invocation,
    category: e.category,
  }));
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen).replace(/\s\S*$/, '...');
}

// ── Main ─────────────────────────────────────────────────────────

function main() {
  const allEntries = [];

  // Global skills
  const globalSkills = scanSkills(SKILL_DIR, 'global');
  allEntries.push(...globalSkills);

  // Project skills (if in a project dir)
  const projectSkillDir = path.join(process.cwd(), '.claude', 'skills');
  if (fs.existsSync(projectSkillDir)) {
    const projectSkills = scanSkills(projectSkillDir, 'project');
    allEntries.push(...projectSkills);
  }

  // Plugin manifests (skills, commands, agents)
  const pluginEntries = scanPluginManifests();
  allEntries.push(...pluginEntries);

  // MCP servers
  const mcpEntries = scanMCPManifests();
  allEntries.push(...mcpEntries);

  // Dedup
  const unique = dedup(allEntries);

  // Build both indexes
  const full = buildFullIndex(unique);
  const lite = buildLiteIndex(unique);

  // Write
  const libDir = getLibDir();
  if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });

  const fullPath = getIndexPath('full');
  const litePath = getIndexPath('lite');

  fs.writeFileSync(fullPath, JSON.stringify(full, null, 2), 'utf8');
  fs.writeFileSync(litePath, JSON.stringify(lite, null, 2), 'utf8');

  const fullSize = (fs.statSync(fullPath).size / 1024).toFixed(1);
  const liteSize = (fs.statSync(litePath).size / 1024).toFixed(1);

  console.log(`Indexed ${unique.length} entries (${globalSkills.length} global skills, ${pluginEntries.length} plugin entries, ${mcpEntries.length} MCP servers)`);
  console.log(`  Full index: ${fullPath} (${fullSize}KB)`);
  console.log(`  Lite index: ${litePath} (${liteSize}KB)`);

  if (parseFloat(liteSize) > THRESHOLDS.LITE_INDEX_BUDGET_KB) {
    console.warn(`  WARNING: Lite index exceeds ${THRESHOLDS.LITE_INDEX_BUDGET_KB}KB budget (${liteSize}KB). Hook cold-read may exceed 50ms.`);
  }

  return { full, lite, stats: { total: unique.length, globalSkills: globalSkills.length, pluginEntries: pluginEntries.length, mcpEntries: mcpEntries.length } };
}

if (require.main === module) {
  main();
}

module.exports = { main, parseFrontmatter, inferCategory, dedup, scanSkills, buildLiteIndex, buildFullIndex, truncate };
