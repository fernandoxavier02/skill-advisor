---
name: pipeline-suggest
description: Lightweight prose-only loadout suggester. Auto-fires ONLY for short ad-hoc questions like "which tool fits this task" or "compose a quick stack for X" — single inline confirmation, no AskUserQuestion. Never fires when the user types `/skill-advisor:advisor`, `/advisor`, asks for an "interactive picker", "step-by-step", "walk me through", or "pick skills one by one" — those go to the full router+gate command. For the full per-step interactive picker (with AskUserQuestion at each phase, recommendation + alternatives), invoke `/skill-advisor:advisor` instead.
---

# Pipeline Suggest — Quick Loadout (auto-trigger)

This skill is the **lightweight** entry point of skill-advisor. When it activates, do the following inline (no subagent spawn):

1. Load the full skill index (`advisor-index-full.json`)
2. Analyze the user's current task against all available tools
3. Recommend an optimal loadout with execution order and dependencies
4. Present a dry-run for user approval (in prose, single confirmation)

## When to use this vs `/skill-advisor:advisor`

| Path | Behavior | Use when |
|------|----------|----------|
| **`/skill-advisor:pipeline-suggest`** (this skill) | Inline analysis + prose dry-run + single confirmation | You want a quick recommendation and trust the main LLM's judgment |
| **`/skill-advisor:advisor`** (the command) | Spawns advisor-router → advisor-gate → per-step AskUserQuestion picker (recommendation + alternatives at every phase) | You want full interactive control over each step of the proposed pipeline |

## Trigger Examples

- "Which skill should I use for this?"
- "I need to do X, Y, and Z — what tools should I use?"
- "Help me figure out the best workflow for this task"
- "What's the best way to approach this?"
- Complex tasks involving multiple domains (security + implementation + deployment)

## What This Skill Does NOT Do

- Does NOT execute skills automatically (Phase B — manual execution)
- Does NOT replace the user's judgment — it recommends, user decides
- Does NOT work without an index — run `/advisor-index` first
