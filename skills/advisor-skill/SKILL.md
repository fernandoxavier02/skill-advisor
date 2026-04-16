---
name: advisor-skill
description: Intelligent toolchain orchestrator that recommends skills, plugins, MCPs, and agents for any task. Activated when the user asks which tool to use, wants to compose multiple skills, or says "I don't know which skill to use". Also triggers on complex multi-step tasks that would benefit from skill composition.
---

# Skill Advisor — Auto-Discovery

When this skill activates, run the `/advisor` command workflow:

1. Load the full skill index (`advisor-index-full.json`)
2. Analyze the user's current task against all available tools
3. Recommend an optimal loadout with execution order and dependencies
4. Present a dry-run for user approval

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
