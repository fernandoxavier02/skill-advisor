---
name: advisor-config
description: Enable or disable the Skill Advisor hook and configure settings. Use /advisor-config disable to stop the nudge hook, /advisor-config enable to re-enable it, or /advisor-config status to check current state.
---

# /advisor-config — Configure Skill Advisor

Manage the advisor hook and settings.

## Usage

Parse the user's argument to determine the action:

- `/advisor-config disable` — Disable the hook
- `/advisor-config enable` — Re-enable the hook
- `/advisor-config status` — Show current config
- `/advisor-config threshold 0.5` — Set confidence threshold

## Steps

### 1. Locate config file

```bash
ADVISOR_LIB=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib" -type d 2>/dev/null | head -1)
[ -z "$ADVISOR_LIB" ] && ADVISOR_LIB="$(dirname "$(dirname "$0")")/lib"
CONFIG_FILE="$ADVISOR_LIB/advisor-config.json"
echo "CONFIG: $CONFIG_FILE"
[ -f "$CONFIG_FILE" ] && cat "$CONFIG_FILE" || echo '{"enabled": true, "threshold": 0.35}'
```

### 2. Handle action

**disable:**
Read the current config first, then toggle only the `enabled` field:
```bash
CURRENT=$(cat "$CONFIG_FILE" 2>/dev/null || echo '{"enabled": true, "threshold": 0.35}')
# Parse threshold from current config and preserve it
THRESH=$(echo "$CURRENT" | grep -o '"threshold":[^,}]*' | grep -o '[0-9.]*')
[ -z "$THRESH" ] && THRESH="0.35"
echo "{\"enabled\": false, \"threshold\": $THRESH}" > "$CONFIG_FILE"
echo "Advisor hook DESABILITADO. Rode /advisor-config enable para reativar."
```

**enable:**
Same pattern — preserve existing threshold:
```bash
CURRENT=$(cat "$CONFIG_FILE" 2>/dev/null || echo '{"enabled": true, "threshold": 0.35}')
THRESH=$(echo "$CURRENT" | grep -o '"threshold":[^,}]*' | grep -o '[0-9.]*')
[ -z "$THRESH" ] && THRESH="0.35"
echo "{\"enabled\": true, \"threshold\": $THRESH}" > "$CONFIG_FILE"
echo "Advisor hook HABILITADO."
```

**status:**
Read and display the config file. Also show:
- Index age (mtime of advisor-index-lite.json)
- Index entry count
- Hook enabled/disabled state
- Current threshold

**threshold N:**
Update the threshold value in the config JSON. Validate N is between 0.0 and 1.0.

### 3. Report to user

Confirm the action was taken and show the current state.
