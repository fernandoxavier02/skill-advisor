# Context Engineering Kit — Guia de Uso

Plugin desenvolvido por **NeoLabHQ (Vlad Goncharov)**. Coleção de 13 sub-plugins que aplicam técnicas avançadas de engenharia de contexto para melhorar a qualidade de resultados do Claude Code, com base em papers de pesquisa e metodologias de manufatura/software comprovadas.

---

## Instalação

Cada sub-plugin é instalado separadamente via `/plugin`:

```bash
/plugin marketplace add NeoLabHQ/context-engineering-kit
# depois, em /plugin, habilite os sub-plugins desejados

# Ou instale um sub-plugin específico:
/plugin install reflexion@NeoLabHQ/context-engineering-kit
/plugin install customaize-agent@NeoLabHQ/context-engineering-kit
/plugin install tdd@NeoLabHQ/context-engineering-kit
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

**Objetivo:** reduzir alucinações e melhorar qualidade de output com loops de feedback. Comprovado: +8–21% de qualidade vs. resposta sem reflexão.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `/reflexion:reflect` | Analisa o output anterior, identifica problemas e refina |
| `/reflexion:critique` | Crítica multi-perspectiva por agentes especializados |
| `/reflexion:memorize` | Extrai aprendizados e salva no `CLAUDE.md` do projeto |

### Exemplos

```bash
# Fluxo básico
> implementar autenticação JWT
> /reflexion:reflect
# Claude analisa o que fez, aponta melhorias e corrige problemas óbvios

> corrigir os problemas encontrados
> /reflexion:memorize
# Salva no CLAUDE.md: "ao implementar JWT, sempre validar expiração no middleware"
```

```bash
# Trigger automático via palavra "reflect" no prompt
> implementar rate limiting e reflect
# O hook detecta "reflect" e roda /reflexion:reflect automaticamente no final

# ATENÇÃO: somente a palavra exata "reflect" em inglês ativa o hook.
# "reflection", "reflecting", "reflects" NÃO ativam.
```

```bash
# Crítica multi-perspectiva após uma decisão de arquitetura
> /reflexion:critique
# Agentes avaliam: segurança, performance, manutenibilidade, testabilidade
```

---

## 2. Customaize Agent — Criar Extensões do Claude Code

**Objetivo:** toolkit completo para criar commands, skills, hooks e agentes seguindo as boas práticas da Anthropic, com TDD aplicado a prompts.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `/customaize-agent:create-agent` | Cria um agente com system prompt e triggers |
| `/customaize-agent:create-command` | Cria um slash command com estrutura adequada |
| `/customaize-agent:create-workflow-command` | Command multi-step que despacha sub-agentes |
| `/customaize-agent:create-skill` | Cria skill via TDD de prompts |
| `/customaize-agent:create-hook` | Analisa projeto e sugere/cria hooks relevantes |
| `/customaize-agent:test-prompt` | Testa prompt com ciclo RED-GREEN-REFACTOR |
| `/customaize-agent:test-skill` | Valida que uma skill resiste à racionalização |
| `/customaize-agent:apply-anthropic-skill-best-practices` | Revisa skill contra boas práticas oficiais |

### Skills incluídas

- `customaize-agent:prompt-engineering` — few-shot, chain-of-thought, templates
- `customaize-agent:context-engineering` — mecânicas de janela de contexto, degradação, otimização
- `customaize-agent:agent-evaluation` — rubrics LLM-as-Judge, métricas, bias de avaliação

### Exemplos

```bash
# Criar um agente de revisão de segurança
> /customaize-agent:create-agent security-reviewer "Revisa código para vulnerabilidades OWASP"

# Testar se um prompt está funcionando como esperado
> /customaize-agent:test-prompt
# Executa cenários de teste como sub-agente isolado
# Se falhar (RED) → sugere melhorias → testa novamente (GREEN) → refatora (REFACTOR)

# Criar skill via TDD
> /customaize-agent:create-skill image-optimizer
# Define cenários de sucesso/falha primeiro → implementa → valida

# Verificar boas práticas em uma skill existente
> /customaize-agent:apply-anthropic-skill-best-practices
```

---

## 3. Code Review — Revisão com Agentes Especializados

**Objetivo:** revisão de código e PRs por múltiplos agentes especializados em paralelo.

### Comandos / Skills

| Item | O que faz |
|------|-----------|
| `/code-review:review-local-changes` | Revisa mudanças locais não commitadas |
| `/code-review:review-pr` | Revisa um Pull Request completo |

### Agentes acionados automaticamente

- `bug-hunter` — bugs e erros lógicos
- `code-quality-reviewer` — SOLID, DRY, KISS
- `contracts-reviewer` — interfaces, tipos, APIs públicas
- `historical-context-reviewer` — consistência com decisões passadas
- `security-auditor` — vulnerabilidades OWASP
- `test-coverage-reviewer` — gaps de cobertura

### Exemplos

```bash
# Antes de fazer commit
> /code-review:review-local-changes

# Revisar um PR do GitHub
> /code-review:review-pr 42
# Cada agente analisa em paralelo e consolida os findings
```

---

## 4. Kaizen — Análise de Causa Raiz

**Objetivo:** encontrar a causa raiz de problemas em vez de tratar sintomas. Baseado no Toyota Production System.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `/kaizen:why` | 5 Porquês — drilla do sintoma à causa raiz |
| `/kaizen:root-cause-tracing` | Traceia bug pelo call stack até a origem |
| `/kaizen:cause-and-effect` | Diagrama Ishikawa — explora 6 categorias de causas |
| `/kaizen:analyse-problem` | Análise A3 — documento one-page com background, meta, contramedidas |
| `/kaizen:analyse` | Seleciona automaticamente a técnica mais adequada |
| `/kaizen:plan-do-check-act` | Ciclo PDCA para melhoria iterativa |

### Exemplos

```bash
# Bug em produção
> /kaizen:why "API retorna 500 no checkout"
# Por quê? → DB timeout. Por quê? → Query sem índice. Por quê? → Migração incompleta...

# Rastrear de onde vem um dado inválido
> /kaizen:root-cause-tracing

# Análise completa de problema crônico
> /kaizen:analyse-problem "Connection pool exhaustion em pico de tráfego"
# Produz documento A3: situação atual, meta, causa raiz, plano de ação, follow-up
```

---

## 5. TDD — Test-Driven Development

**Objetivo:** garantir que todo código de produção é validado por testes escritos antes da implementação.

### Comandos / Skills

| Item | O que faz |
|------|-----------|
| `/tdd:write-tests` | Cria testes para mudanças já feitas sem cobertura |
| `/tdd:fix-tests` | Corrige testes falhando após mudanças de lógica |
| Skill `tdd:test-driven-development` | Guia TDD e detector de anti-patterns |

### Exemplos

```bash
# TDD desde o início
> use TDD para implementar validação de email no cadastro
# Claude: 1) escreve teste que falha, 2) implementa o mínimo para passar, 3) refatora

# Já implementou sem testes?
> /tdd:write-tests
# Agentes analisam o diff e escrevem testes para cada branch/caso

# Testes quebrando após refactor?
> /tdd:fix-tests
```

---

## 6. SADD — Subagent-Driven Development

**Objetivo:** executar tarefas complexas via sub-agentes frescos com quality gates entre etapas. Resolve "context pollution" em sessões longas.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `/sadd:do-and-judge` | Executa + judge independente + retry automático até passar |
| `/sadd:do-in-parallel` | Executa tarefas independentes em paralelo |
| `/sadd:do-in-steps` | Executa tarefas dependentes sequencialmente com verificação |
| `/sadd:do-competitively` | Gera múltiplas soluções, compara com judges, sintetiza a melhor |
| `/sadd:tree-of-thoughts` | Explora múltiplos caminhos de raciocínio, poda os ruins |
| `/sadd:judge-with-debate` | Judges debatem entre si até consensus |
| `/sadd:judge` | Avalia trabalho já feito com rubric estruturado |
| `/sadd:launch-sub-agent` | Dispara sub-agente focado em uma tarefa específica |

### Exemplos

```bash
# Tarefa de alto risco — múltiplas soluções competindo
> /sadd:do-competitively "Projetar middleware de autenticação com JWT"
# 3 sub-agentes implementam abordagens diferentes
# Judges avaliam, meta-judge sintetiza a melhor combinação

# 5 tarefas independentes ao mesmo tempo
> /sadd:do-in-parallel
# Sub-agentes rodam com contexto limpo, sem interferência entre si

# Plano sequencial com gates de qualidade
> /sadd:do-in-steps
# Cada passo: implementa → judge verifica → só avança se aprovado
```

---

## 7. SDD — Spec-Driven Development

**Objetivo:** transformar prompts em código funcional de produção via especificação iterativa.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `/sdd:add-task` | Cria arquivo de spec em `.specs/tasks/draft/` |
| `/sdd:plan` | Refina spec, analisa impacto no codebase, move para `todo/` |
| `/sdd:implement` | Implementa e move para `done/` |
| `/sdd:brainstorm` | Gera ideias para a tarefa |

### Ciclo de vida

```
draft/ → todo/ → in-progress/ → done/
```

### Exemplos

```bash
# 1. Criar spec inicial
> /sdd:add-task "Implementar notificações push com WebSocket"
# Cria: .specs/tasks/draft/implementar-notificacoes-push.feature.md

# 2. Refinar (analisa arquivos afetados, padrões a seguir)
> /sdd:plan
# Move para: .specs/tasks/todo/implementar-notificacoes-push.feature.md

# 3. Limpar contexto
> /clear

# 4. Implementar
> /sdd:implement @.specs/tasks/todo/implementar-notificacoes-push.feature.md

# 5. Ship
> /git:commit
> /git:create-pr
```

---

## 8. Git — Workflows Git Padronizados

**Objetivo:** commits com conventional commits + emoji, PRs estruturados, issue analysis, worktrees.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `/git:commit` | Commit com mensagem no formato conventional commits + emoji |
| `/git:create-pr` | PR com template e descrição estruturada |
| `/git:analyze-issue` | Analisa issue do GitHub e cria spec técnica |
| `/git:load-issues` | Baixa todas as issues abertas como arquivos markdown |
| `/git:attach-review-to-pr` | Adiciona comentários de review linha a linha |
| `/git:create-worktree` | Cria worktree para desenvolvimento paralelo |
| `/git:compare-worktrees` | Compara dois worktrees |
| `/git:merge-worktree` | Merge seletivo de worktree para branch atual |

### Exemplos

```bash
# Commit padronizado
> /git:commit
# Sugere: "✨ feat(auth): add JWT refresh token rotation"

# PR com template
> /git:create-pr
# Gera: título, summary, test plan, breaking changes

# Analisar issue antes de começar
> /git:analyze-issue 147
# Lê a issue, pesquisa no codebase, produz spec técnica

# Desenvolvimento paralelo
> /git:create-worktree feature/payment-v2
# Cria worktree em pasta separada, instala dependências automaticamente
```

---

## 9. Docs — Documentação

**Objetivo:** atualizar e refinar documentação com precisão e concisão.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `/docs:update-docs` | Atualiza docs existente após mudanças no código |
| `/docs:write-concisely` | Reescreve documentação eliminando verbosidade |

### Exemplos

```bash
# Após implementar feature, atualizar os docs
> /docs:update-docs
# Detecta o que mudou e atualiza README, JSDoc, OpenAPI, etc.

# README muito longo?
> /docs:write-concisely README.md
```

---

## 10. FPF — First Principles Framework

**Objetivo:** raciocínio transparente e auditável via ciclo Abdução-Dedução-Indução. O AI gera opções; o humano decide.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `/fpf:propose-hypotheses` | Gera hipóteses concorrentes antes de decidir |
| `/fpf:query` | Consulta knowledge base de decisões anteriores |
| `/fpf:actualize` | Atualiza contexto com nova evidência |
| `/fpf:decay` | Marca hipóteses obsoletas |
| `/fpf:reset` | Reinicia o ciclo |
| `/fpf:status` | Mostra estado atual do framework |

### Exemplos

```bash
# Decisão de arquitetura: qual banco usar para sessões?
> /fpf:propose-hypotheses "armazenamento de sessões de usuário"
# Gera: Redis, DynamoDB, PostgreSQL sessions, JWT stateless
# Para cada: premissas, lógica, evidências necessárias, confiança (L0/L1/L2)

# Nova evidência muda o cenário
> /fpf:actualize "Redis não está disponível no tier do cliente"
# Recalcula scores e marca Redis como inviável

# Verificar decisões passadas
> /fpf:query "autenticação"
```

---

## 11. DDD — Domain-Driven Development

**Objetivo:** incorporar Clean Architecture, SOLID e DDD no workflow via 14 rules automáticas.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `/ddd:setup-code-formating` | Adiciona padrões de formatação ao `CLAUDE.md` |

### Rules automáticas (14 ao total)

| Categoria | Rules |
|-----------|-------|
| Arquitetura | Clean Architecture & DDD, Separation of Concerns, Functional Core/Imperative Shell |
| Design de Funções | Command-Query Separation, Principle of Least Astonishment, Call-Site Honesty |
| Explicitude | Explicit Control Flow, Explicit Data Flow, Explicit Side Effects |
| Qualidade | Error Handling, Domain-Specific Naming, Library-First, Early Return, Size Limits |

### Exemplos

```bash
# Configurar formatação no projeto
> /ddd:setup-code-formating
# Atualiza CLAUDE.md com: naming conventions, size limits, style rules

# Invocar explicitamente durante implementação
> use DDD rules para implementar autenticação
# Claude aplica: bounded contexts, ubiquitous language, dependency inversion
```

---

## 12. MCP — Setup de MCP Servers

**Objetivo:** configurar integrações MCP conhecidas e atualizar o `CLAUDE.md` com os requisitos.

### Exemplos

```bash
> /mcp:setup-context7-mcp
> /mcp:setup-serena-mcp
> /mcp:build-mcp "servidor MCP para nossa API interna"
```

---

## 13. Tech Stack — Boas Práticas por Linguagem

**Objetivo:** atualizar `CLAUDE.md` com boas práticas específicas para a stack do projeto.

### Exemplos

```bash
> /tech-stack:add-typescript-best-practices
# Atualiza CLAUDE.md: strict mode, type-only imports, naming conventions, padrões de erro
```

---

## Fluxos Combinados

### Feature nova com qualidade máxima

```bash
> /sdd:add-task "Implementar X"
> /sdd:plan
> /clear
> /sdd:implement @.specs/tasks/todo/x.feature.md
> /code-review:review-local-changes
> /reflexion:reflect
> /reflexion:memorize
> /tdd:write-tests
> /git:commit
> /git:create-pr
```

### Debug de problema difícil

```bash
> /kaizen:why "descrição do problema"
> /fpf:propose-hypotheses "hipóteses para o problema"
> /kaizen:root-cause-tracing
```

### Criar extensão do Claude Code

```bash
> /customaize-agent:create-skill minha-skill
> /customaize-agent:test-skill
> /customaize-agent:apply-anthropic-skill-best-practices
```

---

## Referências

- [Self-Refine paper](https://arxiv.org/abs/2303.17651) — base do Reflexion
- [Reflexion paper](https://arxiv.org/abs/2303.11366) — memory updates após reflexão (+10.6%)
- [Agentic Context Engineering](https://arxiv.org/abs/2510.04618) — fundamento do context-engineering skill
- [LLM-as-a-Judge](https://arxiv.org/abs/2306.05685) — base do SADD judge
- [Prompting Science Report 3](https://arxiv.org/abs/2508.00614) — persuasion principles (33% → 72% compliance)
- [Tree of Thoughts](https://arxiv.org/abs/2305.10601)
- [First Principles Framework](https://github.com/ailev/FPF)
- [Documentação oficial do kit](https://cek.neolab.finance)
