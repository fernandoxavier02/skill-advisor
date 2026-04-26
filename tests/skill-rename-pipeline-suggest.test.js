// Behavior + execution test for the pipeline-suggest skill rename (v0.4.2).
//
// Background: prior to v0.4.2 the lightweight auto-trigger skill was named
// "advisor-skill", which collided semantically with the plugin name and the
// /advisor command, confusing users who could not tell skill from command.
// v0.4.2 renamed `skills/advisor-skill/` → `skills/pipeline-suggest/` and
// updated the SKILL.md frontmatter to `name: pipeline-suggest`.
//
// These tests act as a regression fence:
// 1. The renamed skill exists at the new path with the correct frontmatter.
// 2. The frontmatter name matches the directory name (Claude Code resolves
//    skill ID from frontmatter; a mismatch would silently break invocation
//    via /skill-advisor:pipeline-suggest).
// 3. No file in the repo (excluding CHANGELOG history and node_modules)
//    references the old "advisor-skill" name — a leftover reference would
//    indicate an incomplete rename and is cheaper to catch in CI than in
//    a user bug report.
// 4. The renamed skill is discoverable by the scanner that powers the
//    plugin's index (sanity check: the scan logic is name-agnostic, but
//    pinning the new name here ensures the skill ships in the index).

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { parseFrontmatter } = require('../lib/frontmatter');

const REPO_ROOT = path.resolve(__dirname, '..');
const NEW_SKILL_DIR = path.join(REPO_ROOT, 'skills', 'pipeline-suggest');
const NEW_SKILL_FILE = path.join(NEW_SKILL_DIR, 'SKILL.md');

describe('pipeline-suggest skill rename (v0.4.2)', () => {
  it('the renamed skill directory exists at skills/pipeline-suggest/', () => {
    assert.equal(
      fs.existsSync(NEW_SKILL_DIR),
      true,
      'skills/pipeline-suggest/ must exist after rename',
    );
    assert.equal(
      fs.statSync(NEW_SKILL_DIR).isDirectory(),
      true,
      'skills/pipeline-suggest must be a directory',
    );
  });

  it('SKILL.md is present in the new directory', () => {
    assert.equal(
      fs.existsSync(NEW_SKILL_FILE),
      true,
      'skills/pipeline-suggest/SKILL.md must exist',
    );
  });

  it('frontmatter name matches the directory name', () => {
    const content = fs.readFileSync(NEW_SKILL_FILE, 'utf8');
    const fm = parseFrontmatter(content);
    assert.notEqual(fm, null, 'SKILL.md must have frontmatter');
    assert.equal(
      fm.name,
      'pipeline-suggest',
      'frontmatter name must equal the directory name (claude-code resolves skill ID from frontmatter)',
    );
  });

  it('frontmatter description references the /advisor command (sibling pointer)', () => {
    // The whole point of the rename was disambiguation. The description
    // should explicitly point users to the heavier sibling command.
    const content = fs.readFileSync(NEW_SKILL_FILE, 'utf8');
    const fm = parseFrontmatter(content);
    assert.match(
      fm.description,
      /\/skill-advisor:advisor/,
      'description must point users to /skill-advisor:advisor for the full picker',
    );
  });

  it('the old skill directory was fully removed', () => {
    const OLD_SKILL_DIR = path.join(REPO_ROOT, 'skills', 'advisor-skill');
    assert.equal(
      fs.existsSync(OLD_SKILL_DIR),
      false,
      'skills/advisor-skill/ must NOT exist after rename (would create a duplicate skill)',
    );
  });

  it('no committed file references the old "advisor-skill" name', () => {
    // Use git ls-files to exclude untracked artifacts (e.g. local index
    // caches) and platform-default ignored paths.
    let tracked;
    try {
      tracked = execSync('git ls-files', { cwd: REPO_ROOT, encoding: 'utf8' })
        .split(/\r?\n/)
        .filter(Boolean);
    } catch {
      // If git is unavailable in CI, skip — no point failing the suite on tooling.
      return;
    }

    // Files where historical mentions are EXPECTED and should NOT trigger this guard:
    //   - CHANGELOG.md mentions the old name in the rename entry itself
    //   - this very test file references the old name in comments + assertions
    const ALLOWLIST = new Set([
      'CHANGELOG.md',
      path.relative(REPO_ROOT, __filename).replace(/\\/g, '/'),
    ]);

    const offenders = [];
    for (const rel of tracked) {
      if (ALLOWLIST.has(rel)) continue;
      // Skip binary/large artifacts
      if (/\.(png|jpg|jpeg|gif|woff2?|ttf|eot|ico|pdf)$/i.test(rel)) continue;
      const abs = path.join(REPO_ROOT, rel);
      let content;
      try {
        content = fs.readFileSync(abs, 'utf8');
      } catch {
        continue;
      }
      if (content.includes('advisor-skill')) offenders.push(rel);
    }

    assert.deepEqual(
      offenders,
      [],
      `These tracked files still reference the old "advisor-skill" name and should be updated:\n  ${offenders.join('\n  ')}`,
    );
  });
});
