#!/bin/bash
# Patch build-embeddings.js to add HF mirror fallback
# Run after skill-advisor plugin updates to restore the fix
#
# What it does:
#   - Replaces the single-host model loading with a fallback chain
#   - Primary: huggingface.co → Fallback: hf-mirror.com
#   - Also installs @huggingface/transformers if missing

set -e

PLUGIN_DIR=$(find "$HOME/.claude/plugins/cache" -path "*/skill-advisor/*/lib" -type d 2>/dev/null | head -1)
if [ -z "$PLUGIN_DIR" ]; then
  echo "ERROR: skill-advisor plugin not found"
  exit 1
fi

PLUGIN_ROOT=$(dirname "$PLUGIN_DIR")
echo "Plugin root: $PLUGIN_ROOT"

# Install dependency if missing
if [ ! -d "$PLUGIN_ROOT/node_modules/@huggingface" ]; then
  echo "Installing @huggingface/transformers..."
  cd "$PLUGIN_ROOT" && npm install
fi

# Check if patch already applied
if grep -q "hf-mirror.com" "$PLUGIN_DIR/build-embeddings.js" 2>/dev/null; then
  echo "Patch already applied."
  exit 0
fi

# Apply patch: replace single-host loading with fallback chain
FILE="$PLUGIN_DIR/build-embeddings.js"
if grep -q "const { pipeline } = await import" "$FILE" 2>/dev/null; then
  # Old format (single import + single pipeline call)
  sed -i.bak '
/Loading transformers.js/,/dtype.*fp32/{
  /Loading transformers.js/c\
  console.log('\''Loading transformers.js...'\'');\
  const transformers = await import('\''@huggingface/transformers'\'');\
  const { pipeline } = transformers;\
  const hosts = [\
    { name: '\''HuggingFace'\'', url: '\''https://huggingface.co/'\'' },\
    { name: '\''HF-Mirror'\'', url: '\''https://hf-mirror.com/'\'' },\
  ];\
  let embedder;\
  for (const host of hosts) {\
    try {\
      console.log(`Loading embedding model via ${host.name}...`);\
      console.log('\''First run downloads ~23MB. Subsequent runs use cache.'\'');\
      transformers.env.remoteHost = host.url;\
      embedder = await pipeline('\''feature-extraction'\'', '\''Xenova/all-MiniLM-L6-v2'\'', { dtype: '\''fp32'\'' });\
      console.log(`Model loaded successfully via ${host.name}.`);\
      break;\
    } catch (err) {\
      console.warn(`Failed via ${host.name}: ${err.message}`);\
      if (host === hosts[hosts.length - 1]) throw err;\
      console.log('\''Trying next host...'\'');\
    }\
  }
  /const { pipeline }/d
  /Loading embedding/d
  /First run downloads/d
  /const embedder/d
  /dtype.*fp32/d
}' "$FILE"
  echo "Patch applied to $FILE"
else
  echo "WARNING: File format not recognized — patch may already be applied or file has changed"
fi

# Also patch paths.js vault path
PATHS_FILE="$PLUGIN_DIR/paths.js"
if grep -q "obsisian" "$PATHS_FILE" 2>/dev/null; then
  sed -i.bak "s|path.join(HOME, '.claude', '.claude', 'obsisian', 'Skill Advisor Claude code')|process.env.SKILL_ADVISOR_VAULT || path.join(HOME, 'Documents', 'claude code skill creator')|" "$PATHS_FILE"
  echo "Vault path patched in paths.js"
fi

echo "Done. Run: node $PLUGIN_DIR/build-embeddings.js"
