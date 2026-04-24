// Regression test for the advisor-gate AskUserQuestion tool-loading bug.
//
// Context: Claude Code treats AskUserQuestion as a "deferred" tool — its schema
// must be loaded via ToolSearch before the tool can be invoked. The advisor-gate
// agent prompt instructed subagents to "invoke AskUserQuestion" directly, which
// caused Sonnet to hallucinate a workaround (<ask_user> XML, then prose menus)
// instead of calling the tool. This test locks in the fix: the agent spec must
// contain an explicit ToolSearch step BEFORE the first instruction that tells
// the subagent to invoke AskUserQuestion.
//
// Failure mode this test catches: a future edit that removes the ToolSearch
// bootstrap step without also restructuring how the gate collects decisions.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const GATE_PATH = path.join(__dirname, '..', 'agents', 'advisor-gate.md');

function bodyWithoutFrontmatter(raw) {
  // YAML frontmatter is delimited by --- at column 0 on the first line and the
  // next --- on its own line. Strip it so our "first occurrence" checks reason
  // about the prompt body, not the metadata.
  if (!raw.startsWith('---')) return raw;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return raw;
  return raw.slice(raw.indexOf('\n', end + 4) + 1);
}

describe('advisor-gate tool loading contract', () => {
  const raw = fs.readFileSync(GATE_PATH, 'utf8');
  const body = bodyWithoutFrontmatter(raw);

  it('agent spec file exists and is non-empty', () => {
    assert.ok(raw.length > 0, 'advisor-gate.md must exist and be non-empty');
  });

  it('body references ToolSearch as the bootstrap for AskUserQuestion', () => {
    // The fix must instruct the subagent to load the deferred AskUserQuestion
    // schema. We accept any ToolSearch invocation whose query targets
    // AskUserQuestion (string may wrap across lines in prose).
    const toolSearchNearAUQ = /ToolSearch[^\n]{0,120}AskUserQuestion/i;
    assert.match(
      body,
      toolSearchNearAUQ,
      'advisor-gate.md body must contain a ToolSearch instruction that loads AskUserQuestion'
    );
  });

  it('ToolSearch bootstrap appears before the first "invoke AskUserQuestion" directive', () => {
    // The first time the prompt tells the subagent to actually call
    // AskUserQuestion, the tool schema must already be loaded. So in reading
    // order, ToolSearch must come first.
    const firstToolSearch = body.search(/ToolSearch/i);
    const firstInvokeAUQ = body.search(
      /(?:invoke|invoking|call|calling|re-invoke)\s+(?:the\s+\*{0,2})?AskUserQuestion/i
    );

    assert.notEqual(firstToolSearch, -1, 'ToolSearch must be mentioned in the body');
    assert.notEqual(
      firstInvokeAUQ,
      -1,
      'advisor-gate.md must still instruct the subagent to invoke AskUserQuestion somewhere'
    );
    assert.ok(
      firstToolSearch < firstInvokeAUQ,
      `ToolSearch (pos ${firstToolSearch}) must appear before the first "invoke AskUserQuestion" directive (pos ${firstInvokeAUQ})`
    );
  });

  it('tool-loading section is called out as a first / mandatory step', () => {
    // Defense in depth: the bootstrap must be prominent, not buried in prose.
    // We accept any heading or strong marker that signals "do this first".
    const hasFirstStepMarker = /(?:FIRST STEP|first step|Tool Loading|Bootstrap|ANTES DE TUDO|Load tool schema)/i.test(
      body
    );
    assert.ok(
      hasFirstStepMarker,
      'advisor-gate.md should flag the tool-loading step clearly (e.g., a "Tool Loading (FIRST STEP)" heading)'
    );
  });
});
