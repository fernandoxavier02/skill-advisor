#!/usr/bin/env node
'use strict';

/**
 * session-start.cjs — SessionStart hook for skill-advisor first-run detection.
 *
 * Runs on every Claude Code session start (registered in hooks/hooks.json).
 * Reads the wizard state file and emits a nudge to stdout when:
 *   - State file missing (first run ever)
 *   - advisor_version in state differs from current plugin version (upgrade)
 *   - State exists but `completed_steps` is empty (aborted run)
 *
 * Fail-soft: any filesystem or parse error results in silent exit 0. The
 * hook MUST NOT block or delay session start on errors.
 *
 * Performance budget: <50ms cold read. No network, no heavy parsing.
 */

const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT ||
  path.resolve(__dirname, '..');

function silentExit() { process.exit(0); }

try {
  // Lazy-load the setup-state library — keep the hook itself tiny.
  const setupStatePath = path.join(PLUGIN_ROOT, 'lib', 'setup-state.js');
  if (!fs.existsSync(setupStatePath)) silentExit();

  const { readSetupState, isFirstRun, needsFullRerun } = require(setupStatePath);

  // Current advisor version — read from package.json co-located with the plugin.
  let currentVersion = 'unknown';
  try {
    const pkgPath = path.join(PLUGIN_ROOT, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      currentVersion = pkg.version || 'unknown';
    }
  } catch { /* continue with 'unknown' */ }

  if (isFirstRun()) {
    process.stdout.write(
      '🎯 skill-advisor: first-run detected. ' +
      'Run /advisor-setup (~2-3 min) to build the index, download semantic ' +
      'embeddings (~23 MB), and curate pipeline-owners for your installed plugins. ' +
      'Skip for now and the advisor runs degraded (no semantic layer, no graph signal).\n'
    );
    silentExit();
  }

  const state = readSetupState();
  if (needsFullRerun(state, currentVersion)) {
    process.stdout.write(
      `🔄 skill-advisor upgrade detected (${state.advisor_version} → ${currentVersion}). ` +
      'Run /advisor-setup to refresh the index, re-check pipeline-owners, and ' +
      'validate the new release.\n'
    );
    silentExit();
  }

  if (!state.completed_steps || state.completed_steps.length === 0) {
    process.stdout.write(
      '⚠ skill-advisor: setup started but never completed. ' +
      'Run /advisor-setup to finish it.\n'
    );
    silentExit();
  }

  // Fully-setup session — no nudge. Silent exit.
  silentExit();
} catch {
  // Any error → fail silently. Hook must never block session start.
  silentExit();
}
