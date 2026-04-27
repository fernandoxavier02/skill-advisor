'use strict';

/**
 * lib/category.js -- Neutral utility for inferring a skill/command/agent
 * category from its natural-language description. Used by both the index
 * builder (lib/build-index.js) and the analytics domain (lib/advisor-stats.js)
 * without creating a domain -> builder dependency edge.
 *
 * Architectural role: utils-layer module. Has zero dependencies on other
 * lib/ modules. Pure synchronous function. Safe to import from any layer.
 */

/**
 * Regex map from category name to a pattern that matches descriptions
 * belonging to that category. Iteration order is significant: the FIRST
 * matching key wins, so more specific patterns must come before generic
 * ones. The map is frozen to prevent runtime mutation.
 *
 * @type {Readonly<Record<string, RegExp>>}
 */
const CATEGORY_PATTERNS = Object.freeze({
  planning: /brainstorm|design|architect|plan|strategy|office.hours|spec/i,
  implementation: /implement|code|scaffold|build|create|develop|feature/i,
  quality: /review|audit|test|security|lint|quality|coverage/i,
  debugging: /debug|investigate|fix|error|bug|troubleshoot/i,
  deployment: /deploy|ship|release|ci.?cd|push|merge|pr/i,
  documentation: /doc|readme|changelog|release.note|write/i,
  data: /database|query|api|mcp|fetch|search|sql/i,
  utility: /format|convert|file|util|config|setup/i,
});

/**
 * Infer a category for a skill/command/agent based on its description text.
 * Returns the first matching category, or 'utility' as a safe default when
 * the input is empty, non-string, or unmatched.
 *
 * @param {string|null|undefined} description -- free-text description
 * @returns {'planning'|'implementation'|'quality'|'debugging'|'deployment'|'documentation'|'data'|'utility'}
 */
function inferCategory(description) {
  if (typeof description !== 'string' || description.length === 0) {
    return 'utility';
  }
  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (pattern.test(description)) return category;
  }
  return 'utility';
}

module.exports = { CATEGORY_PATTERNS, inferCategory };
