---
description: First-run setup wizard — build index, download embeddings, curate pipeline-owners for installed plugins.
---

# /advisor-setup — First-Run Wizard

You are running the first-run setup wizard for the skill-advisor plugin.
The wizard has **four steps**, executed in order. Step 1 runs auto after
one group-level confirmation. Step 2 is detection (read-only). Step 3
loops one `AskUserQuestion` per flagged plugin. Step 4 is a declarative
smoke check.

State lives at `~/.claude/advisor/setup.json`. User extensions land at
`~/.claude/advisor/pipeline-owners-user.json`.

---

## Step 0 — Read current state

```bash
node -e "
const s = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/setup-state.js');
const pkg = require(process.env.CLAUDE_PLUGIN_ROOT + '/package.json');
const state = s.readSetupState();
const firstRun = s.isFirstRun();
const needsRerun = s.needsFullRerun(state, pkg.version);
console.log(JSON.stringify({ firstRun, needsRerun, currentVersion: pkg.version, state }, null, 2));
"
```

Parse the output. If `firstRun` and `needsRerun` are both false AND `state.completed_steps` already contains every step in `['index','embeddings','owners','smoke']`, tell the user "Setup already completed on <completed_at>. Run `/advisor-index` to rebuild the index only, or delete `~/.claude/advisor/setup.json` to force a full re-run." and STOP.

Otherwise proceed to Step 1.

---

## Step 1 — Build index + embeddings (auto, group-confirm)

Print a summary box so the user sees what will happen:

```
┌────────────────────────────────────────────────────────────────┐
│ Step 1 — Mechanical setup                                      │
│                                                                │
│ 1. Build keyword + lite index (~5s, scans installed plugins)  │
│ 2. Download + build semantic embeddings                        │
│    First run: ~23 MB download + 2-5 min build                  │
│    Re-runs: cached, under 30s                                  │
│                                                                │
│ These steps run automatically in sequence. Progress shown.     │
└────────────────────────────────────────────────────────────────┘
```

Invoke `AskUserQuestion`:

```yaml
AskUserQuestion(
  questions: [{
    question: "Proceed with mechanical setup (build index + embeddings)?",
    header: "Setup",
    multiSelect: false,
    options: [
      { label: "Yes (Recomendado)", description: "Auto-build both — ~30s first run ignoring network, up to 5min with 23MB download" },
      { label: "Skip index", description: "Skip both. Advisor runs with stale/empty index — NOT recommended" },
      { label: "Build index only", description: "Keyword + lite only. Skip embeddings (~23MB). Semantic layer will be empty" }
    ]
  }]
)
```

On **Yes**: run in order, show stdout lines to user:
```bash
cd "$CLAUDE_PLUGIN_ROOT" && npm run index
cd "$CLAUDE_PLUGIN_ROOT" && node lib/build-embeddings.js
```

On **Build index only**: run only `npm run index`. Mark `index` step complete, leave `embeddings` NOT marked.

On **Skip index**: mark neither step complete. Print "⚠ Skipped. Run `/advisor-index` manually later." and proceed to Step 2.

After each command completes with exit 0, update state:

```bash
node -e "
const s = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/setup-state.js');
const pkg = require(process.env.CLAUDE_PLUGIN_ROOT + '/package.json');
let st = s.readSetupState();
if (!st.first_run_at) st.first_run_at = new Date().toISOString();
st.advisor_version = pkg.version;
// Mark the step that just completed — replace 'STEP_NAME' below.
st = s.markStepCompleted(st, 'STEP_NAME');
s.writeSetupState(st);
console.log('state updated');
"
```

Replace `STEP_NAME` with `'index'` or `'embeddings'` depending on which just finished. Run once per completed step.

If any command fails (non-zero exit), show stderr, do NOT mark the step complete, and ask:
- "Retry", "Skip and continue", "Abort wizard"

via `AskUserQuestion`.

---

## Step 1.5 — Vault opt-in (Obsidian)

Print an explanation:

```
┌────────────────────────────────────────────────────────────────┐
│ Step 1.5 — Bind an Obsidian vault (optional)                   │
│                                                                │
│ The advisor's graph layer reads wikilinks from your vault and  │
│ uses them as recommendation signal. Without a vault, the       │
│ semantic + keyword layers still work — graph just contributes  │
│ zero. You can enable this later by re-running /advisor-setup.  │
└────────────────────────────────────────────────────────────────┘
```

Ask via `AskUserQuestion`:

```yaml
AskUserQuestion(
  questions: [{
    question: "Configurar um vault Obsidian agora?",
    header: "Vault",
    multiSelect: false,
    options: [
      { label: "Sim, fornecer caminho",
        description: "Você digita o caminho. Wizard valida (path existe, é diretório, parece vault)." },
      { label: "Pular (Recomendado se não usa Obsidian)",
        description: "Graph layer fica desabilitado. Semantic + keyword continuam funcionando." }
    ]
  }]
)
```

If **Sim**: ask the user for the path via a follow-up `AskUserQuestion` with a single text option (Other free-text). Then validate via `lib/vault-config.js`:

```bash
node -e "
const { makeVaultConfig, VaultValidationError } = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/vault-config.js');
const candidate = process.env.VAULT_CANDIDATE_PATH;
try {
  const cfg = makeVaultConfig(candidate);
  console.log(JSON.stringify({ ok: true, path: cfg.path }));
} catch (err) {
  console.log(JSON.stringify({ ok: false, reason: err.reason || 'unknown', message: err.message }));
}
"
```

Pass the user-typed path via `VAULT_CANDIDATE_PATH` env var. On `{ ok: true }`, persist to setup state:

```bash
node -e "
const s = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/setup-state.js');
let st = s.readSetupState();
st.vault_config = { path: process.env.VAULT_CANDIDATE_PATH, indexed_at: null, graph_edges_count: 0 };
st = s.markStepCompleted(st, 'vault');
s.writeSetupState(st);
"
```

Optionally, rebuild the graph if the user wants:

```bash
cd \"$CLAUDE_PLUGIN_ROOT\" && SKILL_ADVISOR_VAULT_PATH=\"$VAULT_CANDIDATE_PATH\" node lib/build-graph.js
```

On `{ ok: false }`, show the `reason` (`not_found` / `not_a_directory` / `not_a_vault`) and re-prompt up to 2 times. After the 3rd failure, fall through to "Skip" with a stderr note.

If **Pular**: mark step complete with empty config:

```bash
node -e "
const s = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/setup-state.js');
let st = s.readSetupState();
st.vault_config = { path: null, indexed_at: null, graph_edges_count: 0 };
st = s.markStepCompleted(st, 'vault');
s.writeSetupState(st);
"
```

---

## Step 2 — Detect orchestrated plugins (read-only)

Load the full index (built in Step 1) and the detect-owners library:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const { detectAll } = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/detect-owners.js');
const { PIPELINE_OWNERS } = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/constants.js');

// Find the full index file (same logic as other commands use).
const indexPath = (function findIndex() {
  const candidates = [
    path.join(process.env.CLAUDE_PLUGIN_ROOT, 'lib', 'advisor-index-full.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
})();

if (!indexPath) { console.error('NO_INDEX'); process.exit(2); }
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

// Group skills by plugin.
const byPlugin = {};
for (const entry of index) {
  // id format: 'plugin:<plugin-id>:<skill>' | 'global:<skill>' | 'project:<skill>'
  const parts = (entry.id || '').split(':');
  if (parts[0] !== 'plugin' || parts.length < 3) continue;
  const pluginId = parts[1];
  if (!byPlugin[pluginId]) byPlugin[pluginId] = { skills: [], manifest: null };
  byPlugin[pluginId].skills.push({
    name: entry.name,
    invocation: entry.invocation,
    id: entry.id,
  });
}

// Load plugin manifests (for H1 metadata check) if available.
// Skip missing manifests silently — heuristic falls back to H2-H5.

// Run detection. Filter out plugins already in PIPELINE_OWNERS base.
const allCandidates = detectAll(byPlugin);
const newCandidates = allCandidates.filter(c => !PIPELINE_OWNERS.includes(c.plugin_id));

console.log(JSON.stringify({
  total_plugins: Object.keys(byPlugin).length,
  already_known: allCandidates.length - newCandidates.length,
  candidates_for_user: newCandidates,
}, null, 2));
"
```

Parse the JSON. Tell the user:

> "Detected **N plugins total**. **M already marked orchestrated** in the base list (no action needed). **K new candidates** flagged by heuristics for your confirmation."

If K == 0, skip Step 3 entirely — print "Nenhum plugin novo candidato. Owners base continuam em uso." and proceed to Step 4.

---

## Step 3 — Curate candidates (1 AskUserQuestion per plugin)

For each candidate in `candidates_for_user`, sorted by confidence DESC:

Print a summary box:
```
┌────────────────────────────────────────────────────────────────┐
│ Plugin: {plugin_id}                                            │
│ Confidence: {confidence} (heuristics: {heuristics_hit})        │
│                                                                │
│ Suggested canonical flow:                                      │
│   {suggested_canonical_flow.join(" → ")}                       │
│                                                                │
│ Pergunta: este plugin tem fluxo interno que NÃO deve ser       │
│ misturado com skills de outros plugins orquestrados?           │
└────────────────────────────────────────────────────────────────┘
```

Invoke `AskUserQuestion`:

```yaml
AskUserQuestion(
  questions: [{
    question: "É orquestrado?",
    header: "{plugin_id}",
    multiSelect: false,
    options: [
      {
        label: "Sim, usar fluxo sugerido (Recomendado)" /* if confidence >= 0.8, else "Sim, usar fluxo sugerido" */,
        description: "Adiciona {plugin_id} a PIPELINE_OWNERS com o flow acima. Advisor vai tratá-lo atomicamente."
      },
      {
        label: "Sim, mas customizar o flow",
        description: "Mesmo resultado, mas você edita o flow antes de salvar. Útil se a ordem do heurístico está errada."
      },
      {
        label: "Não, tratar como standalone",
        description: "Não adiciona. Skills deste plugin podem ser compostos com outros livremente."
      },
      {
        label: "Pular (decidir depois)",
        description: "Nenhuma decisão registrada. Você pode re-rodar /advisor-setup depois."
      }
    ]
  }]
)
```

Handle the decision:

**Sim, usar fluxo sugerido** → record the plugin + suggested_canonical_flow. Generate a placeholder fingerprint:
```json
{
  "best_for": "{plugin_id} orchestrated workflow (user-curated).",
  "typical_tasks": ["{plugin_id}-style task"],
  "not_for": ["simple one-step fixes"],
  "complexity_match": ["medium", "complex"]
}
```

**Sim, mas customizar o flow** → present the suggested flow and use `AskUserQuestion` with free-text (user types corrected flow as comma-separated invocations). Validate every invocation exists in the index. Then proceed like "Sim".

**Não** → record user_decision: "rejected". No user-config addition.

**Pular** → record user_decision: "skipped". No user-config addition.

After the loop, write user extensions:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const os = require('os');

const confirmations = JSON.parse(process.env.CONFIRMATIONS_JSON);
// confirmations = [{ plugin_id, canonical_flow, fingerprint }, ...]

const ext = {
  pipeline_owners: confirmations.map(c => c.plugin_id),
  canonical_flows: Object.fromEntries(confirmations.map(c => [c.plugin_id, c.canonical_flow])),
  pipeline_fingerprints: Object.fromEntries(confirmations.map(c => [c.plugin_id, c.fingerprint])),
};

const target = process.env.SKILL_ADVISOR_USER_CONFIG_PATH ||
  path.join(os.homedir(), '.claude', 'advisor', 'pipeline-owners-user.json');

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(ext, null, 2) + '\n');
console.log('user-config written to', target);
"
```

Pass the confirmations via `CONFIRMATIONS_JSON` env var.

Update setup-state:
```bash
node -e "
const s = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/setup-state.js');
let st = s.readSetupState();
st.plugins_detected = JSON.parse(process.env.DETECTED_JSON);
st = s.markStepCompleted(st, 'owners');
s.writeSetupState(st);
"
```

---

## Step 3.5 — Threshold tuning (hook nudge sensitivity)

Print explanation:

```
┌────────────────────────────────────────────────────────────────┐
│ Step 3.5 — Hook nudge threshold                                │
│                                                                │
│ Quanto maior o threshold, menos nudges (e cada um com mais     │
│ confiança). Quanto menor, mais nudges. Default compilado: 0.20.│
└────────────────────────────────────────────────────────────────┘
```

Ask via `AskUserQuestion`:

```yaml
AskUserQuestion(
  questions: [{
    question: "Qual sensibilidade pro hook de nudge?",
    header: "Threshold",
    multiSelect: false,
    options: [
      { label: "Balanced 0.5 (Recomendado)",
        description: "Middle ground — nudge quando confidence ≥ 50%." },
      { label: "Strict 0.7",
        description: "Menos nudges, só os de alta confiança." },
      { label: "Chatty 0.3",
        description: "Mais nudges, aceita ruído extra." },
      { label: "Manter default (0.20)",
        description: "Sem ThresholdConfig — hook usa o default compilado." }
    ]
  }]
)
```

For preset answers:

```bash
node -e "
const { makeThresholdConfig } = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/threshold-config.js');
const s = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/setup-state.js');
const preset = process.env.THRESHOLD_PRESET; // 'strict'|'balanced'|'chatty' or empty for keep-default
let st = s.readSetupState();
if (preset) {
  const tc = makeThresholdConfig(preset);
  st.threshold_config = { value: tc.value, preset: tc.preset };
}
st = s.markStepCompleted(st, 'threshold');
s.writeSetupState(st);
console.log(JSON.stringify(st.threshold_config || null));
"
```

Set `THRESHOLD_PRESET` to `strict`, `balanced`, `chatty`, or empty for "keep default". The hook (`advisor-nudge.cjs`) reads the persisted `threshold_config.value` on every prompt via the resolution cascade; no further wiring needed.

---

## Step 4 — Full smoke (lib/smoke-runner.js)

Run the full smoke runner — exercises all artifacts plus the constants merge plus a token-traversal of the lite index:

```bash
node -e "
const { runSmoke } = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/smoke-runner.js');
const r = runSmoke({ pluginRoot: process.env.CLAUDE_PLUGIN_ROOT });
console.log(JSON.stringify(r, null, 2));
"
```

The runner returns a `SmokeTestResult`:

```json
{
  "passed": true | false,
  "checks": [
    { "name": "full_index", "ok": true, "entry_count": 86, "bytes": 44612 },
    { "name": "lite_index", "ok": true, "entry_count": 86 },
    { "name": "embeddings", "ok": true, "optional": true, "bytes": 694682 },
    { "name": "constants_load", "ok": true, "owner_count": 5 },
    { "name": "token_smoke", "ok": true, "matched_task": "fix typo in line 47 of auth.ts" }
  ],
  "duration_ms": 12,
  "reason": null
}
```

Display the summary to the user:
- ✅ each `ok: true` check (show entry_count or owner_count when present)
- ❌ each `ok: false` non-optional check (show `reason`)
- ⚠ optional checks that failed (e.g., embeddings missing)

If `passed: false`, ask via `AskUserQuestion`:
- "Retry Step 1 (rebuild index/embeddings)"
- "Open the failing reason explanation and abort"
- "Finish anyway (advisor will run degraded)"

Otherwise mark `smoke` step complete and write `completed_at = <now>`:

```bash
node -e "
const s = require(process.env.CLAUDE_PLUGIN_ROOT + '/lib/setup-state.js');
let st = s.readSetupState();
st = s.markStepCompleted(st, 'smoke');
st.completed_at = new Date().toISOString();
s.writeSetupState(st);
console.log('wizard complete');
"
```

---

## Done

Print final summary:

```
┌────────────────────────────────────────────────────────────────┐
│ ✅ skill-advisor setup complete                               │
│                                                                │
│ Index:     built, N entries                                   │
│ Embeddings:{ built | skipped }                                │
│ Owners:    {K confirmed, J rejected, X skipped} + {base}      │
│ Smoke:     pass                                                │
│                                                                │
│ State: ~/.claude/advisor/setup.json                           │
│ User extension: ~/.claude/advisor/pipeline-owners-user.json   │
│                                                                │
│ Try it: /advisor "a task in plain language"                   │
└────────────────────────────────────────────────────────────────┘
```

Re-runs of `/advisor-setup` are idempotent — completed steps are skipped.
To force full re-run: delete `~/.claude/advisor/setup.json`.
To adjust owners without full re-run: edit `~/.claude/advisor/pipeline-owners-user.json` directly and run `/advisor-index` to rebuild.
