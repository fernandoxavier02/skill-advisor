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

const { PIPELINE_OWNERS, CANONICAL_FLOWS } = require('./constants');

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

/**
 * Build an index lookup keyed by invocation for O(1) skill resolution.
 *
 * @param {Array<{invocation?: string, category?: string}>} indexSnapshot
 * @returns {Map<string, object>}
 */
function buildIndexLookup(indexSnapshot) {
  const byInvocation = new Map();
  if (!Array.isArray(indexSnapshot)) return byInvocation;
  for (const entry of indexSnapshot) {
    if (entry && typeof entry.invocation === 'string') {
      byInvocation.set(entry.invocation, entry);
    }
  }
  return byInvocation;
}

/**
 * Collapse a loadout into the canonical flow for a pipeline owner.
 *
 * Used by the gate when the user picks a pipeline-owned skill at any
 * step: the entire loadout is replaced by this materialization so the
 * downstream pipeline executes in the environment the owning plugin
 * expects (see per-step-loadout-picker.design.md, "Canonical flow
 * materialization").
 *
 * Default rule for synthesized fields:
 *   role       = indexEntry.category (looked up in indexSnapshot)
 *   category   = indexEntry.category
 *   confidence = 1.0
 *   reason     = `Parte do fluxo canônico de ${owner}.`
 *   depends_on = [] for position 1; [N-1] (0-indexed: [i]) for position N > 1
 *
 * @param {string} owner - One of PIPELINE_OWNERS
 * @param {Array} indexSnapshot - An advisor-index-full snapshot (array of entries)
 * @returns {Array<object>} Fully-materialized loadout entries
 * @throws {Error} when `owner` is not a known pipeline owner
 * @throws {Error} when any invocation in CANONICAL_FLOWS[owner] is missing from the snapshot
 */
function collapseToCanonicalFlow(owner, indexSnapshot) {
  const flow = CANONICAL_FLOWS[owner];
  if (!flow) {
    throw new Error(
      `unknown pipeline owner: "${owner}" — must be one of ${PIPELINE_OWNERS.join(', ')} (CANONICAL_FLOWS has no entry)`,
    );
  }

  const lookup = buildIndexLookup(indexSnapshot);
  const collapsed = [];
  for (let i = 0; i < flow.length; i++) {
    const invocation = flow[i];
    const indexEntry = lookup.get(invocation);
    if (!indexEntry) {
      throw new Error(
        `CANONICAL_FLOWS[${owner}] references "${invocation}" but it is missing from the index snapshot`,
      );
    }
    const category = typeof indexEntry.category === 'string' ? indexEntry.category : 'utility';
    collapsed.push({
      invocation,
      role: category,
      category,
      confidence: 1.0,
      reason: `Parte do fluxo canônico de ${owner}.`,
      depends_on: i === 0 ? [] : [i],
      pipeline_owner: owner,
    });
  }
  return collapsed;
}

module.exports = {
  tagPipelineOwner,
  collapseToCanonicalFlow,
};
