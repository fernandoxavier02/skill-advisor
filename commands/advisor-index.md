---
name: advisor-index
description: Rebuild the Skill Advisor index by scanning all installed skills, plugins, MCP servers, and agents. Run this after installing new plugins or periodically to keep recommendations fresh.
---

# /advisor-index — Rebuild Skill Advisor Index

Run the indexer script to scan all sources and generate the two-tier index.

## Steps

1. Find and run the indexer script:

```bash
INDEXER=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/build-index.js" 2>/dev/null | head -1)
if [ -z "$INDEXER" ]; then
  echo "ERROR: Could not find build-index.js. Is the skill-advisor plugin installed?"
else
  node "$INDEXER"
fi
```

2. After the script completes, report the results to the user:
   - Number of entries indexed
   - Size of lite vs full index
   - Any warnings (size budget exceeded, malformed files skipped)

3. If the lite index exceeds 100KB, warn the user:
   "The lite index is over 100KB. The hook may exceed the 50ms cold-read budget on Windows. Consider reducing the number of installed plugins or running /advisor-config disable to turn off the hook."
