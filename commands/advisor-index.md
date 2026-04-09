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

4. After the keyword index is built, generate semantic embeddings:

```bash
EMBEDDER=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/build-embeddings.js" 2>/dev/null | head -1)
if [ -z "$EMBEDDER" ]; then
  echo "WARNING: Could not find build-embeddings.js."
else
  echo "Generating semantic embeddings (first run downloads ~23MB model)..."
  node "$EMBEDDER"
fi
```

5. Report the semantic search status:
   - If embeddings were generated: "Semantic search enabled. Hook will use embedding-based matching."
   - If embeddings failed: "Semantic search unavailable. Hook will use keyword matching as fallback."

6. Run v2 build modules (collision detection, affinity, combos, discovery, replay, hook-data bundle):

```bash
ADVISOR_PLUGIN=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib" -type d 2>/dev/null | head -1)
ADVISOR_DATA="$HOME/.claude/advisor"
ADVISOR_CACHE="$ADVISOR_DATA/cache"
mkdir -p "$ADVISOR_CACHE"
```

Run each build module in dependency order:

```bash
# F8: Collision detection (uses embeddings)
COLLISIONS_JS=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/build-collisions.js" 2>/dev/null | head -1)
if [ -n "$COLLISIONS_JS" ]; then
  echo "Running collision detection..."
  node -e "
    const { buildCollisionsFromDir } = require('$COLLISIONS_JS');
    buildCollisionsFromDir('$ADVISOR_PLUGIN', '$ADVISOR_CACHE/advisor-collisions.json');
  "
fi

# F1: Affinity scores (uses feedback + telemetry JSONL)
AFFINITY_JS=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/build-affinity.js" 2>/dev/null | head -1)
if [ -n "$AFFINITY_JS" ]; then
  echo "Computing affinity scores..."
  node -e "
    const { buildAffinityFromPaths } = require('$AFFINITY_JS');
    buildAffinityFromPaths('$ADVISOR_DATA/feedback.jsonl', '$ADVISOR_DATA/telemetry.jsonl', '$ADVISOR_CACHE/advisor-affinity.json');
  "
fi

# F3: Combo discovery (uses telemetry)
COMBOS_JS=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/build-combos.js" 2>/dev/null | head -1)
if [ -n "$COMBOS_JS" ]; then
  echo "Discovering skill combos..."
  node -e "
    const { buildCombosFromPath } = require('$COMBOS_JS');
    buildCombosFromPath('$ADVISOR_DATA/telemetry.jsonl', '$ADVISOR_CACHE/advisor-combos.json');
  "
fi

# F1.4: Discovery candidates (uses affinity + index)
DISCOVERY_JS=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/build-discovery.js" 2>/dev/null | head -1)
LITE_INDEX=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/advisor-index-lite.json" 2>/dev/null | head -1)
if [ -n "$DISCOVERY_JS" ] && [ -n "$LITE_INDEX" ]; then
  echo "Finding discovery candidates..."
  node -e "
    const { buildDiscoveryFromPaths } = require('$DISCOVERY_JS');
    buildDiscoveryFromPaths('$ADVISOR_CACHE/advisor-affinity.json', '$LITE_INDEX', '$ADVISOR_CACHE/advisor-discovery.json');
  "
fi

# F3.2: Replay candidates (uses combos)
REPLAY_JS=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/build-replay.js" 2>/dev/null | head -1)
if [ -n "$REPLAY_JS" ]; then
  echo "Building replay candidates..."
  node -e "
    const { buildReplayFromPath } = require('$REPLAY_JS');
    buildReplayFromPath('$ADVISOR_CACHE/advisor-combos.json', '$ADVISOR_CACHE/advisor-replay-candidate.json');
  "
fi

# Bundle: merge all into hook-data (D3)
HOOKDATA_JS=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/build-hook-data.js" 2>/dev/null | head -1)
if [ -n "$HOOKDATA_JS" ]; then
  echo "Building hook data bundle..."
  node -e "
    const { buildHookData } = require('$HOOKDATA_JS');
    buildHookData('$ADVISOR_CACHE', '$ADVISOR_CACHE/advisor-hook-data.json');
  "
fi
```

7. Report v2 build results:
   - Number of collision pairs detected
   - Number of skills with affinity scores
   - Number of combos discovered
   - Number of discovery candidates
   - Number of replay candidates
   - Hook data bundle size
