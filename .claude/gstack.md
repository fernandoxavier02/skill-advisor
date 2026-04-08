# gstack — Guia de Uso Detalhado

Plugin criado por **Garry Tan** (Presidente & CEO da Y Combinator). Transforma o Claude Code em um time virtual de engenharia com 30+ skills especializadas — CEO, eng manager, designer, QA lead, security officer e release engineer.

> "600.000+ linhas de código de produção em 60 dias, part-time, enquanto rodava a YC em tempo integral."

**Repositório:** `https://github.com/garrytan/gstack` | **Licença:** MIT

---

## Instalação

```bash
# Global (30 segundos)
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup

# Modo Team (compartilhado no repositório)
cd ~/.claude/skills/gstack && ./setup --team
cd <seu-repo>
~/.claude/skills/gstack/bin/gstack-team-init required
git add .claude/ CLAUDE.md && git commit -m "require gstack for AI-assisted work"
```

Auto-update silencioso a cada sessão (throttled 1x/hora). Zero vendor lock-in.

---

## Mapa de Skills

| Skill | Categoria | Quando usar |
|-------|-----------|-------------|
| `/office-hours` | Produto | Ideia nova, "vale a pena construir isso?" |
| `/plan-ceo-review` | Produto | Revisar escopo e estratégia do plano |
| `/plan-eng-review` | Arquitetura | Travar arquitetura antes de codar |
| `/plan-design-review` | Design | Revisar plano com UI/UX |
| `/plan-devex-review` | DX | Revisar DX de APIs, CLIs, SDKs |
| `/autoplan` | Produto | Todos os reviews em sequência automática |
| `/investigate` | Debug | Bug, erro, "por que isso quebrou?" |
| `/review` | Qualidade | Code review pré-merge |
| `/ship` | Deploy | Criar PR completo |
| `/land-and-deploy` | Deploy | Merge PR, aguardar CI, verificar prod |
| `/qa` | Qualidade | QA completo com correção de bugs |
| `/qa-only` | Qualidade | Só o relatório de QA |
| `/canary` | Monitoramento | Vigiar deploy em produção |
| `/benchmark` | Performance | Core Web Vitals, regressões |
| `/health` | Qualidade | Score de qualidade do codebase (0–10) |
| `/cso` | Segurança | Auditoria OWASP + STRIDE |
| `/retro` | Processo | Retrospectiva semanal |
| `/checkpoint` | Processo | Salvar e retomar estado |
| `/document-release` | Docs | Atualizar docs após ship |
| `/design-consultation` | Design | Criar sistema de design do zero |
| `/design-shotgun` | Design | Gerar e comparar variantes visuais |
| `/design-html` | Design | HTML/CSS de produção a partir de mockup |
| `/design-review` | Design | Audit visual de site ao vivo |
| `/devex-review` | DX | Audit DX real no browser |
| `/codex` | Revisão | Segunda opinião via Codex CLI |
| `/learn` | Memória | Gerenciar aprendizados por projeto |
| `/careful` | Segurança | Guardrails para comandos destrutivos |
| `/guard` | Segurança | Modo máximo: careful + freeze |
| `/freeze` | Segurança | Restringir edições a um diretório |
| `/browse` | Browser | Chromium headless controlado por IA |
| `/pair-agent` | Browser | Compartilhar browser com agente remoto |
| `/setup-deploy` | Config | Configurar plataforma de deploy |
| `/gstack-upgrade` | Meta | Atualizar gstack para versão mais recente |

---

## 1. office-hours — YC Office Hours

**Objetivo:** expor a realidade de demanda de um produto com 6 perguntas de forcing. Zero halagos — o modo é o dos partners da YC.

### Modos de detecção automática

| Sinal no prompt | Modo ativado |
|-----------------|-------------|
| "startup", "empresa", "co-founder", "raise", "runway" | **Startup** — foco em PMF e traction |
| "side project", "hobby", "personal", "build for fun" | **Builder** — foco em execução e escopo |
| Sem sinal claro | Pergunta antes de começar |

### As 6 Perguntas de Forcing

**Q1 — Demand Reality**
> "Mostre evidência concreta que pessoas querem isso — não o que elas dizem, o que elas fazem."

- Resposta fraca: "Todo mundo reclama desse problema"
- Resposta forte: "Tenho 12 pessoas que me ligaram pedindo para pagar antes de eu construir"

**Q2 — Status Quo**
> "O que elas fazem hoje? Descreva o workflow exato."

- Resposta fraca: "Usam planilhas, é uma bagunça"
- Resposta forte: "Exportam CSV do Salesforce → abrem no Excel → copiam para o Google Sheets → mandam por email para aprovação → repetem semanalmente"

**Q3 — Desperate Specificity**
> "Quem é o usuário mais desesperado? Descreva uma pessoa real pelo nome, cargo, empresa e por que ela está sofrendo agora."

- Resposta fraca: "Gestores de marketing de empresas médias"
- Resposta forte: "Ana, Head of Growth na Fintech X, 32 anos, gasta 8h por semana em relatórios manuais porque a ferramenta atual custa R$15k/mês e o budget foi cortado"

**Q4 — Narrowest Wedge**
> "Qual é o menor subproblema que, se resolvido, prova o modelo inteiro?"

- Resposta fraca: "Automatizar todo o processo de relatórios"
- Resposta forte: "Só o passo de copiar CSV → Google Sheets, em 1 clique, para a Ana"

**Q5 — Observation**
> "Você já observou alguém fazer esse trabalho ao vivo? O que você viu que elas não descreveram?"

- Resposta fraca: "Fiz entrevistas"
- Resposta forte: "Sim — elas passam 40% do tempo formatando células, algo que nunca mencionaram nas entrevistas"

**Q6 — Future-Fit**
> "Se isso funcionar para 1.000 usuários, onde isso vai em 3 anos? O que impede alguém maior de construir isso?"

### Output

Ao final das 6 perguntas, o office-hours produz um **design doc** salvo no projeto com:
- Sumário do produto em 1 parágrafo
- Usuário desesperado identificado
- Status quo detalhado
- Wedge mínimo recomendado
- Riscos e moats identificados

```bash
> /office-hours
# Claude: "Você está explorando como startup ou como side project?"
# ... conduz as 6 perguntas uma a uma
# ... salva design doc ao final
```

---

## 2. Grupo de Reviews de Plano

### `/plan-ceo-review` — Visão Estratégica

**Quatro modos:**

| Modo | Quando usar | Comportamento |
|------|-------------|---------------|
| SCOPE EXPANSION | Plano muito tímido | Expande visão, pergunta "qual é o produto de 10 estrelas?" |
| SELECTIVE EXPANSION | Escopo certo, melhorar execução | Mantém scope, cherry-pick de ambições adicionais |
| HOLD SCOPE | Rigor máximo | Rejeita scope creep, corta tudo que não é core |
| SCOPE REDUCTION | Plano muito ambicioso | Strip ao mínimo viável com maior impacto |

```bash
> /plan-ceo-review
# Exemplo de output:
# 
# MODO: SCOPE EXPANSION
# 
# "Você está construindo um formulário quando poderia estar construindo
#  uma plataforma de workflows. Aqui está o que o produto de 10 estrelas parece..."
#
# Recomendações:
# 1. Adicionar API pública (abre integrações)
# 2. Notificações proativas vs. só reativas
# 3. Dashboard de time, não só individual
```

### `/plan-eng-review` — Arquitetura

Trava o plano técnico antes de qualquer código. Produz diagrama e checklist.

```bash
> /plan-eng-review
# Output inclui:
#
# ARQUITETURA PROPOSTA:
# [User] → [Next.js API] → [Supabase RLS] → [PostgreSQL]
#                        ↗ [Redis cache]
#
# RISCOS IDENTIFICADOS:
# - N+1 queries no listing de itens (crítico)
# - Sem strategy de invalidação de cache (médio)
# - Auth middleware não cobre WebSocket endpoint (alto)
#
# CHECKLIST DE TESTES:
# [ ] Unit: validadores de schema
# [ ] Integration: fluxo auth completo
# [ ] E2E: happy path de checkout
```

### `/plan-design-review` — Design (plano)

Pontua cada dimensão de 0 a 10, explica o que seria um 10, atualiza o plano.

```bash
> /plan-design-review
# Output:
#
# Hierarquia visual: 6/10
# → Problema: CTA principal compete com 3 outros elementos de mesma weight
# → Para 10: um único CTA primário por tela, rest secondary
#
# Espaçamento: 4/10
# → Problema: não há escala definida (8px grid)
# → Para 10: definir escala 4/8/16/24/32/48px e aplicar consistentemente
#
# Tipografia: 7/10
# → Bom: apenas 2 famílias. Ruim: 6 tamanhos diferentes sem type scale
```

### `/autoplan` — Pipeline automático completo

Roda CEO + Design + Eng + DX reviews em sequência com auto-decisões. Surfaça apenas borderlines.

```bash
> /autoplan
# Executa em ordem: CEO → Design → Eng → DX
# Auto-decide todas as escolhas sem ambiguidade
# Gate final apresenta apenas: "Essas decisões precisam de sua preferência..."
# Produz plano revisado pronto para implementação
```

---

## 3. investigate — Debug sistemático

**Lei de ferro:** zero correções sem causa raiz identificada. 3-strike rule: se a hipótese não confirmar após 3 tentativas, escalar.

### 5 Fases

**Fase 1 — Coleta de Sintomas**
```
- Ler o error message e stack trace completo
- Verificar logs recentes (últimas 24h)
- Identificar quando começou (git log --since)
- Tentar reproduzir localmente
- Listar: o que mudou? (dependências, config, código)
```

**Fase 2 — Pattern Matching**

| Padrão | Sintomas típicos | Evidência buscada |
|--------|-----------------|-------------------|
| Race condition | Funciona 90% das vezes | Logs fora de ordem |
| Nil propagation | NullPointerException em local estranho | Trace de volta à origem |
| State corruption | Funciona fresh, falha após ação | localStorage, cache, sessão |
| Integration failure | Timeout / 502 / 503 | External service logs |
| Config drift | Só falha em prod / staging | Variáveis de ambiente diff |
| Stale cache | Dado correto no DB, errado na UI | Cache TTL / invalidação |

**Fase 3 — Hipóteses (ordenadas por probabilidade)**
```
HIPÓTESES:
1. [85%] Query sem índice na coluna user_id (evidência: EXPLAIN mostra Seq Scan)
2. [10%] Connection pool esgotado em pico (evidência: pending connections > pool_size)
3. [5%]  Timeout no gateway (evidência: 504 nos access logs, não nos app logs)

Testando hipótese #1 primeiro...
```

**Fase 4 — Implementação (diff mínimo)**
```
- Fix focado na causa raiz
- Zero refactor não relacionado
- Teste de regressão cobrindo o cenário exato
```

**Fase 5 — Relatório**
```
DEBUG REPORT
============
Causa raiz: Missing index on user_id in orders table
Evidência: EXPLAIN ANALYZE → Seq Scan 2.3s vs expected <10ms
Fix aplicado: CREATE INDEX idx_orders_user_id ON orders(user_id)
Teste adicionado: spec/models/order_spec.rb:34
Duração total: 23 minutos
```

### Cenário real de uso

```bash
> a API de checkout está retornando 500 aleatoriamente em produção

# /investigate automaticamente invocado
#
# Fase 1: lê os últimos 100 logs de erro
# Encontra: "PG::QueryCanceled: ERROR: canceling statement due to conflict with recovery"
#
# Fase 2: pattern → "integration failure" com read replica lag
#
# Fase 3: hipótese — hot standby feedback delay
#
# Fase 4: fix → conectar checkout diretamente ao primary
#
# Fix commitado: git commit -m "fix: route checkout to primary DB to avoid replication lag"
```

---

## 4. review — Code Review pré-merge

### Review Readiness Dashboard

Antes de analisar o diff, `/review` verifica:

```
REVIEW READINESS
================
Branch: feature/auth-refresh
Base: main
Tests: ✓ passing (127/127)
Lint: ✓ clean
Type check: ✓ no errors
Coverage: 84% → 86% (+2%)
```

### Detecção de Scope Drift

```
SCOPE DRIFT ANALYSIS
====================
Branch objetivo: "add JWT refresh token rotation"

CLEAN: src/auth/refresh.ts — diretamente relacionado
CLEAN: src/auth/middleware.ts — token validation atualizado
DRIFT DETECTED: src/components/UserProfile.tsx — refactor não relacionado
REQUIREMENTS MISSING: sem testes para o novo fluxo de expiração

Recomendação: extrair UserProfile para PR separado antes de mergear.
```

### Categorias de findings

```
CRITICAL (bloqueadores de merge):
- [auth/refresh.ts:34] Token não é invalidado no logout — possível session hijacking

HIGH (deve corrigir antes de merge):
- [auth/middleware.ts:67] Sem rate limiting no endpoint de refresh

MEDIUM (pode ser PR separado):
- [auth/types.ts:12] Tipo RefreshPayload duplica claims do AccessPayload

LOW (sugestão):
- [auth/refresh.ts:89] Comentário desatualizado
```

---

## 5. ship — Deploy workflow completo

### O que o `/ship` faz (automaticamente, sem perguntas)

```
Step 0: Detectar plataforma (GitHub PR / GitLab MR / git-native)
Step 1: Merge da base branch → sem conflitos? continua. Com conflitos? PARA e pede ajuda.
Step 2: Rodar testes → falhou? PARA e reporta.
Step 3: Revisar diff completo (scope drift check)
Step 4: MAJOR version bump? PARA e pede confirmação.
Step 5: Bump VERSION automaticamente (semver)
Step 6: Atualizar CHANGELOG com todos os commits desde o último tag
Step 7: git add + commit (conventional commits)
Step 8: git push
Step 9: Criar PR com template estruturado
Step 10: Reportar: URL do PR criado
```

**Única parada obrigatória:** MAJOR version bump (potencialmente breaking). Todo o resto é automático.

### `/land-and-deploy` — Merge e verificação

```bash
> /land-and-deploy
# 1. Aguarda CI ficar verde (polling com backoff)
# 2. Faz merge do PR
# 3. Aguarda deploy terminar (detecta via status page ou URL)
# 4. Verifica health endpoint em produção
# 5. Tira screenshot da URL de prod
# 6. Compara com baseline pré-deploy
# 7. Alerta se métricas degradarem
```

### `/setup-deploy` — Configurar uma vez

```bash
> /setup-deploy
# Pergunta: qual plataforma? → detecta automaticamente se possível
# Suportadas: Vercel, Fly.io, Render, Netlify, Heroku, GitHub Actions
# Pergunta: URL de prod? → salva em CLAUDE.md
# Pergunta: health check endpoint? → /healthz, /api/health, etc.
# Futuras execuções de /land-and-deploy usam essa config
```

---

## 6. qa / qa-only — QA com browser real

### 3 Tiers

| Tier | Bugs incluídos | Tempo típico | Quando usar |
|------|----------------|-------------|-------------|
| **Quick** | critical + high | 5–10 min | Antes de cada PR |
| **Standard** | + medium | 15–25 min | Antes de releases |
| **Exhaustive** | + cosmetic | 40–60 min | Auditorias mensais |

### Modo diff-aware

```bash
> /qa https://staging.meuapp.com
# Detecta automaticamente o diff do PR atual
# Foca os testes nas áreas modificadas
# "Diff tocou: auth flow, checkout, profile page
#  Pulando: dashboard, settings (não modificados)"
```

### Exemplo de relatório

```
QA REPORT — staging.meuapp.com
==============================
Tier: Standard | Duração: 18min | Score: 6.2/10 → 8.7/10

CRITICAL (0):

HIGH (2):
[H1] Botão "Comprar" desaparece no mobile < 375px
     Evidência: screenshot /tmp/qa-h1-375px.png
     Fix: CSS min-width no botão → commitado (abc1234)

[H2] Console error: "Cannot read properties of undefined (reading 'price')"
     Rota: /checkout quando carrinho vazio
     Fix: guard clause adicionado → commitado (def5678)

MEDIUM (1):
[M1] Loading state não mostrado ao salvar preferências
     Fix: spinner adicionado → commitado (ghi9012)

Score final: 8.7/10 (+2.5)
3 fixes commitados atomicamente.
```

---

## 7. health — Dashboard de qualidade

### Scoring

| Ferramenta | Peso | O que mede |
|------------|------|-----------|
| Type checker (tsc, mypy, etc.) | 25% | Erros de tipo |
| Linter (eslint, ruff, etc.) | 20% | Estilo e bugs comuns |
| Test runner | 30% | Cobertura e falhas |
| Dead code detector | 15% | Código não usado |
| Shell linter (shellcheck) | 10% | Scripts bash |

### Output

```
HEALTH REPORT — skill-advisor
==============================
Score atual: 8.3/10

Type check (25%):  9.5/10 — 2 warnings, 0 errors
Lint (20%):        8.0/10 — 14 warnings, 0 errors
Tests (30%):       8.5/10 — 127/127 passing, 84% coverage
Dead code (15%):   7.0/10 — 3 funções exportadas não usadas
Shell (10%):       9.0/10 — 1 warning em build.sh:12

Histórico:
  Semana passada: 7.1 → 8.3 (+1.2) ↑
  Tendência 30d:  6.5 → 8.3 (+1.8) ↑↑

Top problemas:
  1. Cobertura de testes em lib/graph-search.js: 61%
  2. Funções não usadas: parseWikilink, buildEdge, normalizeScore
```

---

## 8. cso — Chief Security Officer

### Dois modos

| Modo | Gate de confiança | Frequência recomendada | Foco |
|------|-------------------|----------------------|------|
| **daily** | 8/10 — só achados certos | A cada PR relevante | Zero ruído |
| **comprehensive** | 2/10 — varredura total | Mensal ou pré-release | Tudo |

### 14 Fases da varredura comprehensive

1. **Secrets archaeology** — scan de API keys, tokens, senhas em histórico git
2. **Dependency supply chain** — CVEs em dependências, typosquatting
3. **Authentication & Authorization** — JWT, sessões, RBAC, IDOR
4. **Input validation** — SQL injection, XSS, command injection, path traversal
5. **Cryptography** — algoritmos fracos, geração de entropy, armazenamento
6. **Error handling** — stack traces expostos, mensagens de erro ricas
7. **Logging & Monitoring** — dados sensíveis em logs, PII
8. **Configuration** — CORS, headers de segurança, variáveis de ambiente
9. **CI/CD pipeline** — secrets em Actions, permissões excessivas
10. **LLM/AI security** — prompt injection, jailbreak surfaces, data exfiltration
11. **OWASP Top 10** — varredura sistemática dos 10 mais críticos
12. **STRIDE threat modeling** — Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation
13. **Business logic** — fluxos de negócio com implicações de segurança
14. **Infrastructure** — exposição de portas, rate limiting, DDoS surface

### Exemplo de findings

```
CSO REPORT — comprehensive
===========================
Severity: CRITICAL (1), HIGH (3), MEDIUM (5), LOW (8)

CRITICAL:
[C1] API key exposta em git history
     Arquivo: config/old-prod.env (commitado em 3f9a2b1, 8 meses atrás)
     Ação imediata: revogar a key + git filter-repo para remover do histórico

HIGH:
[H1] SQL injection em src/lib/search.js:45
     Query: `SELECT * FROM items WHERE name = '${query}'`
     Fix: parametrizar com placeholders

[H2] JWT sem validação de expiração em middleware
     Tokens expirados são aceitos indefinidamente

[H3] CORS wildcard em produção: Access-Control-Allow-Origin: *
```

---

## 9. retro — Retrospectiva semanal

### Argumentos

```bash
/retro           # última semana (padrão)
/retro 24h       # último dia
/retro 14d       # últimas 2 semanas
/retro compare   # compara com período anterior
/retro global    # todos os repos configurados
```

### Output

```
RETRO — semana de 01/04 a 07/04/2026
=====================================
Commits: 47 | PRs merged: 8 | Bugs corrigidos: 12
LOC adicionadas: +4.823 | LOC removidas: -1.201 | Net: +3.622

TOP CONTRIBUTORS:
  fernandoxavier02: 31 commits — auth refactor, QA pipeline
  [outros em time...]

SHIPPADO:
  feat: JWT refresh token rotation (PR #34)
  feat: advisor semantic search v2 (PR #35)
  fix: graph-search BFS infinite loop (PR #36)
  chore: upgrade gstack v0.15→v0.16 (PR #37)

TENDÊNCIAS:
  ↑ Velocidade: 47 commits vs. 38 semana anterior (+24%)
  ↑ Qualidade: health score 7.1→8.3
  ↓ Atenção: coverage caiu de 86%→84% (2 features sem testes)

PADRÕES:
  - 80% dos bugs foram em lib/ (investigar cobertura)
  - PRs com "wip" no título levam 3x mais para mergear

ELOGIOS:
  fernandoxavier02: excellente trabalho no auth refactor — zero regressões

ÁREAS DE CRESCIMENTO:
  - Escrever testes junto com a feature, não depois
```

---

## 10. cso — Chief Security Officer (modos)

*(já detalhado acima)*

---

## 11. checkpoint — Salvar e retomar estado

```bash
> /checkpoint
# Output salvo:
#
# CHECKPOINT — 2026-04-08 14:32
# ==============================
# Branch: feature/semantic-search-v2
# Arquivos modificados: lib/semantic.js, lib/build-embeddings.js
# Últimas decisões:
#   - Escolhemos bag-of-words em vez de transformer em runtime (latência)
#   - Threshold de similaridade: 0.35 (testado com 50 prompts)
# Próximos passos:
#   1. Adicionar cache de embeddings por session
#   2. Benchmark antes/depois com /benchmark
#   3. Escrever testes para edge cases de tokens PT-BR
# Blockers: nenhum
```

```bash
> onde eu estava?
# /checkpoint carrega e apresenta o estado salvo acima
# "Você estava no feature/semantic-search-v2, faltam 3 passos..."
```

---

## 12. document-release — Docs pós-ship

```bash
> /document-release
# 1. Lê: README, ARCHITECTURE, CONTRIBUTING, CLAUDE.md, CHANGELOG
# 2. Lê: diff do que foi shippado
# 3. Atualiza cada arquivo:
#    - README: novas features na seção "What's New"
#    - CHANGELOG: polir voz, remover TODOs do formato draft
#    - CLAUDE.md: novos comandos, padrões descobertos
#    - ARCHITECTURE: mudanças no fluxo de dados
# 4. Commit: "docs: update documentation after v1.3.0 release"
```

---

## 13. Design Toolkit

### `/design-consultation` — Criar sistema de design

**5 fases:**

1. **Entender o produto** — perguntas sobre propósito, público, tom
2. **Pesquisar landscape** — competitors, referências visuais, trends
3. **Proposta de sistema** — paleta, tipografia, espaçamento, motion, ícones
4. **Preview interativo** — gera páginas HTML de fonte + cores para aprovação
5. **Salvar DESIGN.md** — fonte da verdade para toda implementação futura

```bash
> /design-consultation
# Claude: "Qual é o produto e quem são os usuários?"
# Claude: "Que referências visuais você admira?"
# Claude: "Tom: profissional/playful/minimalista?"
#
# Output — proposta:
# Paleta: #0F172A (primária), #3B82F6 (accent), #F8FAFC (background)
# Tipografia: Inter (corpo), Fraunces (display)
# Escala: 4/8/16/24/32/48/64px
# Motion: ease-out 200ms para micro-interações
#
# Gera preview em /tmp/design-preview.html
# Salva DESIGN.md no projeto
```

### `/design-shotgun` — Variantes visuais

```bash
> /design-shotgun
# Gera 3–5 abordagens diferentes para o mesmo componente
# Abre board de comparação visual (screenshot lado a lado)
#
# "Opções geradas:
#  A: Minimal — tons neutros, tipografia serif
#  B: Bold — cores vibrantes, sans-serif heavy
#  C: Glassmorphism — transparência, blur
#  D: Corporate — azul, branco, sem enfeites"
#
# Você: "Gostei da tipografia de A e as cores de B"
# Itera combinando os elementos preferidos
```

### `/design-html` — HTML/CSS de produção

Funciona com qualquer input:
- Output do `/design-shotgun`
- Plano do `/plan-ceo-review`
- Contexto do `/plan-design-review`
- Descrição direta em linguagem natural

```bash
> /design-html
# Produz HTML/CSS sem:
#   - Alturas fixas que quebram em mobile
#   - Text overflow hidden
#   - Absolute positioning com magic numbers
# Com:
#   - Texto que realmente reflui
#   - Responsivo até 320px
#   - ~30KB overhead, zero dependências externas
```

### `/design-review` — Audit visual em site ao vivo

```bash
> /design-review https://meuapp.com
# 1. Screenshot da homepage, principais flows
# 2. Identifica:
#    - AI slop (texto genérico, CTAs vazios, stock photos ruins)
#    - Inconsistências de espaçamento (padding 23px vs escala 8px)
#    - Hierarquia quebrada (3 elementos do mesmo peso visual)
#    - Interações lentas (transitions > 300ms, jank)
# 3. Para cada issue:
#    - Screenshot "antes"
#    - Fix no CSS
#    - Screenshot "depois"
#    - Commit atômico
# 4. Score: "Visual quality: 5.2/10 → 7.8/10"
```

---

## 14. devex-review — Audit de DX ao vivo

```bash
> /devex-review https://meuapp.com/docs
# Executa o getting started como developer novo:
# 1. Abre docs na página de início
# 2. Segue o tutorial passo a passo
# 3. Mede:
#    - TTHW (Time to Hello World): 11 minutos
#    - Número de cliques até o primeiro sucesso: 23
#    - Clareza das mensagens de erro: 4/10
#    - Friction points: "instalação de 3 dependências não documentadas"
#
# Se /plan-devex-review existir:
# "Plano previa TTHW de 3 min. Realidade: 11 min. Gaps:
#  - Passo 3 assume Node.js 18+ sem verificar
#  - Erro 'EACCES' sem solução na doc"
```

---

## 15. codex — Segunda opinião

```bash
> /codex review
# "200 IQ autistic developer second opinion"
# Review independente do diff atual — sem contexto da conversa
# Encontra problemas que o Claude "normalizou" por estar no contexto

> /codex challenge
# Tenta ativamente quebrar seu código
# Foca em: edge cases, security, concurrency, error handling

> /codex consult "por que usar connection pooling aqui?"
# Pergunta técnica com continuidade para follow-ups
# Mantém sessão Codex ativa para perguntas relacionadas
```

---

## 16. Browser: browse

### Setup

```bash
# Verifica disponibilidade (rode antes de qualquer comando $B)
B=""
[ -x "$PWD/.claude/skills/gstack/browse/dist/browse" ] && B="$PWD/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B=~/.claude/skills/gstack/browse/dist/browse
```

### Comandos essenciais

```bash
# Navegação e inspeção
$B goto https://app.com                    # navegar
$B snapshot -i                             # snapshot com @refs para elementos interativos
$B snapshot -D                             # diff do que mudou no snapshot
$B click @e3                               # clicar por @ref
$B fill @e4 "valor"                        # preencher campo
$B select @e5 "option"                     # selecionar dropdown

# Screenshots
$B screenshot /tmp/antes.png               # página inteira
$B screenshot @e3 /tmp/botao.png           # crop para elemento específico
$B responsive /tmp/layout                  # mobile/tablet/desktop lado a lado

# Debugging
$B console                                 # erros JavaScript
$B network                                 # requests que falharam
$B network --capture                       # captura response bodies de APIs

# Assertions para QA
$B is visible ".modal"
$B is enabled "#submit"
$B is text "#total" "R$ 199,90"

# Extração de dados (v0.16+)
$B data                                    # JSON-LD, Open Graph, meta tags
$B media --images                          # todas as imagens
$B download @e5 /tmp/arquivo.pdf           # download com cookies da sessão
```

### Performance

- **Primeiro comando:** ~3s (inicializa Chromium)
- **Comandos subsequentes:** ~100–200ms
- **Estado persiste:** cookies, tabs, login sessions entre chamadas
- **Auto-shutdown:** após 30min idle

---

## 17. Segurança: careful / guard / freeze

### `/careful` — Guardrails

Intercepta **antes de executar**:
- `rm -rf` qualquer coisa
- `DROP TABLE` ou `DELETE FROM` sem WHERE
- `git reset --hard` ou `git push --force`
- `kubectl delete`
- Qualquer override de arquivo sem backup

```bash
> /careful
# Modo ativo. Cada comando bash é verificado:
# "⚠️  Isso vai executar: rm -rf node_modules
#  Você confirma? [s/n]"
```

### `/freeze` e `/unfreeze`

```bash
> /freeze src/auth/
# Claude só pode editar arquivos dentro de src/auth/
# Tentativa fora: "❌ Bloqueado: src/components/Button.tsx não está em src/auth/"

> /unfreeze
# Remove a restrição
```

### `/guard` — Modo máximo

```bash
> /guard
# Claude: "Qual diretório devo focar?"
# Você: "src/payments/"
# Ativa: careful + freeze simultaneamente
# Nenhum comando destrutivo executa sem confirmação
# Zero edições fora de src/payments/
```

---

## Fluxos Combinados

### Feature nova — pipeline completo

```bash
# 1. Validar a ideia (não construa sem evidência de demanda)
> /office-hours

# 2. Planejar com todos os reviews
> /autoplan

# 3. Implementar (usando os guardrails se necessário)
> /careful

# 4. Qualidade antes de mergear
> /review
> /qa https://staging.meuapp.com

# 5. Ship
> /ship           # cria PR automaticamente
> /land-and-deploy  # merge + verificação em prod

# 6. Pós-deploy
> /canary https://meuapp.com   # vigiar por 30min
> /document-release            # atualizar docs
```

### Debug de produção

```bash
> /investigate
# → identifica causa raiz

> /careful
# → guardrails antes de mexer em prod

> /cso
# → verifica implicações de segurança do bug

> /review
# → code review do fix antes de mergear
```

### Auditoria completa do projeto

```bash
> /health          # score de qualidade (0–10)
> /cso             # auditoria de segurança
> /benchmark https://meuapp.com   # Core Web Vitals
> /design-review https://meuapp.com   # qualidade visual
> /retro           # o que foi shippado, tendências
```

### Criar novo sistema de design

```bash
> /office-hours         # entender produto e público
> /design-consultation  # propor sistema, criar DESIGN.md
> /design-shotgun       # explorar variantes
> /design-html          # converter mockup em HTML/CSS de produção
```

---

## Configuração Global

```bash
# Desativar sugestões proativas
~/.claude/skills/gstack/bin/gstack-config set proactive false

# Habilitar auto-upgrade silencioso
~/.claude/skills/gstack/bin/gstack-config set auto_upgrade true

# Telemetria
~/.claude/skills/gstack/bin/gstack-config set telemetry off        # desativar
~/.claude/skills/gstack/bin/gstack-config set telemetry anonymous  # anônimo
~/.claude/skills/gstack/bin/gstack-config set telemetry community  # completo

# Ver config atual
~/.claude/skills/gstack/bin/gstack-config get proactive
```

---

## Regras de Roteamento (CLAUDE.md)

Adicione ao `CLAUDE.md` para roteamento automático:

```markdown
## Skill routing

- Ideia nova, brainstorm → invoke office-hours
- Estratégia, escopo → invoke plan-ceo-review
- Arquitetura, design técnico → invoke plan-eng-review
- Bug, erro, comportamento quebrado → invoke investigate
- Ship, deploy, criar PR → invoke ship
- QA, testar o site → invoke qa
- Code review, verificar diff → invoke review
- Atualizar docs após ship → invoke document-release
- Retro semanal → invoke retro
- Sistema de design → invoke design-consultation
- Audit visual → invoke design-review
- Review de arquitetura → invoke plan-eng-review
- Salvar progresso, checkpoint → invoke checkpoint
- Quality check → invoke health
- Auditoria de segurança → invoke cso
```

---

## Referências

- [Repositório GitHub](https://github.com/garrytan/gstack)
- [CHANGELOG](https://github.com/garrytan/gstack/blob/main/CHANGELOG.md)
- [BROWSER.md](https://github.com/garrytan/gstack/blob/main/BROWSER.md) — documentação completa do browser
- [ARCHITECTURE.md](https://github.com/garrytan/gstack/blob/main/ARCHITECTURE.md)
- [ETHOS.md](https://github.com/garrytan/gstack/blob/main/ETHOS.md) — "Boil the Lake" principle
- [Boil the Lake essay](https://garryslist.org/posts/boil-the-ocean) — filosofia por trás do gstack
