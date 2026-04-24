'use strict';

/**
 * loadout.js — Pipeline-owner tagging and loadout composition helpers
 * for the Skill Advisor.
 *
 * Scope:
 *   tagPipelineOwner(entry)     — classify an index entry as owned by a
 *                                 pipeline plugin or standalone (null).
 *
 * See .specs/plans/per-step-loadout-picker.design.md for the behavior
 * contract.
 */

const { PIPELINE_OWNERS } = require('./constants');

/**
 * Classify a skill / command / agent index entry against the curated
 * PIPELINE_OWNERS list.
 *
 * Rules (in order):
 *   1. If the entry id contains `kiro:` OR the invocation begins with
 *      `/kiro-`, return `"kiro"`. This covers the kiro-* global skills
 *      AND kiro-namespaced plugin skills in a single check.
 *   2. If `source` starts with `plugin:<name>` and `<name>` is in
 *      PIPELINE_OWNERS, return `<name>`.
 *   3. Otherwise return `null` (standalone or non-owned plugin).
 *
 * @param {{ id?: string, invocation?: string, source?: string }} entry
 * @returns {string | null}
 */
function tagPipelineOwner(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const { id, invocation, source } = entry;

  // Rule 1 — kiro exception (id-based or invocation-based)
  if (typeof id === 'string' && id.includes('kiro:')) return 'kiro';
  if (typeof invocation === 'string' && invocation.startsWith('/kiro-')) {
    return 'kiro';
  }

  // Rule 2 — plugin-name match against PIPELINE_OWNERS
  if (typeof source === 'string' && source.startsWith('plugin:')) {
    const pluginName = source.slice('plugin:'.length);
    if (PIPELINE_OWNERS.includes(pluginName)) return pluginName;
  }

  return null;
}

module.exports = {
  tagPipelineOwner,
};
