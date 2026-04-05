# Skill Advisor

Plugin inteligente para Claude Code que recomenda a combinacao ideal de skills, plugins, MCPs e agents para qualquer tarefa.

## O que faz

O Skill Advisor funciona como um **orquestrador de ferramentas**. Em vez de voce precisar saber qual skill usar, ele:

1. Analisa sua tarefa (via hook automatico ou comando `/advisor`)
2. Busca no catalogo de 348+ skills instaladas usando keyword matching + busca semantica
3. Recomenda um loadout ordenado com dependencias entre os passos
4. Apresenta um dry-run visual para voce aprovar antes de executar

## Arquitetura

```
skill-advisor/
|-- plugin.json              # Manifesto do plugin (autoDiscover: true)
|-- package.json             # Dependencias (transformers.js para embeddings)
|
|-- commands/                # Slash commands (/advisor, /advisor-index, etc.)
|   |-- advisor.md           # Comando principal — recomenda skills
|   |-- advisor-catalog.md   # Gera vault Obsidian com skill cards
|   |-- advisor-config.md    # Habilita/desabilita hook, ajusta threshold
|   |-- advisor-feedback.md  # Registra feedback sobre recomendacoes
|   |-- advisor-index.md     # Reconstroi indice de skills (keyword + embeddings)
|
|-- agents/
|   |-- advisor-router.md    # Subagente Sonnet que analisa tarefa e retorna JSON
|
|-- skills/
|   |-- advisor-skill/
|       |-- SKILL.md         # Auto-discovery — ativa quando usuario pede ajuda
|
|-- hooks/
|   |-- advisor-nudge.cjs    # Hook UserPromptSubmit — sugere /advisor em tempo real
|   |-- hooks.json           # Configuracao do hook
|
|-- lib/                     # Scripts Node.js (core engine)
|   |-- paths.js             # Resolucao de caminhos (index, config, telemetria)
|   |-- build-index.js       # Gera indice keyword (lite + full) de todas as skills
|   |-- build-embeddings.js  # Gera embeddings semanticos via transformers.js
|   |-- build-catalog.js     # Escaneia todas as fontes para o vault Obsidian
|   |-- build-graph.js       # Constroi grafo de conexoes entre skills/conceitos
|   |-- graph-search.js      # Busca no grafo por adjacencia
|   |-- semantic.js          # Motor de busca semantica com embeddings pre-computados
|   |-- advisor-index-lite.json   # Indice leve (<100KB) para o hook
|   |-- advisor-index-full.json   # Indice completo para o /advisor
|   |-- advisor-embeddings.json   # Embeddings pre-computados
|   |-- advisor-vocab.json        # Vocabulario para embeddings
|
|-- vault-skills/            # 348 skill cards Obsidian (.md com frontmatter YAML)
|-- vault-concepts/          # 45 concept notes com backlinks
|-- vault-pipelines/         # 8 pipeline templates (bugfix, feature, security, etc.)
|-- vault-graph/             # Cache do grafo (adjacency.json, stats.json)
|
|-- tests/                   # Testes unitarios
    |-- advisor-nudge.test.js
    |-- build-index.test.js
    |-- paths.test.js
    |-- fixtures/             # Dados de teste
```

## Como funciona

### Fluxo do Hook (automatico)

Toda vez que voce digita um prompt no Claude Code:

```
Voce digita prompt
       |
       v
advisor-nudge.cjs executa (<50ms)
       |
       v
Tokeniza prompt (PT-BR + EN com sinonimos)
       |
       v
Busca semantica (embeddings) ou keyword matching (fallback)
       |
       v
Se score > threshold (0.20): imprime sugestao
  "[Advisor] Considere /advisor — detectei relevancia com: /investigate (85%), /fix (72%)"
```

**Caracteristicas do hook:**
- Processo efemero — sem cache em memoria
- Completa em <50ms mesmo no Windows
- Nao faz chamadas LLM nem rede
- Bilíngue (PT-BR + EN) com ponte de sinonimos
- Ignora prompts que comecam com `/` (slash commands)

### Fluxo do /advisor (manual)

```
Voce digita: /advisor preciso corrigir um bug de autenticacao
       |
       v
1. Carrega indice completo (advisor-index-full.json)
       |
       v
2. Coleta contexto (branch, status git, tipo de projeto)
       |
       v
3. Spawna subagente advisor-router (modelo Sonnet)
   - Recebe: tarefa + contexto + indice
   - Classifica tipo de tarefa (bugfix, feature, audit, etc.)
   - Seleciona 3-5 skills com dependencias
   - Retorna JSON estruturado
       |
       v
4. Se ambiguo: faz ate 2 rodadas de perguntas
       |
       v
5. Apresenta dry-run visual:
   +------------------------------------------+
   |  ADVISOR LOADOUT (dry-run)               |
   |  1. /investigate  [debugging]  ~5min     |
   |  2. /fix          [impl]      ~10min     |
   |  3. /review       [quality]   ~5min      |
   |  Total: ~20min | ~8K tokens              |
   +------------------------------------------+
       |
       v
6. Voce escolhe: Aprovar / Modificar / Cancelar
       |
       v
7. Telemetria salva em advisor-telemetry.jsonl
```

### Vault Obsidian (/advisor-catalog)

O `/advisor-catalog` gera uma base de conhecimento completa em formato Obsidian:

- **Skill cards** (348): cada skill instalada vira um arquivo `.md` com frontmatter YAML (aliases, tipo, categoria, inputs/outputs) e backlinks para conceitos
- **Concept notes** (45): temas gerais (debugging, security, testing, etc.) com lista de skills relacionadas
- **Pipeline templates** (8): sequencias pre-definidas (bugfix, feature, deploy, etc.)
- **Grafo** (401 nodes, 2803 edges, 549 aliases): cache de adjacencia para busca rapida

O vault fica em `~/.claude/.claude/obsisian/Skill Advisor Claude code/` e pode ser aberto no Obsidian para navegacao visual.

## Comandos disponiveis

| Comando | O que faz |
|---------|-----------|
| `/advisor <tarefa>` | Analisa tarefa e recomenda loadout de skills |
| `/advisor-index` | Reconstroi indices keyword + embeddings |
| `/advisor-catalog` | Gera vault Obsidian com skill cards |
| `/advisor-config status` | Mostra configuracao atual |
| `/advisor-config enable` | Habilita hook automatico |
| `/advisor-config disable` | Desabilita hook automatico |
| `/advisor-config threshold 0.3` | Ajusta sensibilidade (0.0-1.0) |
| `/advisor-feedback` | Registra feedback sobre recomendacao |

## Instalacao

O plugin ja esta instalado globalmente via marketplace FX-studio-AI.

### Verificar instalacao

```bash
# Deve mostrar skill-advisor@FX-studio-AI: true
grep "skill-advisor" ~/.claude/settings.json
```

### Reconstruir indices (necessario apos instalar novos plugins)

```
/advisor-index
```

### Gerar vault Obsidian (opcional)

```
/advisor-catalog
```

## Configuracao

### Threshold do hook

O threshold controla a sensibilidade do hook automatico. Valor menor = mais sugestoes, valor maior = menos sugestoes.

- **Default:** 0.20
- **Recomendado:** 0.20-0.40
- **Ajustar:** `/advisor-config threshold 0.35`

### Desabilitar hook

Se as sugestoes automaticas incomodarem:

```
/advisor-config disable
```

### Variaveis de ambiente (alternativa)

```bash
ADVISOR_ENABLED=false    # desabilita hook
ADVISOR_THRESHOLD=0.35   # ajusta threshold
```

## Dependencias

- **Node.js >= 18** — runtime para scripts
- **@huggingface/transformers** — embeddings semanticos locais (~23MB no primeiro uso)

## Limitacoes atuais (v0.1.0)

- Execucao de pipeline e manual (voce roda cada skill na ordem sugerida)
- Cards do vault sao gerados com metadados basicos (aliases, conceitos, categoria)
- Grafo de conexoes usa backlinks estaticos, sem pesos dinamicos
- Hook nao funciona offline (embeddings precisam ser pre-computados via `/advisor-index`)

## Telemetria

O plugin salva localmente em `lib/advisor-telemetry.jsonl`:
- Timestamp da recomendacao
- Acao tomada (approved/rejected/modified)
- Tamanho do loadout
- Skill top-ranked

Nenhum dado e enviado para servidores externos.
