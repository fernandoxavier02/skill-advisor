'use strict';

/**
 * frontmatter-hygiene.test.js — Slice 4.1 (Task 5.1) structural assertion.
 *
 * Three discoverability invariants per Req 5.1, 5.2, 5.3:
 *
 *   - skills/pipeline-suggest/SKILL.md MUST contain a "does not activate"
 *     (or equivalent) negative trigger clause naming the slash command,
 *     so Claude does not auto-trigger the lightweight skill when the user
 *     explicitly asks for /skill-advisor:advisor or an interactive picker.
 *   - commands/advisor-setup.md MUST have `name: advisor-setup` in
 *     frontmatter (the file stem). Was missing pre-Slice-4.1.
 *   - commands/advisor-stats.md description MUST contain at least four
 *     trigger phrases: "como tenho usado", "quais skills mais uso",
 *     "show usage trends", "session analytics".
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PIPELINE_SUGGEST = path.join(ROOT, 'skills', 'pipeline-suggest', 'SKILL.md');
const ADVISOR_SETUP = path.join(ROOT, 'commands', 'advisor-setup.md');
const ADVISOR_STATS = path.join(ROOT, 'commands', 'advisor-stats.md');

function readFrontmatter(file) {
  const src = fs.readFileSync(file, 'utf8');
  // Accept LF or CRLF line endings (Windows + Unix).
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`No YAML frontmatter in ${file}`);
  return m[1];
}

describe('frontmatter hygiene: pipeline-suggest negative trigger (Req 5.1)', () => {
  it('Given the pipeline-suggest description, When parsed, Then it contains an explicit "does not activate" clause naming the advisor slash command', () => {
    const fm = readFrontmatter(PIPELINE_SUGGEST);
    assert.match(fm, /does not activate|DOES NOT activate|must not activate|never activate/i,
      'pipeline-suggest description must declare WHEN it must NOT activate');
    assert.match(fm, /\/skill-advisor:advisor|\/advisor|interactive (step-by-step )?picker/i,
      'negative trigger clause must reference the advisor slash command or interactive picker');
  });
});

describe('frontmatter hygiene: advisor-setup name field (Req 5.2)', () => {
  it('Given commands/advisor-setup.md, When frontmatter parsed, Then it contains name: advisor-setup matching the file stem', () => {
    const fm = readFrontmatter(ADVISOR_SETUP);
    assert.match(fm, /^name:\s*advisor-setup\s*$/m,
      'advisor-setup frontmatter must declare name: advisor-setup');
  });
});

describe('frontmatter hygiene: advisor-stats trigger phrases (Req 5.3)', () => {
  const REQUIRED_TRIGGERS = [
    'como tenho usado',
    'quais skills mais uso',
    'show usage trends',
    'session analytics',
  ];

  it('Given commands/advisor-stats.md description, When parsed, Then it contains all four required trigger phrases', () => {
    const fm = readFrontmatter(ADVISOR_STATS);
    for (const phrase of REQUIRED_TRIGGERS) {
      assert.ok(fm.toLowerCase().includes(phrase.toLowerCase()),
        `advisor-stats description missing trigger phrase: "${phrase}"`);
    }
  });
});
