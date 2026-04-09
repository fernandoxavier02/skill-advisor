---
aliases: [cc-skill, criar-skill, create-skill-cc, cc-toolkit-skill, skill-creator-cc, criar-comando]
type: skill
source: plugin:cc-toolkit:cc-skill
invocation: /cc-skill
category: utility
inputs: ["skill name and description", "desired behavior and workflow", "target project context"]
outputs: ["skill markdown file in .claude/commands/", "validated skill structure", "skill metadata and invocation instructions"]
estimated_tokens: 5000
---

# CC Skill

## Conceitos
- [[automation]] — creates reusable Claude Code skills for repeated workflows
- [[documentation]] — produces well-structured skill definitions with clear instructions
- [[planning]] — designs skill workflows that chain steps effectively

## Workflow
1. Gather skill requirements (name, description, expected inputs/outputs)
2. Generate skill markdown file following Claude Code skill format conventions
3. Validate the skill structure (frontmatter, sections, invocation syntax)
4. Place the skill file in the correct directory and confirm it is invocable

## Conecta com
- [[cc-audit]] recebe: skill files for consistency validation
- [[customaize-agent-create-skill]] recebe: advanced skill patterns when more customization is needed
- [[skill-reviewer]] recebe: generated skill for quality review

## Quando usar
- When you need to create a new custom slash command for your project
- When modifying an existing skill that is not working correctly
- When you want to validate that a skill file follows Claude Code conventions
