'use strict';

// ARCHITECTURAL INVARIANT (DI-3): Manifest Version Coherence.
//   Both .claude-plugin/plugin.json and package.json MUST declare
//   the same SemVer string. Skew dispatches a false upgrade nudge
//   in session-start hook, hitting users every session.
//
// Allowed exceptions: ZERO. If a real exception arises, edit this
// test with a code-review-justified comment. Do not weaken to a
// warning.
//
// _Requirements: 1.1, 1.2, 1.3, 1.4_

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const PLUGIN_MANIFEST_REL = '.claude-plugin/plugin.json';
const PACKAGE_MANIFEST_REL = 'package.json';
const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function readJsonVersion(absPath) {
  const raw = fs.readFileSync(absPath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed.version;
}

test('Given manifest files have identical SemVer versions, When the guard runs, Then it passes', () => {
  const pluginManifestPath = path.join(PLUGIN_ROOT, PLUGIN_MANIFEST_REL);
  const packageManifestPath = path.join(PLUGIN_ROOT, PACKAGE_MANIFEST_REL);

  const pluginVersion = readJsonVersion(pluginManifestPath);
  const packageVersion = readJsonVersion(packageManifestPath);

  // Both versions must be valid SemVer strings.
  assert.match(
    String(pluginVersion),
    SEMVER_RE,
    `${PLUGIN_MANIFEST_REL} declares a non-SemVer version: ${pluginVersion}`
  );
  assert.match(
    String(packageVersion),
    SEMVER_RE,
    `${PACKAGE_MANIFEST_REL} declares a non-SemVer version: ${packageVersion}`
  );

  // Versions must be identical across both manifest files.
  assert.equal(
    pluginVersion,
    packageVersion,
    `Manifest version skew: ${PLUGIN_MANIFEST_REL} declares ${pluginVersion} but ${PACKAGE_MANIFEST_REL} declares ${packageVersion}. ` +
      'Both files MUST declare the same SemVer string (DI-3).'
  );
});
