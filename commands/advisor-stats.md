---
name: advisor-stats
description: Show session analytics and skill usage heat map. Displays usage patterns, category distribution, and trend data over 7d/30d/90d windows.
---

# /advisor-stats — Session Analytics & Heat Map

## Steps

### 1. Load analytics

```bash
ADVISOR_DATA="$HOME/.claude/advisor"
echo "=== TELEMETRY ==="
wc -l "$ADVISOR_DATA/telemetry.jsonl" 2>/dev/null || echo "0 entries"
echo "=== FEEDBACK ==="
wc -l "$ADVISOR_DATA/feedback.jsonl" 2>/dev/null || echo "0 entries"
```

If both files are missing or empty, tell user: "Nenhum dado encontrado. Rode /advisor algumas vezes e depois /advisor-feedback para alimentar as estatisticas."

### 2. Compute stats

```bash
STATS_JS=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib/advisor-stats.js" 2>/dev/null | head -1)
ADVISOR_DATA="$HOME/.claude/advisor"
```

Run the analytics module:
```bash
node -e "
  const { computeStats, computeHeatMap } = require('$STATS_JS');
  const stats = computeStats('$ADVISOR_DATA/telemetry.jsonl');
  const heatMap = computeHeatMap('$ADVISOR_DATA/telemetry.jsonl');
  console.log(JSON.stringify({ stats, heatMap }, null, 2));
"
```

### 3. Present results

Format the output as a readable report:

```
┌─────────────────────────────────────────────┐
│  ADVISOR STATS                               │
│                                              │
│  Sessions: N total (last 90 days)            │
│                                              │
│  Top Skills:                                 │
│    1. /skill-name  (N uses)                  │
│    2. /skill-name  (N uses)                  │
│    ...                                       │
│                                              │
│  Category Distribution:                      │
│    debugging: N%  implementation: N%         │
│    quality: N%    deployment: N%             │
│    ...                                       │
└─────────────────────────────────────────────┘
```

### 4. Heat Map (F6.2)

Format the heat map as a markdown table:

```
┌─────────────────────────────────────────────────────────┐
│  SKILL HEAT MAP                                          │
│                                                          │
│  Skill           │ 7d  │ 30d │ 90d │ Trend              │
│  ─────────────── │ ─── │ ─── │ ─── │ ───────            │
│  investigate      │  3  │  8  │ 12  │ ↑ up               │
│  review           │  2  │  5  │  5  │ → flat             │
│  fix              │  0  │  3  │  3  │ ↓ down             │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

Trend symbols: ↑ up, ↓ down, → flat.

### 5. Vault write (optional)

If `vault-pipelines/` directory exists in the plugin repo, write the heat map:

```bash
VAULT_PIPELINES=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/vault-pipelines" -type d 2>/dev/null | head -1)
if [ -n "$VAULT_PIPELINES" ]; then
  echo "Writing heat map to vault..."
fi
```

If exists, write a markdown file `heat-map-YYYY-MM-DD.md` with the heat map table. Otherwise skip silently.
