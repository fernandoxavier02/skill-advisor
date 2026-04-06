const fs = require('fs');
const path = require('path');
const { PLUGIN_DIR, SKILL_DIR, getSkillsDir } = require('./paths');
const { WALK_LIMITS, TRUNCATION } = require('./constants');

/**
 * Walk directory recursively with limits
 * @param {string} dir - directory to walk
 * @param {number} maxDepth - max depth to traverse
 * @param {number} maxEntries - max entries to collect
 * @returns {string[]} array of file paths
 */
function walkDir(dir, maxDepth = WALK_LIMITS.MAX_DEPTH, maxEntries = WALK_LIMITS.MAX_ENTRIES) {
  const results = [];
  const skipDirs = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage']);

  function traverse(current, depth) {
    if (depth > maxDepth || results.length >= maxEntries) return;

    try {
      const entries = fs.readdirSync(current, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxEntries) break;

        // Skip hidden and excluded directories
        if (entry.name.startsWith('.') || skipDirs.has(entry.name)) {
          continue;
        }

        const fullPath = path.join(current, entry.name);

        // Path containment guard — prevent symlink traversal outside root
        if (!path.resolve(fullPath).startsWith(path.resolve(dir))) continue;

        if (entry.isDirectory()) {
          traverse(fullPath, depth + 1);
        } else if (entry.isFile()) {
          results.push(fullPath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }

  traverse(dir, 0);
  return results;
}

/**
 * Extract name from YAML frontmatter
 * @param {string} content - file content
 * @returns {string|null} extracted name or null
 */
function extractNameFromFrontmatter(content) {
  // Match: name: value (with optional quotes)
  const match = content.match(/^name:\s*["']?([^"'\n]+)["']?/m);
  return match ? match[1].trim() : null;
}

/**
 * Extract plugin name from file path
 * e.g., ~/.claude/plugins/cache/FX-studio-AI/skill-advisor/0.1.0/...
 * or ~/.claude/plugins/cache/marketplace/some-plugin/1.0.0/...
 * @param {string} filePath - absolute file path
 * @returns {string} plugin name or 'unknown'
 */
function extractPluginName(filePath) {
  // Normalize path for cross-platform
  const normalized = filePath.replace(/\\/g, '/');

  // Try to extract from cache path
  const cacheMatch = normalized.match(/\/\.claude\/plugins\/cache\/([^/]+)\/([^/]+)/);
  if (cacheMatch) {
    const org = cacheMatch[1];
    const pluginName = cacheMatch[2];
    return `${org}/${pluginName}`;
  }

  // Try to extract from skills path
  const skillsMatch = normalized.match(/\/\.claude\/skills\/([^/]+)/);
  if (skillsMatch) {
    return skillsMatch[1];
  }

  return 'unknown';
}

/**
 * Scan all SKILL.md, commands/*.md, and agents/*.md files
 * @returns {Array} array of { id, type, name, sourcePath, content }
 */
function scanSources() {
  const sources = [];
  const visited = new Set();

  // Ensure directories exist
  if (!fs.existsSync(PLUGIN_DIR) && !fs.existsSync(SKILL_DIR)) {
    console.warn(`Warning: Neither ${PLUGIN_DIR} nor ${SKILL_DIR} exists`);
    return sources;
  }

  // Scan PLUGIN_DIR
  if (fs.existsSync(PLUGIN_DIR)) {
    const pluginFiles = walkDir(PLUGIN_DIR);

    for (const filePath of pluginFiles) {
      // Match SKILL.md, commands/*.md, or agents/*.md
      const normalized = filePath.replace(/\\/g, '/');
      const isSkill = normalized.endsWith('/SKILL.md');
      const isCommand = /\/commands\/[^/]+\.md$/.test(normalized);
      const isAgent = /\/agents\/[^/]+\.md$/.test(normalized);

      if (!isSkill && !isCommand && !isAgent) continue;
      if (visited.has(filePath)) continue;

      visited.add(filePath);

      try {
        let content = fs.readFileSync(filePath, 'utf-8');
        const name = extractNameFromFrontmatter(content) || path.basename(filePath, '.md');
        const pluginName = extractPluginName(filePath);

        // Truncate content to TRUNCATION.CONTENT chars
        let truncatedContent = content;
        if (content.length > TRUNCATION.CONTENT) {
          truncatedContent = content.substring(0, TRUNCATION.CONTENT) + '\n...(truncated)';
        }

        // Determine type
        let type = 'skill';
        if (isCommand) type = 'command';
        if (isAgent) type = 'agent';

        // Create unique ID
        const id = `${pluginName}:${name}`.toLowerCase().replace(/[^a-z0-9:/_-]/g, '-');

        sources.push({
          id,
          type,
          name,
          sourcePath: filePath,
          content: truncatedContent,
          pluginName,
        });
      } catch (err) {
        // Skip files we can't read
      }
    }
  }

  // Scan SKILL_DIR
  if (fs.existsSync(SKILL_DIR)) {
    const skillFiles = walkDir(SKILL_DIR);

    for (const filePath of skillFiles) {
      // Match SKILL.md files only (not commands/agents for installed skills)
      const normalized = filePath.replace(/\\/g, '/');
      const isSkill = normalized.endsWith('/SKILL.md');

      if (!isSkill) continue;
      if (visited.has(filePath)) continue;

      visited.add(filePath);

      try {
        let content = fs.readFileSync(filePath, 'utf-8');
        const name = extractNameFromFrontmatter(content) || path.basename(filePath, '.md');
        const pluginName = extractPluginName(filePath);

        // Truncate content to TRUNCATION.CONTENT chars
        let truncatedContent = content;
        if (content.length > TRUNCATION.CONTENT) {
          truncatedContent = content.substring(0, TRUNCATION.CONTENT) + '\n...(truncated)';
        }

        const id = `${pluginName}:${name}`.toLowerCase().replace(/[^a-z0-9:/_-]/g, '-');

        sources.push({
          id,
          type: 'skill',
          name,
          sourcePath: filePath,
          content: truncatedContent,
          pluginName,
        });
      } catch (err) {
        // Skip files we can't read
      }
    }
  }

  return sources;
}

/**
 * Get existing skill cards in vault
 * @returns {Set} set of skill names that already have cards
 */
function getExistingCards() {
  const existing = new Set();
  const skillsVaultDir = getSkillsDir();

  if (!fs.existsSync(skillsVaultDir)) {
    return existing;
  }

  try {
    const files = fs.readdirSync(skillsVaultDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const name = path.basename(file, '.md');
        existing.add(name.toLowerCase());
      }
    }
  } catch (err) {
    // Skip if can't read directory
  }

  return existing;
}

/**
 * Generate batches of sources for LLM processing
 * @param {number} batchSize - size of each batch (default 10)
 * @returns {Object} { sources, pending, batches, existingCount }
 */
function generateBatches(batchSize = 10) {
  const allSources = scanSources();
  const existing = getExistingCards();

  // Filter out sources that already have cards
  const pending = allSources.filter((source) => {
    const lowerName = source.name.toLowerCase();
    return !existing.has(lowerName);
  });

  // Split pending into batches
  const batches = [];
  for (let i = 0; i < pending.length; i += batchSize) {
    batches.push(pending.slice(i, i + batchSize));
  }

  return {
    sources: allSources,
    pending,
    batches,
    existingCount: existing.size,
  };
}

// Export functions
module.exports = {
  scanSources,
  getExistingCards,
  generateBatches,
  walkDir,
  extractNameFromFrontmatter,
  extractPluginName,
};

// CLI support: run directly if invoked
if (require.main === module) {
  const result = generateBatches();

  console.log('\n=== Skill Advisor Catalog Scan ===\n');
  console.log(`Total sources found: ${result.sources.length}`);
  console.log(`Existing cards: ${result.existingCount}`);
  console.log(`Pending cards: ${result.pending.length}`);
  console.log(`Batches (size 10): ${result.batches.length}`);

  if (result.pending.length > 0) {
    console.log(`\nFirst pending source:`);
    const first = result.pending[0];
    console.log(`  ID: ${first.id}`);
    console.log(`  Type: ${first.type}`);
    console.log(`  Name: ${first.name}`);
    console.log(`  Plugin: ${first.pluginName}`);
  }

  if (result.batches.length > 0) {
    console.log(`\nBatch breakdown:`);
    result.batches.forEach((batch, idx) => {
      console.log(`  Batch ${idx + 1}: ${batch.length} sources`);
    });
  }
}
