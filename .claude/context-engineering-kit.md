# Context Engineering Kit — Guia de Uso Detalhado

Plugin desenvolvido por **NeoLabHQ (Vlad Goncharov)**. 13 sub-plugins que aplicam técnicas avançadas de engenharia de contexto para melhorar a qualidade do Claude Code, baseados em papers de pesquisa e metodologias comprovadas (Toyota Production System, LLM-as-Judge, Self-Refine, Tree of Thoughts, First Principles Framework).

**Documentação oficial:** https://cek.neolab.finance

---

## Instalação

```bash
# Via marketplace do Claude Code
/plugin marketplace add NeoLabHQ/context-engineering-kit

# Instalar sub-plugin específico
/plugin install reflexion@NeoLabHQ/context-engineering-kit
/plugin install sadd@NeoLabHQ/context-engineering-kit
/plugin install sdd@NeoLabHQ/context-engineering-kit
```

---

## Visão Geral dos 13 Sub-Plugins

| Plugin | Versão | Propósito |
|--------|--------|-----------|
| `reflexion` | 1.1.4 | Auto-refinamento e loops de feedback |
| `customaize-agent` | 1.4.0 | Criar commands, skills, hooks e agentes |
| `code-review` | 1.1.1 | Review de código e PRs com agentes especializados |
| `kaizen` | 1.0.0 | Análise de causa raiz e melhoria contínua |
| `tdd` | 1.1.0 | Test-Driven Development com Red-Green-Refactor |
| `sadd` | 1.3.3 | Subagent-Driven Development com quality gates |
| `sdd` | 2.1.1 | Spec-Driven Development — de prompt a código funcional |
| `git` | 1.2.0 | Commits, PRs e worktrees padronizados |
| `docs` | 1.2.0 | Análise e escrita de documentação |
| `fpf` | 1.1.1 | First Principles Framework — raciocínio auditável |
| `ddd` | 2.0.0 | Clean Architecture, SOLID, DDD via rules automáticas |
| `mcp` | 1.2.1 | Setup de MCP servers e atualização do CLAUDE.md |
| `tech-stack` | 1.0.0 | Boas práticas por linguagem/framework no CLAUDE.md |

---

## 1. Reflexion — Auto-refinamento

**Base científica:** Self-Refine (2023) e Reflexion (2023). Resultado: +8–21% de qualidade vs. resposta direta.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `/reflexion:reflect` | Analisa o output anterior, identifica problemas e refina |
| `/reflexion:critique` | Crítica multi-perspectiva por agentes especializados |
| `/reflexion:memorize` | Extrai aprendizados e salva no `CLAUDE.md` do projeto |

### IMMEDIATE REFLECTION PROTOCOL — 6 Checklists

Quando `/reflexion:reflect` é invocado, o Claude executa sistematicamente:

**Checklist 1 — Completude**
```
[ ] A tarefa foi completamente concluída?
[ ] Todos os arquivos necessários foram criados/modificados?
[ ] Todos os requisitos do usuário foram atendidos?
[ ] Há alguma parte que ficou "para depois"?
```

**Checklist 2 — Qualidade**
```
[ ] O código segue os padrões do projeto?
[ ] Há repetição de código que poderia ser extraída?
[ ] Os nomes de variáveis/funções são descritivos?
[ ] A lógica é a mais simples possível para o problema?
```

**Checklist 3 — Correção**
```
[ ] Os edge cases foram tratados?
[ ] Há algum path que pode lançar exceção não tratada?
[ ] Os tipos estão corretos em todas as interfaces?
[ ] Os dados de entrada foram validados?
```

**Checklist 4 — Dependências**
```
[ ] Imports estão todos presentes e corretos?
[ ] Há dependências circulares introduzidas?
[ ] Versões de dependências são compatíveis?
[ ] Side effects em módulos compartilhados?
```

**Checklist 5 — Verificação de Fatos**
```
[ ] Documentação técnica citada foi verificada?
[ ] Comandos bash foram testados ou são seguros?
[ ] URLs e referências externas existem?
[ ] Números e métricas têm fonte?
```

**Checklist 6 — Verificação de Artefatos**
```
[ ] Arquivos criados realmente existem no filesystem?
[ ] Código pode ser executado sem modificação?
[ ] Testes passam com a implementação atual?
[ ] Configurações são válidas para o ambiente?
```

### Cenário real

```bash
> implementar sistema de notificações com WebSocket

# [Claude implementa]

> /reflexion:reflect
#
# REFLEXION REPORT
# ================
# Checklist 1 (Completude): PROBLEMA ENCONTRADO
#   - Reconexão automática não foi implementada
#   - Sem handler para WebSocket fechado inesperadamente
#
# Checklist 3 (Correção): PROBLEMA ENCONTRADO
#   - Sem validação de schema nas mensagens recebidas
#   - Race condition: subscribe() pode ser chamado antes de connect()
#
# Checklist 6 (Artefatos): OK
#   - Todos os arquivos existem
#   - WebSocket server inicia sem erros
#
# Refinando implementação...
# [aplica correções dos problemas encontrados]
```

### Trigger automático via hook

```bash
# A palavra "reflect" em inglês no prompt ativa automaticamente
> implementar rate limiting e reflect
# Hook detecta "reflect" → executa tarefa → roda /reflexion:reflect no final

# ATENÇÃO: somente "reflect" exato. Não funciona:
# "reflexão", "reflection", "reflecting", "reflita"
```

### `/reflexion:critique` — Perspectivas múltiplas

```bash
> /reflexion:critique
# Agentes especializados avaliam em paralelo:
#
# PERSPECTIVA — Segurança:
#   "Token de auth enviado pelo WebSocket sem validação de origem"
#
# PERSPECTIVA — Performance:
#   "Broadcast para todos os clientes = O(n) por mensagem.
#    Considerar salas/channels para grupos menores."
#
# PERSPECTIVA — Manutenibilidade:
#   "Lógica de reconexão acoplada ao componente React.
#    Extrair para hook customizado reutilizável."
#
# PERSPECTIVA — Testabilidade:
#   "WebSocket hardcoded impede testes unitários.
#    Injetar URL como dependency."
```

### `/reflexion:memorize` — Persistir aprendizados

```bash
> /reflexion:memorize
# Extrai padrões úteis da sessão e salva no CLAUDE.md:
#
# "## Aprendizados do projeto
#  - WebSocket: sempre implementar reconnection com exponential backoff
#  - WebSocket: validar schema de mensagens com Zod antes de processar
#  - WebSocket: usar rooms para evitar broadcast O(n) desnecessário"
```

---

## 2. Customaize Agent — Criar Extensões do Claude Code

**Objetivo:** toolkit completo para criar commands, skills, hooks e agentes com TDD aplicado a prompts.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `/customaize-agent:create-agent` | Cria agente com system prompt e triggers |
| `/customaize-agent:create-command` | Cria slash command com estrutura adequada |
| `/customaize-agent:create-workflow-command` | Command multi-step que despacha sub-agentes |
| `/customaize-agent:create-skill` | Cria skill via TDD de prompts |
| `/customaize-agent:create-hook` | Analisa projeto e cria hooks relevantes |
| `/customaize-agent:test-prompt` | Testa prompt com RED-GREEN-REFACTOR |
| `/customaize-agent:test-skill` | Valida que uma skill resiste à racionalização |
| `/customaize-agent:apply-anthropic-skill-best-practices` | Revisa skill contra boas práticas oficiais |

### Skills incluídas

- `customaize-agent:prompt-engineering` — few-shot, chain-of-thought, templates
- `customaize-agent:context-engineering` — mecânicas de janela de contexto, otimização
- `customaize-agent:agent-evaluation` — rubrics LLM-as-Judge, métricas

### Fluxo: criar uma skill nova

```bash
# 1. Criar a skill com TDD
> /customaize-agent:create-skill security-reviewer
#
# Claude:
# 1. Define cenários de SUCESSO para a skill:
#    - Dado: código com SQL injection → a skill DEVE identificar
#    - Dado: código sem vulnerabilidades → a skill NÃO DEVE reportar falsos positivos
#
# 2. Define cenários de FALHA (o que a skill não deve fazer):
#    - NÃO deve sugerir reescrever código correto
#    - NÃO deve ignorar vulnerabilidades de STRIDE
#
# 3. Implementa SKILL.md com os cenários como guia

# 2. Testar
> /customaize-agent:test-skill
# Executa a skill como sub-agente isolado com cenários de teste
# RED: falhou em 2 cenários → sugere melhorias → GREEN → REFACTOR

# 3. Verificar boas práticas
> /customaize-agent:apply-anthropic-skill-best-practices
# Checa: clareza de instrução, ausência de contradições,
#        contexto suficiente, separação de concerns
```

### Fluxo: criar um hook

```bash
> /customaize-agent:create-hook
# Analisa o projeto e sugere hooks relevantes:
#
# "Detectei que vocês usam Prisma e têm problemas com queries N+1.
#  Sugestão: hook PreToolUse que intercepta operações findMany sem 'include'
#  e avisa: 'Considere incluir as relações necessárias para evitar N+1.'"
#
# Cria: .claude/hooks/prisma-n1-guard.cjs
```

---

## 3. Code Review — Revisão com Agentes Especializados

### Agentes acionados automaticamente

| Agente | Foco | Tipo de problemas |
|--------|------|-------------------|
| `bug-hunter` | Bugs e erros lógicos | Off-by-one, null dereference, race conditions |
| `code-quality-reviewer` | SOLID, DRY, KISS | God functions, duplicação, acoplamento |
| `contracts-reviewer` | Interfaces e APIs públicas | Breaking changes, tipos fracos, inconsistências |
| `historical-context-reviewer` | Consistência com decisões passadas | Padrões revertidos, decisões ignoradas |
| `security-auditor` | Vulnerabilidades OWASP | Injection, auth bypass, exposição de dados |
| `test-coverage-reviewer` | Gaps de cobertura | Happy path sem testes, edge cases |

### Comandos

```bash
# Antes de fazer commit (mudanças locais não commitadas)
> /code-review:review-local-changes
#
# Output:
# REVIEW CONSOLIDADO
# ==================
# bug-hunter: CRITICAL — null dereference em user?.profile.name (linha 34)
# contracts-reviewer: HIGH — tipo de retorno mudou de string para string|null (breaking)
# test-coverage-reviewer: MEDIUM — novo branch sem cobertura (isAdmin path)
# security-auditor: OK
# code-quality-reviewer: LOW — função getUser faz 3 coisas diferentes (SRP)

# Revisar um PR do GitHub
> /code-review:review-pr 42
# Baixa o diff do PR #42
# Cada agente analisa em paralelo (contextos frescos)
# Consolida findings por severidade
```

### Output consolidado — formato real

```
CODE REVIEW — PR #42: "feat: add admin dashboard"
==================================================
6 agentes rodaram em paralelo.

CRITICAL (1):
[bug-hunter] src/admin/dashboard.tsx:89
  Variável 'data' pode ser undefined quando o fetch falha,
  mas é usada sem guard: data.items.map(...)
  Fix: adicionar early return se data for undefined

HIGH (2):
[security-auditor] src/api/admin.ts:34
  Endpoint /api/admin/users não verifica role do usuário.
  Qualquer usuário autenticado pode acessar dados de admin.

[contracts-reviewer] src/types/user.ts:12
  Campo 'lastLogin' mudou de Date para string — breaking para clientes existentes.

MEDIUM (1):
[test-coverage-reviewer] src/admin/
  0 testes para o dashboard de admin. Fluxos críticos sem cobertura.

LOW (1):
[code-quality-reviewer] src/admin/dashboard.tsx
  Componente com 340 linhas — extrair: UserTable, StatsCard, FilterBar
```

---

## 4. Kaizen — Análise de Causa Raiz

**Base:** Toyota Production System. Foco em causa raiz, não sintomas.

### Comandos e técnicas

| Comando | Técnica | Quando usar |
|---------|---------|-------------|
| `/kaizen:why` | 5 Porquês | Bug ou falha com causa desconhecida |
| `/kaizen:root-cause-tracing` | Call stack trace | Dado inválido chegando de lugar errado |
| `/kaizen:cause-and-effect` | Diagrama Ishikawa | Problema com múltiplas causas possíveis |
| `/kaizen:analyse-problem` | Documento A3 | Problema crônico que precisa de plano formal |
| `/kaizen:analyse` | Auto-seleciona | Quando não sabe qual técnica usar |
| `/kaizen:plan-do-check-act` | Ciclo PDCA | Melhoria iterativa com métricas |

### Exemplo — 5 Porquês

```bash
> /kaizen:why "Connection pool exhaustion nos picos de tráfego"
#
# Por quê o pool esgota?
# → Requests de banco ficam bloqueados por muito tempo
#
# Por quê ficam bloqueados?
# → Query de listagem de pedidos sem paginação retorna 50k+ rows
#
# Por quê não tem paginação?
# → A API foi escrita sem limite, frontend pagina no cliente
#
# Por quê o frontend pagina no cliente?
# → "Era mais fácil no começo" — decisão de atalho 8 meses atrás
#
# Por quê essa decisão não foi revisada?
# → Sem critério de performance nas code reviews
#
# CAUSA RAIZ: ausência de critério de performance nas reviews
# CONTRAMEDIDA: adicionar ao checklist de review:
#               "queries que retornam coleções têm LIMIT?"
```

### Exemplo — Diagrama Ishikawa

```bash
> /kaizen:cause-and-effect "Deploys falhando em produção"
#
# CATEGORIAS EXPLORADAS:
#
# Pessoas:
#   - Desenvolvedores não testam em ambiente similar à prod
#   - Sem processo de handoff entre who built / who deploys
#
# Processos:
#   - CI testa com Node 18, prod roda Node 20
#   - Secrets de prod não disponíveis em staging
#
# Ferramentas:
#   - Docker image diferente entre dev e prod
#   - Cache de dependências corrompido no CI
#
# Ambiente:
#   - Variáveis de ambiente com nomes diferentes em cada ambiente
#   - Timezone do servidor de prod diferente (UTC vs -03:00)
#
# CANDIDATAS A CAUSA RAIZ:
#   1. Node version mismatch (CI: 18, prod: 20) — verificar com evidência
#   2. Timezone mismatch em ordenações por data
```

### Exemplo — Documento A3

```bash
> /kaizen:analyse-problem "Taxa de erro de 2% no checkout"
#
# A3 REPORT — Checkout Error Rate
# =================================
# Data: 2026-04-08 | Autor: Claude
#
# 1. SITUAÇÃO ATUAL:
#    2% dos checkouts falham silenciosamente (sem erro para o usuário)
#    Impacto: ~R$12k/semana em receita perdida
#
# 2. META:
#    Reduzir para < 0.1% em 2 semanas
#
# 3. ANÁLISE DE CAUSA RAIZ:
#    - Payment gateway timeout: 30s configurado, p99 latência: 28s
#    - Race condition: webhook de confirmação chega antes do response
#    - Sem retry para falhas transitórias
#
# 4. CONTRAMEDIDAS:
#    [ ] Aumentar timeout para 45s
#    [ ] Implementar idempotency key no webhook
#    [ ] Adicionar retry com backoff exponencial (3 tentativas)
#
# 5. PLANO DE IMPLEMENTAÇÃO:
#    Semana 1: timeout + idempotency key (owner: backend team)
#    Semana 2: retry + monitoring de taxa de erro (owner: infra team)
#
# 6. FOLLOW-UP:
#    Medir taxa de erro em D+7 e D+14
```

---

## 5. TDD — Test-Driven Development

### O ciclo RED-GREEN-REFACTOR

```
RED:    Escrever teste que descreve o comportamento desejado → executa → FALHA
GREEN:  Implementar o mínimo de código para o teste passar → executa → PASSA
REFACTOR: Limpar código sem quebrar testes → executa → ainda PASSA
```

### Comandos

```bash
# Implementação com TDD desde o início
> use TDD para implementar validação de email no cadastro
#
# RED:
# test('email inválido deve retornar erro', () => {
#   expect(() => validateEmail('nao-e-email')).toThrow('Email inválido')
# })
# → FAIL: validateEmail não existe
#
# GREEN:
# function validateEmail(email) {
#   if (!email.includes('@')) throw new Error('Email inválido')
# }
# → PASS (mínimo necessário)
#
# REFACTOR:
# const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
# function validateEmail(email) {
#   if (!EMAIL_REGEX.test(email)) throw new Error('Email inválido')
# }
# → PASS (implementação correta)

# Já implementou sem testes?
> /tdd:write-tests
# Analisa o diff das mudanças atuais
# Identifica todos os branches e edge cases
# Escreve testes cobrindo cada um

# Testes quebrando após refactor?
> /tdd:fix-tests
# Analisa por que quebraram (mudança intencional vs. regressão)
# Atualiza se mudança é intencional, corrige código se é regressão
```

### Anti-patterns que a skill detecta

```
ANTI-PATTERN: Teste sem assertion
  test('cria usuário') { createUser({...}) }  // sem expect()
  → Teste sempre passa, não verifica nada

ANTI-PATTERN: Mockar o que está sendo testado
  jest.mock('./userService')
  test('userService.create funciona') { ... }
  → Você não está testando o código real

ANTI-PATTERN: Teste que testa implementação, não comportamento
  expect(spy).toHaveBeenCalledWith(...)  // frágil
  vs.
  expect(result.status).toBe('created')  // robusto

ANTI-PATTERN: Um teste gigante
  test('sistema de auth completo') { ... 200 linhas ... }
  → Impossível debugar quando falha
```

---

## 6. SADD — Subagent-Driven Development

**Problema resolvido:** em sessões longas, o Claude "normaliza" erros no próprio contexto. Sub-agentes frescos não têm esse viés.

### Padrões de execução

#### `/sadd:do-and-judge` — Execute + verificação independente

```
Fluxo:
1. meta-judge analisa a tarefa e define rubric de qualidade (em paralelo com passo 2)
2. implementer executa a tarefa em contexto limpo
3. judge independente (não viu a implementação) avalia contra rubric
4. Se PASS → entrega
5. Se FAIL → retry automático com feedback do judge (máx 2 retries)
6. Se ainda FAIL após 2 retries → escala para o usuário
```

```bash
> /sadd:do-and-judge "Implementar middleware de rate limiting"
#
# JUDGE REPORT — Round 1:
# FAIL
# - Sem persistência entre restarts (em memória apenas)
# - Não conta por IP, conta por sessão
# - Sem header Retry-After no 429
#
# Retry 1/2...
# [implementer recebe o feedback e refaz]
#
# JUDGE REPORT — Round 2:
# PASS
# - Redis persistence: ✓
# - Por IP: ✓
# - Retry-After header: ✓
# Score: 9.2/10
```

#### `/sadd:do-competitively` — GCS Pattern (Generate-Compare-Synthesize)

**O padrão mais poderoso do SADD** para decisões de arquitetura e implementações críticas.

```
Fase 1 — GENERATE (paralelo):
  meta-judge define spec e rubric
  generator-1 implementa abordagem A
  generator-2 implementa abordagem B
  generator-3 implementa abordagem C

Fase 2 — COMPARE (paralelo):
  judge-1 avalia abordagem A
  judge-2 avalia abordagem B
  judge-3 avalia abordagem C
  (cada judge vê apenas UMA abordagem, sem saber das outras)

Fase 3 — SYNTHESIZE (meta-judge):
  meta-judge recebe scores e raciocínios dos 3 judges
  decide estratégia de síntese:
  - SELECT_AND_POLISH: uma solução claramente superior → polir
  - FULL_SYNTHESIS: cada solução tem partes boas → combinar
  - REDESIGN: nenhuma passa → nova abordagem completamente diferente
```

```bash
> /sadd:do-competitively "Projetar storage de sessões escalável"
#
# Generator-1: Redis com hash por session_id
# Generator-2: PostgreSQL com particionamento por data
# Generator-3: JWT stateless (sem storage)
#
# Judge scores:
# Redis: 8.5 (rápido, simples, único ponto de falha)
# PostgreSQL: 7.2 (durável, lento, escalabilidade complexa)
# JWT: 9.1 (sem estado, revogação limitada)
#
# Meta-judge: FULL_SYNTHESIS
# "JWT para tokens de curta duração (15min) +
#  Redis como blocklist para revogação imediata.
#  Remove o single point of failure do Redis-only."
```

#### `/sadd:do-in-steps` — Sequencial com gates

```bash
> /sadd:do-in-steps
# Define os passos:
# Step 1: Criar schema do banco
# Step 2: Implementar model layer
# Step 3: Implementar service layer
# Step 4: Implementar controller/API
# Step 5: Testes de integração
#
# Para cada passo:
# → sub-agente implementa com contexto limpo
# → judge verifica antes de avançar
# → só continua se PASS
# Se FAIL: corrige o passo atual, não avança
```

#### `/sadd:judge-with-debate` — Judges debatem

```bash
> /sadd:judge-with-debate "Qual abordagem de cache usar para esta API?"
#
# Round 1:
# Judge-A: "Redis — performance máxima, ~0.1ms latência"
# Judge-B: "CDN cache — zero custo de infra, funciona para dados públicos"
# Judge-C: "Cache em memória — mais simples, sem dependência externa"
#
# Round 2 (cada judge responde aos outros):
# Judge-A sobre B: "Dados precisam de auth — CDN não funciona aqui"
# Judge-B sobre C: "Em memória não escala com múltiplas instâncias"
# Judge-C sobre A: "Concordo com Redis para este caso de uso"
#
# CONSENSUS: Redis
# Rationale: requer auth + múltiplas instâncias descartam as outras opções
```

---

## 7. SDD — Spec-Driven Development

**Ciclo de vida:** `draft/` → `todo/` → `in-progress/` → `done/`

### Comandos

| Comando | Ação | Diretório resultado |
|---------|------|---------------------|
| `/sdd:add-task "desc"` | Cria spec inicial | `.specs/tasks/draft/` |
| `/sdd:plan` | Refina e analisa impacto | `.specs/tasks/todo/` |
| `/sdd:implement @arquivo` | Implementa | `.specs/tasks/done/` |
| `/sdd:brainstorm` | Gera ideias antes de spec | — |

### Estrutura de um arquivo de spec

```markdown
<!-- .specs/tasks/todo/implementar-notificacoes-push.feature.md -->

# Feature: Notificações Push com WebSocket

## Objetivo
Notificar usuários em tempo real quando há novas mensagens.

## Critérios de Aceitação
- [ ] Usuário conectado recebe notificação em < 500ms
- [ ] Reconexão automática após queda de conexão
- [ ] Badge no ícone mostra número de notificações não lidas
- [ ] Funciona em mobile e desktop

## Arquivos Afetados (gerado por /sdd:plan)
- src/server/websocket.ts (criar)
- src/hooks/useNotifications.ts (criar)
- src/components/Navbar.tsx (modificar — adicionar badge)
- src/types/notifications.ts (criar)

## Padrões a Seguir
- WebSocket server: usar ws@8.x (já no projeto)
- Hooks: seguir padrão de useAuth.ts
- Tipos: inferidos do Zod schema, não escritos manualmente

## Implementação
[preenchido por /sdd:implement]
```

### Flags do `/sdd:implement`

```bash
# Implementação básica
> /sdd:implement @.specs/tasks/todo/feature.md

# Com human-in-the-loop (para aprovação em pontos críticos)
> /sdd:implement @.specs/tasks/todo/feature.md --human-in-the-loop

# Definir qualidade mínima (0–10, padrão: 7)
> /sdd:implement @.specs/tasks/todo/feature.md --target-quality 9

# Limitar iterações do loop de qualidade
> /sdd:implement @.specs/tasks/todo/feature.md --max-iterations 3

# Sem judges (mais rápido, menos qualidade)
> /sdd:implement @.specs/tasks/todo/feature.md --skip-judges

# Retomar implementação interrompida
> /sdd:implement @.specs/tasks/in-progress/feature.md --continue

# Refinar implementação já feita
> /sdd:implement @.specs/tasks/done/feature.md --refine
```

### Cenário real — feature completa

```bash
# 1. Criar spec
> /sdd:add-task "Implementar notificações push com WebSocket"
# Cria: .specs/tasks/draft/implementar-notificacoes-push.feature.md

# 2. Refinar (analisa codebase, identifica arquivos afetados)
> /sdd:plan
# Lê código existente, detecta padrões, preenche seção "Arquivos Afetados"
# Move para: .specs/tasks/todo/implementar-notificacoes-push.feature.md

# 3. Limpar contexto (IMPORTANTE — sub-agente começa fresh)
> /clear

# 4. Implementar com quality gate 8/10
> /sdd:implement @.specs/tasks/todo/implementar-notificacoes-push.feature.md --target-quality 8
#
# Loop interno:
#   Implementação → judge avalia → 6.5/10 (abaixo de 8)
#   Feedback: "Falta reconexão automática e tipos explícitos"
#   Refina → judge avalia → 8.3/10 → APROVADO
#
# Move para: .specs/tasks/done/implementar-notificacoes-push.feature.md

# 5. Ship
> /git:commit
> /git:create-pr
```

---

## 8. Git — Workflows Git Padronizados

### Commits com conventional commits + emoji

```bash
> /git:commit
# Analisa o diff e sugere:
# "✨ feat(notifications): add real-time push via WebSocket"
# "🐛 fix(auth): handle JWT expiry race condition"
# "♻️  refactor(checkout): extract payment validation logic"
# "🔒 security(api): add rate limiting to public endpoints"
# "📝 docs(readme): update installation instructions"
```

### PR estruturado

```bash
> /git:create-pr
#
# Título: feat(notifications): add real-time push via WebSocket
#
# ## Summary
# - Implement WebSocket server using ws@8.x
# - Add useNotifications React hook for client-side state
# - Show unread badge in Navbar component
#
# ## Test Plan
# - [ ] Notification received in < 500ms
# - [ ] Reconnection works after network drop
# - [ ] Badge count updates in real-time
# - [ ] Mobile: tested on 375px viewport
#
# ## Breaking Changes
# None
#
# ## Screenshots
# [auto-attached se /browse disponível]
```

### Análise de issue antes de começar

```bash
> /git:analyze-issue 147
# Lê a issue #147 do GitHub
# Busca no codebase: arquivos relacionados, código similar, padrões usados
# Produz spec técnica:
#
# "Issue #147: Adicionar exportação CSV
#  Arquivos afetados: src/api/exports.ts (criar), src/hooks/useExport.ts (criar)
#  Padrão: seguir src/api/reports.ts para formato de resposta
#  Dependência: papa-parse já instalado
#  Estimativa: ~4h"
```

### Worktrees para desenvolvimento paralelo

```bash
# Criar worktree
> /git:create-worktree feature/payment-v2
# Cria: ../meu-projeto-feature-payment-v2/
# npm install automático na nova worktree

# Comparar duas abordagens implementadas em paralelo
> /git:compare-worktrees feature/payment-v2 feature/payment-v3

# Merge seletivo: só os commits bons da worktree
> /git:merge-worktree feature/payment-v2
```

---

## 9. Docs — Documentação

```bash
# Após implementar feature
> /docs:update-docs
# Detecta o que mudou (via git diff)
# Atualiza:
#   - README.md: nova seção ou update em seção existente
#   - API docs (JSDoc, OpenAPI, etc.)
#   - CHANGELOG.md
#   - Exemplos de código outdated

# README muito longo / verboso?
> /docs:write-concisely README.md
# Reescreve eliminando:
#   - Redundâncias
#   - Explicações óbvias
#   - Marketing language
#   - Seções nunca lidas
# Mantém: o que é, como instalar, exemplos, referência rápida
```

---

## 10. FPF — First Principles Framework

**Filosofia:** o AI gera opções e evidências; o humano decide. Raciocínio auditável via ciclo ADI (Abdução-Dedução-Indução).

### Níveis de conhecimento

| Nível | Significado | Ação |
|-------|-------------|------|
| L0 | Fato verificado com evidência direta | Usar sem ressalvas |
| L1 | Hipótese plausível, inferida | Verificar antes de decidir |
| L2 | Especulação, sem evidência | Marcar como "para investigar" |

### Comandos

```bash
# Decisão de arquitetura
> /fpf:propose-hypotheses "armazenamento de sessões de usuário"
#
# HIPÓTESES GERADAS:
#
# [H1] Redis — L1
#   Premissa: sessões são temporárias, acesso frequente, Redis é rápido
#   Evidência necessária: latência aceitável no tier do cliente?
#   Confiança: 0.75
#   Trade-off: single point of failure
#
# [H2] PostgreSQL sessions — L0
#   Premissa: já temos PG no projeto (verificado em package.json)
#   Evidência disponível: tabela `sessions` já existe (confirmado)
#   Confiança: 0.85
#   Trade-off: mais lento para leituras frequentes
#
# [H3] JWT stateless — L1
#   Premissa: sem storage, escalável horizontalmente
#   Evidência necessária: revogação imediata é requisito?
#   Confiança: 0.60
#   Trade-off: sem revogação sem blocklist

# Nova evidência chega
> /fpf:actualize "Redis não está disponível no plano do cliente"
# [H1] Redis: marcado como INVIÁVEL
# [H2] PostgreSQL: confiança sobe para 0.92 (único viável)
# [H3] JWT: confiança sobe para 0.70 (alternativa se revogação não for requisito)

# Consultar decisões anteriores do projeto
> /fpf:query "banco de dados"
# Lista todas as hipóteses sobre banco registradas anteriormente
# Mostra: data, decisão tomada, razão, outcome observado
```

---

## 11. DDD — Domain-Driven Development

**14 rules automáticas** incorporadas ao CLAUDE.md via `ddd:setup-code-formating`.

### Categorias de rules

**Arquitetura:**
- Clean Architecture & DDD — domain no centro, dependências apontam para dentro
- Separation of Concerns — UI, business logic e infra separados
- Functional Core / Imperative Shell — lógica pura no core, side effects na borda

**Design de Funções:**
- Command-Query Separation — funções que calculam não mudam estado; funções que mudam não retornam valor
- Principle of Least Astonishment — o nome da função descreve exatamente o que ela faz
- Call-Site Honesty — o código no ponto de chamada deve deixar óbvio o que vai acontecer

**Explicitude:**
- Explicit Control Flow — sem magic, sem flow implícito
- Explicit Data Flow — dados passados explicitamente, não via globals ou closures ocultas
- Explicit Side Effects — side effects identificados e contidos

**Qualidade:**
- Error Handling — todo error path tratado explicitamente
- Domain-Specific Naming — nomes do domínio do negócio, não genéricos
- Library-First — usar biblioteca antes de reinventar
- Early Return — fail fast, sem aninhamento profundo
- Size Limits — funções < 20 linhas, arquivos < 200 linhas, componentes < 150 linhas

### Exemplo — aplicando DDD rules

```bash
# Código que viola várias rules:
function processOrder(o) {           # nome genérico, argumento abreviado
  let data = fetchUser(o.userId)     # side effect implícito no meio
  if (data && data.isActive) {
    let total = o.items.reduce(...)  # cálculo misturado com side effects
    sendEmail(data.email, total)     # command que "deveria" ser separado
    return total                     # CQS violado: retorna valor E tem side effect
  }
}

# Com DDD rules aplicadas:
function calculateOrderTotal(order: Order): Money {     # puro, sem side effects
  return order.items.reduce(
    (sum, item) => sum.add(item.price.times(item.quantity)),
    Money.zero(order.currency)
  )
}

async function fulfillOrder(orderId: OrderId): Promise<void> {   # command puro
  const order = await orderRepository.findById(orderId)           # explicit data flow
  const user = await userRepository.findById(order.customerId)
  const total = calculateOrderTotal(order)                        # functional core
  await emailService.sendOrderConfirmation(user.email, total)     # shell
}
```

---

## 12. MCP — Setup de MCP Servers

```bash
# Context7 — documentação de bibliotecas
> /mcp:setup-context7-mcp
# Atualiza .claude/mcp.json e CLAUDE.md com instruções de uso

# Serena — leitura inteligente de codebase
> /mcp:setup-serena-mcp

# Construir MCP server customizado
> /mcp:build-mcp "servidor MCP para nossa API interna de produtos"
# Claude: define as ferramentas expostas, implementa o servidor,
#         documenta como configurar no .claude/mcp.json
```

---

## 13. Tech Stack — Boas Práticas por Linguagem

```bash
# TypeScript (mais completo)
> /tech-stack:add-typescript-best-practices
# Atualiza CLAUDE.md com:
#   - strict: true obrigatório no tsconfig
#   - type-only imports: import type { Foo } from './foo'
#   - Naming: PascalCase para tipos, camelCase para variáveis
#   - Error: Result<T, E> em vez de exceptions para erros esperados
#   - Evitar: any, as (type assertion), @ts-ignore
#   - Prefira: unknown sobre any, satisfies sobre as

# Adicionar outras stacks
> /tech-stack:add-react-best-practices
> /tech-stack:add-python-best-practices
> /tech-stack:add-go-best-practices
```

---

## Fluxos Combinados

### Feature nova com qualidade máxima

```bash
# 1. Spec
> /sdd:add-task "Implementar X"
> /sdd:plan

# 2. Contexto limpo
> /clear

# 3. Implementar com quality gate
> /sdd:implement @.specs/tasks/todo/x.feature.md --target-quality 8

# 4. Revisar
> /code-review:review-local-changes

# 5. Auto-refinamento
> /reflexion:reflect
> /reflexion:memorize

# 6. Testes
> /tdd:write-tests

# 7. Ship
> /git:commit
> /git:create-pr
```

### Debug de problema difícil

```bash
# Técnica automática (seleciona entre 5 Porquês, Ishikawa, A3)
> /kaizen:analyse "API retorna respostas incorretas aleatoriamente"

# Hipóteses concorrentes
> /fpf:propose-hypotheses "causa de respostas incorretas na API"

# Drill na causa raiz
> /kaizen:root-cause-tracing

# Implementação competitiva do fix
> /sadd:do-competitively "implementar fix para o problema de cache inconsistente"
```

### Decisão de arquitetura rigorosa

```bash
# 1. Levantar hipóteses com evidências
> /fpf:propose-hypotheses "strategy de autenticação para o produto"

# 2. Múltiplas implementações competindo
> /sadd:do-competitively "implementar auth com as 3 abordagens candidatas"

# 3. Debate entre juízes até consensus
> /sadd:judge-with-debate "qual abordagem de auth usar?"

# 4. Documentar a decisão
> /fpf:actualize "[nova evidência ou resultado do debate]"
```

### Criar extensão do Claude Code

```bash
# 1. Criar a skill com TDD de prompts
> /customaize-agent:create-skill minha-skill

# 2. Testar resistência à racionalização
> /customaize-agent:test-skill

# 3. Verificar boas práticas oficiais
> /customaize-agent:apply-anthropic-skill-best-practices

# 4. Criar hook complementar
> /customaize-agent:create-hook
```

### Refatoração com segurança

```bash
# 1. Verificar estado atual
> /reflexion:reflect   # o que está errado no código atual?

# 2. Analisar causa raiz do problema
> /kaizen:why "código difícil de manter"

# 3. Propor abordagens competitivas
> /sadd:do-competitively "refatorar módulo de pagamento"

# 4. Review antes de mergear
> /code-review:review-local-changes

# 5. Persistir aprendizados
> /reflexion:memorize
```

---

## Referências Científicas

| Paper | Técnica | Impacto medido |
|-------|---------|----------------|
| [Self-Refine (2023)](https://arxiv.org/abs/2303.17651) | Base do Reflexion | +8–21% de qualidade |
| [Reflexion (2023)](https://arxiv.org/abs/2303.11366) | Memory updates após reflexão | +10.6% em benchmarks |
| [Agentic Context Engineering](https://arxiv.org/abs/2510.04618) | Fundamento do context-engineering skill | — |
| [LLM-as-a-Judge](https://arxiv.org/abs/2306.05685) | Base do SADD judge | 80%+ concordância com avaliadores humanos |
| [Prompting Science Report 3](https://arxiv.org/abs/2508.00614) | Persuasion principles | 33% → 72% compliance |
| [Tree of Thoughts](https://arxiv.org/abs/2305.10601) | Base do do-competitively | — |
| [First Principles Framework](https://github.com/ailev/FPF) | FPF | — |

**Documentação oficial:** https://cek.neolab.finance
