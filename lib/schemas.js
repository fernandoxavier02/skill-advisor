'use strict';

/**
 * schemas.js — JSDoc typedef definitions and runtime validators for
 * Skill Advisor data structures.
 *
 * Every validate* function returns { valid: boolean, errors: string[] }.
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * @param {*} val
 * @returns {boolean}
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * @param {*} val
 * @returns {boolean}
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * @param {*} val
 * @returns {boolean}
 */
function isBoolean(val) {
  return typeof val === 'boolean';
}

/**
 * @param {*} val
 * @returns {boolean}
 */
function isArray(val) {
  return Array.isArray(val);
}

/**
 * @param {any} input
 * @returns {{ valid: boolean, errors: string[] }}
 */
function failNotObject() {
  return { valid: false, errors: ['input must be a non-null object'] };
}

/**
 * @param {string} field
 * @param {string} expected
 * @returns {string}
 */
function typeError(field, expected) {
  return `${field} must be ${expected}`;
}

/**
 * @param {string} field
 * @param {string[]} allowed
 * @returns {string}
 */
function enumError(field, allowed) {
  return `${field} must be one of: ${allowed.join(', ')}`;
}

/**
 * @param {string} field
 * @returns {string}
 */
function requiredError(field) {
  return `${field} is required`;
}

/**
 * Validates a single field and pushes errors.
 * @param {any} obj
 * @param {string} field
 * @param {boolean} required
 * @param {'string'|'number'|'boolean'|'array'} expectedType
 * @param {string[]|null} enumValues
 * @param {string[]} errors
 */
function validateField(obj, field, required, expectedType, enumValues, errors) {
  const val = obj[field];

  if (val === undefined || val === null) {
    if (required) errors.push(requiredError(field));
    return;
  }

  switch (expectedType) {
    case 'string':
      if (!isString(val)) {
        errors.push(typeError(field, 'a string'));
        return;
      }
      if (enumValues && !enumValues.includes(val)) {
        errors.push(enumError(field, enumValues));
      }
      break;
    case 'number':
      if (!isNumber(val)) {
        errors.push(typeError(field, 'a number'));
      }
      break;
    case 'boolean':
      if (!isBoolean(val)) {
        errors.push(typeError(field, 'a boolean'));
      }
      break;
    case 'array':
      if (!isArray(val)) {
        errors.push(typeError(field, 'an array'));
      }
      break;
  }
}

// ── 1. IndexEntry ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} IndexEntry
 * @property {string} id       - Unique identifier (required)
 * @property {'skill'|'command'|'agent'|'mcp'} type - Entry type (required)
 * @property {string} [source] - Origin of the entry
 * @property {string} name     - Human-readable name (required)
 * @property {string} [description] - Short description
 * @property {string} [invocation] - How to invoke the entry
 * @property {string} [category]   - Inferred category
 */

const INDEX_TYPE_ENUM = ['skill', 'command', 'agent', 'mcp'];

/**
 * Validates an IndexEntry object.
 * @param {any} input - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateIndexEntry(input) {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    return failNotObject();
  }
  const errors = [];
  validateField(input, 'id', true, 'string', null, errors);
  validateField(input, 'type', true, 'string', INDEX_TYPE_ENUM, errors);
  validateField(input, 'name', true, 'string', null, errors);
  validateField(input, 'source', false, 'string', null, errors);
  validateField(input, 'description', false, 'string', null, errors);
  validateField(input, 'invocation', false, 'string', null, errors);
  validateField(input, 'category', false, 'string', null, errors);
  return { valid: errors.length === 0, errors };
}

// ── 2. GraphNode ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} GraphNode
 * @property {'concept'|'skill'|'pipeline'} type - Node type (required)
 * @property {string} name   - Node name (required)
 * @property {string[]} aliases - Alternative names (required)
 * @property {Array} [edges] - Connected node IDs
 * // concept subtype
 * @property {string} [domain] - Domain for concept nodes (required if type=concept)
 * // skill subtype
 * @property {string} [invocation] - Invocation string (required if type=skill)
 * @property {string} [category]   - Category (required if type=skill)
 * @property {Array} [inputs]      - Expected inputs
 * @property {Array} [outputs]     - Produced outputs
 * @property {number} [estimated_tokens] - Estimated token usage
 * // pipeline subtype
 * @property {Array} [steps]    - Pipeline steps (required if type=pipeline)
 * @property {Array} [triggers] - Pipeline triggers
 */

const NODE_TYPE_ENUM = ['concept', 'skill', 'pipeline'];

/**
 * Validates a GraphNode object, including subtype-specific rules.
 * @param {any} input - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateGraphNode(input) {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    return failNotObject();
  }
  const errors = [];

  // Common required fields
  validateField(input, 'type', true, 'string', NODE_TYPE_ENUM, errors);
  validateField(input, 'name', true, 'string', null, errors);
  validateField(input, 'aliases', true, 'array', null, errors);
  validateField(input, 'edges', false, 'array', null, errors);

  // If type is invalid, skip subtype validation
  if (!isString(input.type) || !NODE_TYPE_ENUM.includes(input.type)) {
    return { valid: errors.length === 0, errors };
  }

  // Subtype-specific validation
  switch (input.type) {
    case 'concept':
      validateField(input, 'domain', true, 'string', null, errors);
      break;
    case 'skill':
      validateField(input, 'invocation', true, 'string', null, errors);
      validateField(input, 'category', true, 'string', null, errors);
      validateField(input, 'inputs', false, 'array', null, errors);
      validateField(input, 'outputs', false, 'array', null, errors);
      validateField(input, 'estimated_tokens', false, 'number', null, errors);
      break;
    case 'pipeline':
      validateField(input, 'steps', true, 'array', null, errors);
      validateField(input, 'triggers', false, 'array', null, errors);
      break;
  }

  return { valid: errors.length === 0, errors };
}

// ── 3. GraphEdge ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} GraphEdge
 * @property {string} source - Source node ID (required)
 * @property {string} target - Target node ID (required)
 * @property {'explicit'|'semantic_strong'|'semantic_weak'} type - Edge type (required)
 * @property {number} [weight] - Edge weight
 */

const EDGE_TYPE_ENUM = ['explicit', 'semantic_strong', 'semantic_weak'];

/**
 * Validates a GraphEdge object.
 * @param {any} input - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateGraphEdge(input) {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    return failNotObject();
  }
  const errors = [];
  validateField(input, 'source', true, 'string', null, errors);
  validateField(input, 'target', true, 'string', null, errors);
  validateField(input, 'type', true, 'string', EDGE_TYPE_ENUM, errors);
  validateField(input, 'weight', false, 'number', null, errors);
  return { valid: errors.length === 0, errors };
}

// ── 4. SkillCardV2 ────────────────────────────────────────────────────────

/**
 * @typedef {Object} SkillCardV2
 * // v1 required fields
 * @property {string[]} aliases   - Alternative names (required)
 * @property {string} type        - Skill type (required)
 * @property {string} source      - Origin source (required)
 * @property {string} invocation  - How to invoke (required)
 * @property {string} category    - Skill category (required)
 * // v2 optional fields
 * @property {'auto'|'gated'} [autonomy] - Execution autonomy level
 * @property {Array} [workflow_steps]     - Ordered workflow steps
 * @property {Array} [works_well_with]    - Compatible skills
 * @property {Array} [often_precedes]     - Skills this often comes before
 * @property {Array} [often_follows]      - Skills this often comes after
 * @property {Array} [incompatible_with]  - Conflicting skills
 * @property {number} [estimated_minutes] - Estimated duration
 * @property {string} [complexity]        - Complexity level
 */

const AUTONOMY_ENUM = ['auto', 'gated'];

/**
 * Validates a SkillCardV2 object. v2 fields are all optional.
 * @param {any} input - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSkillCardV2(input) {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    return failNotObject();
  }
  const errors = [];

  // v1 required
  validateField(input, 'aliases', true, 'array', null, errors);
  validateField(input, 'type', true, 'string', null, errors);
  validateField(input, 'source', true, 'string', null, errors);
  validateField(input, 'invocation', true, 'string', null, errors);
  validateField(input, 'category', true, 'string', null, errors);

  // v2 optional
  validateField(input, 'autonomy', false, 'string', AUTONOMY_ENUM, errors);
  validateField(input, 'workflow_steps', false, 'array', null, errors);
  validateField(input, 'works_well_with', false, 'array', null, errors);
  validateField(input, 'often_precedes', false, 'array', null, errors);
  validateField(input, 'often_follows', false, 'array', null, errors);
  validateField(input, 'incompatible_with', false, 'array', null, errors);
  validateField(input, 'estimated_minutes', false, 'number', null, errors);
  validateField(input, 'complexity', false, 'string', null, errors);

  return { valid: errors.length === 0, errors };
}

// ── 5. PipelineSpec ────────────────────────────────────────────────────────

/**
 * @typedef {Object} PipelineSpec
 * @property {string} pipeline_id - Unique pipeline identifier (required)
 * @property {string} [task]      - Task description
 * @property {'PLANNED'|'CLARIFIED'|'EXECUTING'|'COMPLETED'|'PARTIAL'|'FAILED'} status - Pipeline status (required)
 * @property {'gated'|'auto'} [mode] - Execution mode
 * @property {Array} phases       - Pipeline phases (required)
 * @property {string} [created_at] - ISO timestamp of creation
 * @property {string} [updated_at] - ISO timestamp of last update
 */

const PIPELINE_STATUS_ENUM = ['PLANNED', 'CLARIFIED', 'EXECUTING', 'COMPLETED', 'PARTIAL', 'FAILED'];
const PIPELINE_MODE_ENUM = ['gated', 'auto'];

/**
 * Validates a PipelineSpec object.
 * @param {any} input - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePipelineSpec(input) {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    return failNotObject();
  }
  const errors = [];
  validateField(input, 'pipeline_id', true, 'string', null, errors);
  validateField(input, 'task', false, 'string', null, errors);
  validateField(input, 'status', true, 'string', PIPELINE_STATUS_ENUM, errors);
  validateField(input, 'mode', false, 'string', PIPELINE_MODE_ENUM, errors);
  validateField(input, 'phases', true, 'array', null, errors);
  validateField(input, 'created_at', false, 'string', null, errors);
  validateField(input, 'updated_at', false, 'string', null, errors);
  return { valid: errors.length === 0, errors };
}

// ── 6. CatalogEntry ────────────────────────────────────────────────────────

/**
 * @typedef {Object} CatalogEntry
 * @property {string} id          - Unique identifier (required)
 * @property {string} type        - Entry type (required)
 * @property {string} name        - Human-readable name (required)
 * @property {string} sourcePath  - Absolute file path (required)
 * @property {string} [content]   - Truncated file content
 * @property {string} [pluginName] - Originating plugin name
 */

/**
 * Validates a CatalogEntry object.
 * @param {any} input - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCatalogEntry(input) {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    return failNotObject();
  }
  const errors = [];
  validateField(input, 'id', true, 'string', null, errors);
  validateField(input, 'type', true, 'string', null, errors);
  validateField(input, 'name', true, 'string', null, errors);
  validateField(input, 'sourcePath', true, 'string', null, errors);
  validateField(input, 'content', false, 'string', null, errors);
  validateField(input, 'pluginName', false, 'string', null, errors);
  return { valid: errors.length === 0, errors };
}

// ── 7. EmbeddingMeta ───────────────────────────────────────────────────────

/**
 * @typedef {Object} EmbeddingMeta
 * @property {string} provider    - Embedding provider name (required)
 * @property {string} model       - Model identifier (required)
 * @property {number} dimensions  - Vector dimensions, must be > 0 (required)
 * @property {string} [timestamp] - ISO timestamp of generation
 */

/**
 * Validates an EmbeddingMeta object.
 * @param {any} input - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEmbeddingMeta(input) {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    return failNotObject();
  }
  const errors = [];
  validateField(input, 'provider', true, 'string', null, errors);
  validateField(input, 'model', true, 'string', null, errors);
  validateField(input, 'dimensions', true, 'number', null, errors);
  validateField(input, 'timestamp', false, 'string', null, errors);

  // Additional constraint: dimensions must be > 0
  if (isNumber(input.dimensions) && input.dimensions <= 0) {
    errors.push('dimensions must be greater than 0');
  }

  return { valid: errors.length === 0, errors };
}

// ── 8. GateDecision ────────────────────────────────────────────────────────

/**
 * @typedef {Object} GateDecision
 * @property {string} phase_id  - Phase identifier (required)
 * @property {string} skill     - Skill name (required)
 * @property {'pass'|'fail'|'retry'|'escalate'} status - Decision status (required)
 * @property {string} reason    - Decision reason (required)
 * @property {string} [timestamp] - ISO timestamp of decision
 * @property {boolean} [outputs_validated] - Whether outputs were validated
 */

const GATE_STATUS_ENUM = ['pass', 'fail', 'retry', 'escalate'];

/**
 * Validates a GateDecision object.
 * @param {any} input - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateGateDecision(input) {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    return failNotObject();
  }
  const errors = [];
  validateField(input, 'phase_id', true, 'string', null, errors);
  validateField(input, 'skill', true, 'string', null, errors);
  validateField(input, 'status', true, 'string', GATE_STATUS_ENUM, errors);
  validateField(input, 'reason', true, 'string', null, errors);
  validateField(input, 'timestamp', false, 'string', null, errors);
  validateField(input, 'outputs_validated', false, 'boolean', null, errors);
  return { valid: errors.length === 0, errors };
}

// ── Gate Output ────────────────────────────────────────────────────────────

const GATE_DECISIONS = ['approve', 'cancel', 'alternative', 'custom'];
const GATE_ITERATION_KEYS = ['moment1_alterar', 'moment1_sugerir', 'moment2_alterar', 'moment2_sugerir'];

function validateGateOutput(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') return { valid: false, errors: ['not an object'] };

  if (typeof obj.gate_token !== 'string') errors.push('gate_token must be a string');
  else if (!obj.gate_token.startsWith('gate-')) errors.push('gate_token must start with "gate-"');

  if (!GATE_DECISIONS.includes(obj.decision)) errors.push(`decision must be one of: ${GATE_DECISIONS.join(', ')}`);

  if (obj.moment2_decision !== null && obj.moment2_decision !== undefined) {
    if (!GATE_DECISIONS.includes(obj.moment2_decision) && obj.moment2_decision !== 'skip') {
      errors.push(`moment2_decision must be one of: ${[...GATE_DECISIONS, 'skip'].join(', ')} or null`);
    }
  }

  if (!Array.isArray(obj.loadout)) errors.push('loadout must be an array');
  if (!Array.isArray(obj.original_loadout)) errors.push('original_loadout must be an array');

  if (!obj.iterations || typeof obj.iterations !== 'object') {
    errors.push('iterations must be an object');
  } else {
    for (const key of GATE_ITERATION_KEYS) {
      if (typeof obj.iterations[key] !== 'number') errors.push(`iterations.${key} must be a number`);
    }
  }

  // spec_path: must be string or null
  if (obj.spec_path !== null && obj.spec_path !== undefined && typeof obj.spec_path !== 'string') {
    errors.push('spec_path must be a string or null');
  }

  return { valid: errors.length === 0, errors };
}

// ── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  validateIndexEntry,
  validateGraphNode,
  validateGraphEdge,
  validateSkillCardV2,
  validatePipelineSpec,
  validateCatalogEntry,
  validateEmbeddingMeta,
  validateGateDecision,
  validateGateOutput,
};
