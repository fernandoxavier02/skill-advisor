'use strict';

/**
 * detect-owners.js — heuristic detector for pipelined plugins.
 *
 * Given installed plugins (id → {skills, manifest}), applies 5 heuristics
 * in order of signal strength and returns candidates the user should
 * confirm are orchestrated end-to-end pipelines:
 *
 *   H1 — explicit metadata
 *        plugin.json has `pipeline: true` or an `orchestration` block.
 *        This is a short-circuit: confidence 1.0, no further checks needed.
 *   H2 — sequential naming
 *        3+ skills whose names match known workflow tokens
 *        (init / brainstorm / design / tasks / impl / validate / …)
 *        or explicit `phase-N` / `step-N` patterns.
 *   H3 — spec + impl + validate triad
 *        at least one skill per role, even if names don't repeat across.
 *   H4 — explicit pipeline/orchestrator skill
 *        any skill whose name contains the word `pipeline` or `orchestrator`.
 *   H5 — shared-prefix cluster
 *        4+ skills in the same plugin share a common prefix like `ce-`
 *        or `kiro-`, which signals a family contract.
 *
 * Score aggregation: H1 short-circuits to 1.0. Otherwise H2/H3/H4/H5
 * contribute 0.4 / 0.3 / 0.3 / 0.3 respectively, capped at 1.0.
 * Threshold to flag for user confirmation: confidence >= 0.5.
 */

const SEQ_TOKENS = Object.freeze([
  'init', 'discovery', 'brainstorm', 'spec', 'requirements',
  'design', 'tasks', 'plan', 'impl', 'implement', 'execute',
  'run', 'work', 'validate', 'verify', 'review', 'commit', 'finish',
]);

// Prefix matchers — accept word-boundary at START only, so derived forms
// like "validate" (vs "validat"), "implementation" (vs "impl"), "specs"
// (vs "spec") all match. Slight false-positive risk ("runner" matches
// "run") is acceptable since the heuristic is for flagging candidates
// that the user confirms one by one.
const SPEC_TOKENS = /\b(spec|design|require|brainstorm|discover)/i;
const IMPL_TOKENS = /\b(impl|execut|run|work)/i;
const VALIDATE_TOKENS = /\b(valid|verif|review|test)/i;

const PHASE_PATTERN = /\bphase[\s_\-]?[0-9]+\b/i;
const STEP_PATTERN = /\bstep[\s_\-]?[0-9]+\b/i;
const PIPELINE_TOKEN_PATTERN = /\b(pipeline|orchestrator)\b/i;

const THRESHOLD_FLAG = 0.5;
const THRESHOLD_STRONG = 0.8;

const WEIGHTS = Object.freeze({
  H2: 0.4,
  H3: 0.3,
  H4: 0.3,
  H5: 0.3,
});

function normalizeSkillName(skill) {
  return String(skill.name || skill.invocation || skill.id || '').toLowerCase();
}

function hasSequentialNaming(skills) {
  const matches = skills.filter((s) => {
    const name = normalizeSkillName(s);
    if (PHASE_PATTERN.test(name) || STEP_PATTERN.test(name)) return true;
    return SEQ_TOKENS.some((t) => name.includes(t));
  });
  return matches.length >= 3;
}

function hasSpecImplValidateTriad(skills) {
  const names = skills.map(normalizeSkillName);
  const hasSpec = names.some((n) => SPEC_TOKENS.test(n));
  const hasImpl = names.some((n) => IMPL_TOKENS.test(n));
  const hasValid = names.some((n) => VALIDATE_TOKENS.test(n));
  return hasSpec && hasImpl && hasValid;
}

function hasPipelineOrOrchestratorSkill(skills) {
  return skills.some((s) => PIPELINE_TOKEN_PATTERN.test(normalizeSkillName(s)));
}

function hasSharedPrefixCluster(skills) {
  if (skills.length < 4) return false;
  const prefixes = {};
  for (const s of skills) {
    const inv = String(s.invocation || s.name || '');
    // Match a trailing `-` or `:` after the first word: `/ce-plan`, `/kiro:spec-init`.
    const m = inv.match(/^\/?([a-z][a-z0-9]*[-:])/i);
    if (m) {
      const key = m[1].toLowerCase();
      prefixes[key] = (prefixes[key] || 0) + 1;
    }
  }
  return Object.values(prefixes).some((count) => count >= 4);
}

function orderByWorkflow(skills) {
  return [...skills]
    .sort((a, b) => {
      const na = normalizeSkillName(a);
      const nb = normalizeSkillName(b);
      const ia = SEQ_TOKENS.findIndex((t) => na.includes(t));
      const ib = SEQ_TOKENS.findIndex((t) => nb.includes(t));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map((s) => s.invocation || s.name || s.id)
    .filter(Boolean);
}

function detect(pluginId, skills = [], manifest = null) {
  const hits = [];

  // H1 — explicit metadata short-circuit.
  if (manifest && (manifest.pipeline === true || manifest.orchestration)) {
    hits.push('H1');
    const suggested = (manifest.orchestration && Array.isArray(manifest.orchestration.canonical_flow))
      ? [...manifest.orchestration.canonical_flow]
      : orderByWorkflow(skills);
    return Object.freeze({
      plugin_id: pluginId,
      heuristics_hit: Object.freeze(hits),
      confidence: 1.0,
      suggested_canonical_flow: Object.freeze(suggested),
    });
  }

  let confidence = 0;
  if (hasSequentialNaming(skills)) {
    hits.push('H2');
    confidence += WEIGHTS.H2;
  }
  if (hasSpecImplValidateTriad(skills)) {
    hits.push('H3');
    confidence += WEIGHTS.H3;
  }
  if (hasPipelineOrOrchestratorSkill(skills)) {
    hits.push('H4');
    confidence += WEIGHTS.H4;
  }
  if (hasSharedPrefixCluster(skills)) {
    hits.push('H5');
    confidence += WEIGHTS.H5;
  }

  confidence = Math.min(confidence, 1.0);

  const suggested_canonical_flow = confidence >= THRESHOLD_FLAG
    ? Object.freeze(orderByWorkflow(skills))
    : Object.freeze([]);

  return Object.freeze({
    plugin_id: pluginId,
    heuristics_hit: Object.freeze(hits),
    confidence,
    suggested_canonical_flow,
  });
}

function detectAll(pluginsMap) {
  const results = [];
  for (const [pluginId, data] of Object.entries(pluginsMap || {})) {
    const r = detect(pluginId, data.skills || [], data.manifest || null);
    if (r.confidence > 0) results.push(r);
  }
  return Object.freeze(results);
}

module.exports = {
  detect,
  detectAll,
  orderByWorkflow,
  SEQ_TOKENS,
  WEIGHTS,
  THRESHOLD_FLAG,
  THRESHOLD_STRONG,
};
