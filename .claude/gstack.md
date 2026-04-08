# gstack — Guia de Uso

Plugin criado por **Garry Tan** (Presidente & CEO da Y Combinator). Uma fábrica de software open source que transforma o Claude Code em um time virtual de engenharia com 30+ skills especializadas — CEO, eng manager, designer, QA lead, security officer e release engineer, tudo via slash commands.

> "600.000+ linhas de código de produção em 60 dias, part-time, enquanto rodava a YC em tempo integral."

**Repositório:** `https://github.com/garrytan/gstack`
**Licença:** MIT

---

## Instalação

### Instalação global (30 segundos)

No Claude Code, cole e execute:

```
Install gstack: run git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```

**Requisitos:** Claude Code, Git, Bun v1.0+, Node.js (Windows)

### Modo Team (recomendado para times)

```bash
cd ~/.claude/skills/gstack && ./setup --team

# Bootstrap no repositório do time
cd <seu-repo>
~/.claude/skills/gstack/bin/gstack-team-init required
git add .claude/ CLAUDE.md && git commit -m "require gstack for AI-assisted work"
```

Auto-update silencioso a cada sessão, throttled a 1x/hora. Zero vendor lock-in.

---

## Visão Geral das Skills

| Skill | Categoria | Quando usar |
|-------|-----------|-------------|
| `/office-hours` | Produto | Ideia nova, brainstorm, "vale a pena construir isso?" |
| `/plan-ceo-review` | Produto | Revisar escopo, ambição e estratégia do plano |
| `/plan-eng-review` | Arquitetura | Revisar arquitetura antes de codar |
| `/plan-design-review` | Design | Revisar plano com UI/UX antes de implementar |
| `/plan-devex-review` | DX | Revisar DX de APIs, CLIs, SDKs antes de implementar |
| `/autoplan` | Produto | Rodar todos os reviews em sequência automaticamente |
| `/investigate` | Debug | Bug, erro, "por que isso parou de funcionar?" |
| `/review` | Qualidade | Code review antes de fazer merge |
| `/ship` | Deploy | Criar PR, commit, bump version, push |
| `/land-and-deploy` | Deploy | Merge PR, aguardar CI, verificar produção |
| `/qa` | Qualidade | QA completo do app com correção de bugs |
| `/qa-only` | Qualidade | QA report apenas, sem correções |
| `/canary` | Monitoramento | Monitorar deploy em produção |
| `/benchmark` | Performance | Medir Core Web Vitals, tempo de carga, regressões |
| `/health` | Qualidade | Dashboard de qualidade do codebase (score 0–10) |
| `/cso` | Segurança | Auditoria de segurança OWASP + STRIDE |
| `/retro` | Processo | Retrospectiva semanal com métricas de commits |
| `/checkpoint` | Processo | Salvar/retomar estado de trabalho em progresso |
| `/document-release` | Docs | Atualizar docs após ship |
| `/design-consultation` | Design | Criar sistema de design e DESIGN.md do zero |
| `/design-shotgun` | Design | Gerar variantes visuais e comparar opções |
| `/design-html` | Design | Produzir HTML/CSS de produção a partir de mockup |
| `/design-review` | Design | Audit visual de site ao vivo (AI slop, espaçamento) |
| `/devex-review` | DX | Testar DX real no browser (TTHW, onboarding) |
| `/codex` | Revisão | Segunda opinião via OpenAI Codex CLI |
| `/learn` | Memória | Gerenciar aprendizados persistentes por projeto |
| `/careful` | Segurança | Guardrails para comandos destrutivos |
| `/guard` | Segurança | Modo máximo: careful + freeze combinados |
| `/freeze` | Segurança | Restringir edições a um diretório específico |
| `/unfreeze` | Segurança | Remover restrição de diretório |
| `/browse` | Browser | Chromium headless para QA e scraping |
| `/open-gstack-browser` | Browser | Abrir Chromium com extensão sidebar visível |
| `/pair-agent` | Browser | Compartilhar browser com outro agente remoto |
| `/setup-deploy` | Config | Configurar plataforma de deploy para /land-and-deploy |
| `/gstack-upgrade` | Meta | Atualizar gstack para a versão mais recente |

---

## 1. office-hours — YC Office Hours

**Objetivo:** expor a realidade de demanda de um produto com 6 perguntas de forcing. Dois modos: Startup (validação de produto) e Builder (brainstorm de side projects).

```bash
> tenho uma ideia para um app de notificações inteligentes
> /office-hours
# Claude conduz: demanda real, status quo, quem é o usuário desesperado,
# menor wedge possível, o que você observou, onde isso vai em 3 anos
# Salva um design doc no projeto
```

---

## 2. Grupo de Reviews de Plano

### `/plan-ceo-review` — Visão Estratégica

Quatro modos: SCOPE EXPANSION (sonhe grande), SELECTIVE EXPANSION (scope fixo + cherry-pick), HOLD SCOPE (rigor máximo), SCOPE REDUCTION (strip ao essencial).

```bash
> /plan-ceo-review
# Desafia premissas, pergunta "qual é o produto de 10 estrelas?",
# expande ou contrai escopo com raciocínio estratégico
```

### `/plan-eng-review` — Arquitetura

Trava o plano de execução: arquitetura, fluxo de dados, diagramas, edge cases, cobertura de testes, performance.

```bash
> /plan-eng-review
# Revisa interativamente, recomendações opinativas
# Produz diagrama de arquitetura e checklist de riscos
```

### `/plan-design-review` — Design (plano)

Avalia cada dimensão de design de 0 a 10, explica o que seria um 10, e atualiza o plano.

```bash
> /plan-design-review
# Pontua: hierarquia visual, espaçamento, tipografia, cores, motion
# Corrige o plano para chegar mais perto de 10/10 em cada dimensão
```

### `/plan-devex-review` — Developer Experience (plano)

Explora personas de developer, benchmarks contra concorrentes, momentos mágicos e pontos de fricção.

```bash
> /plan-devex-review
# Três modos: DX EXPANSION, DX POLISH, DX TRIAGE
# Mede TTHW (Time to Hello World) estimado
```

### `/autoplan` — Pipeline automático completo

Roda CEO + Design + Eng + DX reviews em sequência com auto-decisões. Surfaça apenas decisões de "gosto" no gate final.

```bash
> /autoplan
# Uma única skill, plano completamente revisado
# Apresenta somente as decisões de borderline para o usuário aprovar
```

---

## 3. investigate — Debug sistemático

**Objetivo:** quatro fases — investigar, analisar, hipotetizar, implementar. Lei de ferro: zero correções sem causa raiz identificada.

```bash
> /investigate
# Claude pergunta o que está quebrado
# Lê logs, stack traces, código relevante
# Gera hipóteses ordenadas por probabilidade
# Só implementa fix após confirmar causa raiz
```

```bash
# Trigger automático ao descrever bugs
> a API de pagamento está retornando 500 em produção
# Proactively invoca /investigate
```

---

## 4. review — Code Review pré-merge

**Objetivo:** análise do diff contra a branch base. Verifica SQL safety, LLM trust boundary violations, side effects condicionais e outros problemas estruturais.

```bash
> /review
# Analisa o diff completo
# Categoriza: critical, high, medium, low
# Produz relatório com evidências e sugestões de fix
```

---

## 5. ship / land-and-deploy — Deploy workflow

### `/ship` — Cria o PR

Detecta e faz merge da base branch, roda testes, revisa diff, bump VERSION, atualiza CHANGELOG, commit, push, cria PR.

```bash
> /ship
# Pergunta: "Qual é o tipo dessa mudança?" (feat/fix/chore)
# Commit com conventional commits, PR com template estruturado
```

### `/land-and-deploy` — Merge e verificação em prod

Faz merge do PR, aguarda CI e deploy, verifica saúde em produção via canary checks.

```bash
> /land-and-deploy
# Monitora CI até verde, faz merge, verifica URL de prod
# Alerta se métricas de saúde degradarem
```

### `/setup-deploy` — Configurar plataforma

Detecta sua plataforma (Vercel, Fly.io, Render, Netlify, Heroku, GitHub Actions) e salva config no CLAUDE.md.

```bash
> /setup-deploy
# Pergunta URL de prod, health check endpoint, comando de status
# Configura automaticamente para deploys futuros
```

---

## 6. qa / qa-only — QA com browser real

**Objetivo:** QA sistemático abrindo o Chromium real, testando fluxos, encontrando bugs e corrigindo no código.

Três tiers: **Quick** (critical + high), **Standard** (+ medium), **Exhaustive** (+ cosmetic).

```bash
> /qa https://meuapp.vercel.app
# Abre browser headless, navega pela app
# Registra: console errors, requests falhando, elementos quebrados
# Score antes vs depois, commit atômico por fix

> /qa-only https://meuapp.vercel.app
# Só o relatório, sem correções
```

---

## 7. canary — Monitoramento pós-deploy

**Objetivo:** vigilância contínua após deploy. Screenshots periódicos, comparação com baseline pré-deploy, alertas em anomalias.

```bash
> /canary https://meuapp.com
# Monitora: console errors, performance, falhas de página
# Notifica se algo degradar vs. baseline
```

---

## 8. benchmark — Performance

**Objetivo:** detectar regressões de performance. Baselines para LCP, FID, CLS, tempo de carga, tamanho de bundle.

```bash
> /benchmark https://meuapp.com
# Roda Lighthouse e Core Web Vitals
# Compara antes/depois em PRs
# Histórico de performance ao longo do tempo
```

---

## 9. health — Dashboard de qualidade

**Objetivo:** score composto 0–10 rodando type checker, linter, test runner, dead code detector e shell linter do projeto.

```bash
> /health
# Roda todas as ferramentas do projeto
# Score ponderado: ex. 8.3/10
# Histórico: "última semana: 7.1 → 8.3 (+1.2)"
```

---

## 10. cso — Chief Security Officer

**Objetivo:** auditoria de segurança completa. Dois modos: **daily** (gate de 8/10 confiança, zero ruído) e **comprehensive** (scan mensal profundo, bar de 2/10).

Cobre: secrets archaeology, dependency supply chain, CI/CD pipeline, LLM/AI security, OWASP Top 10, STRIDE threat modeling.

```bash
> /cso
# Modo daily: achados de alta confiança apenas
# Modo comprehensive: varredura total com verificação ativa

# Exemplos de findings:
# - API key hardcoded em config.js:34
# - Dependência com CVE crítico: lodash 4.17.15
# - SQL injection em query dinâmica sem parametrização
```

---

## 11. retro — Retrospectiva semanal

**Objetivo:** análise de commits, padrões de trabalho, métricas de qualidade. Suporte a times com breakdown por pessoa.

```bash
> /retro
# "Última semana: 140.751 linhas adicionadas, 362 commits, ~115k net LOC"
# Por pessoa: contribuições, elogios, áreas de crescimento
# Tendências: velocidade, qualidade, áreas problemáticas
```

---

## 12. checkpoint — Salvar e retomar estado

**Objetivo:** capturar git state, decisões tomadas e trabalho restante para retomar exatamente onde parou.

```bash
> /checkpoint
# Salva: branch atual, arquivos modificados, decisões pendentes
# "Próximos passos: 1) implementar validação, 2) escrever testes"

> onde eu estava?
# /checkpoint retoma e apresenta o estado salvo
```

---

## 13. document-release — Docs pós-ship

**Objetivo:** atualizar README, ARCHITECTURE, CONTRIBUTING, CLAUDE.md e CHANGELOG após merge. Polir voz do CHANGELOG, limpar TODOS.

```bash
> /document-release
# Lê todos os docs do projeto
# Cruza com o diff do que foi shippado
# Atualiza cada arquivo de documentação automaticamente
```

---

## 14. Design Toolkit

### `/design-consultation` — Criar sistema de design

Entende o produto, pesquisa o landscape, propõe sistema completo (estética, tipografia, cores, layout, motion). Cria `DESIGN.md` como fonte da verdade.

```bash
> /design-consultation
# Claude pergunta: produto, público-alvo, referências visuais
# Propõe: paleta, fontes, espaçamento, motion
# Gera preview pages de fonte + cores
# Salva em DESIGN.md
```

### `/design-shotgun` — Variantes visuais

Gera múltiplas variantes de design, abre comparison board, coleta feedback estruturado, itera.

```bash
> /design-shotgun
# Gera 3-5 abordagens diferentes para o mesmo componente
# Abre board de comparação visual
# "Gostei da tipografia da opção 2 e das cores da opção 4"
# Itera com o feedback
```

### `/design-html` — HTML/CSS de produção

Pega mockup aprovado e gera HTML/CSS production-quality. Texto reflui, alturas computadas, layouts dinâmicos. 30KB overhead, zero deps.

```bash
> /design-html
# Funciona com: output do /design-shotgun, plano do /plan-ceo-review,
#               contexto do /plan-design-review, ou descrição direta
# Texto realmente reflui — não é slop de AI com alturas fixas
```

### `/design-review` — Audit visual em site ao vivo

Encontra inconsistências visuais, problemas de espaçamento, hierarquia quebrada, AI slop e interações lentas. Corrige no código com commits atômicos.

```bash
> /design-review https://meuapp.com
# Tira screenshots, identifica issues visuais
# Corrige no código, tira screenshot depois, commit por fix
# Score de qualidade visual antes/depois
```

---

## 15. devex-review — Audit de DX ao vivo

**Objetivo:** testar a experiência real de developer no browser. Navega docs, tenta o getting started, mede TTHW (Time to Hello World).

```bash
> /devex-review https://meuapp.com/docs
# Executa o getting started como um developer novo
# Mede: TTHW, número de cliques, clareza dos erros
# Compara com scores do /plan-devex-review se existirem
# "Plano dizia 3 minutos, realidade: 8 minutos"
```

---

## 16. codex — Segunda opinião

**Objetivo:** wrapper do OpenAI Codex CLI. Três modos: **review** (code review independente), **challenge** (modo adversarial), **consult** (consulta com continuidade).

```bash
> /codex review
# Review independente do diff — "200 IQ autistic developer second opinion"

> /codex challenge
# Tenta quebrar seu código ativamente

> /codex consult "por que usar connection pooling aqui?"
# Pergunta técnica com continuidade de sessão para follow-ups
```

---

## 17. learn — Gerenciar aprendizados

**Objetivo:** revisar, buscar, podar e exportar o que o gstack aprendeu ao longo das sessões do projeto.

```bash
> /learn
# Mostra: "17 aprendizados registrados"
# Opções: revisar todos, buscar por tema, podar os obsoletos, exportar

> "não fixamos isso antes?"
# /learn busca automaticamente por padrões similares
```

---

## 18. Segurança: careful / guard / freeze / unfreeze

### `/careful` — Guardrails para destrutivos

Avisa antes de `rm -rf`, `DROP TABLE`, force-push, `git reset --hard`, `kubectl delete` e similares.

```bash
> /careful
# Modo seguro ativo
# Cada comando bash é verificado antes de executar
# "⚠️ Isso vai deletar o diretório node_modules. Confirmar?"
```

### `/freeze` — Restringir edições a um diretório

Bloqueia Edit e Write fora do path permitido. Ideal para debug sem "consertar" código não relacionado.

```bash
> /freeze src/auth/
# Claude só pode editar arquivos dentro de src/auth/
# Qualquer tentativa fora → bloqueado com aviso

> /unfreeze
# Remove a restrição
```

### `/guard` — Modo máximo (careful + freeze)

```bash
> /guard
# Pergunta qual diretório focar
# Ativa careful + freeze simultaneamente
```

---

## 19. Browser: browse / open-gstack-browser / pair-agent

### `/browse` — Chromium headless (power tool)

Chromium persistente controlado por IA. ~3s para iniciar, depois 100–200ms por comando. Estado persiste entre chamadas (cookies, tabs, sessões).

```bash
# Navegar e inspecionar
$B goto https://app.com
$B snapshot -i          # elementos interativos com @refs
$B click @e3
$B fill @e4 "valor"
$B snapshot -D          # diff do que mudou

# Screenshots e evidências
$B screenshot /tmp/antes.png
$B screenshot @e3 /tmp/botao.png    # crop para elemento

# QA assertions
$B is visible ".modal"
$B is enabled "#submit"
$B console                           # erros JS
$B network                           # requests falhando

# Scraping e extração (novo em v0.16)
$B data                              # JSON-LD, Open Graph, meta tags
$B media --images                    # todas as imagens da página
$B download @e5 /tmp/arquivo.pdf     # download com cookies da sessão
$B network --capture                 # captura response bodies de APIs

# Responsivo
$B responsive /tmp/layout            # screenshots mobile/tablet/desktop
```

### `/open-gstack-browser` — Browser visível

Abre Chromium com extensão sidebar. Você vê cada ação em tempo real. Sidebar com feed de atividade e chat.

```bash
> /open-gstack-browser
# Abre janela Chrome visível
# Anti-bot stealth built in
# Sidebar mostra o que o AI está fazendo
```

### `/pair-agent` — Compartilhar browser com outro agente

Conecta um agente remoto (OpenClaw, Hermes, Codex, Cursor) ao seu browser via HTTP.

```bash
> /pair-agent
# Gera setup key e instruções
# Agente remoto ganha acesso ao tab com escopo configurável
# read+write por padrão, admin opcional
```

---

## Fluxos Combinados

### Feature nova — pipeline completo

```bash
# 1. Validar a ideia
> /office-hours

# 2. Planejar com todos os reviews
> /autoplan
# (ou manualmente: /plan-ceo-review → /plan-eng-review → /plan-design-review)

# 3. Implementar

# 4. Revisar e testar
> /review
> /qa https://staging.meuapp.com

# 5. Ship
> /ship
> /land-and-deploy

# 6. Pós-deploy
> /canary https://meuapp.com
> /document-release
```

### Debug de produção

```bash
> /investigate
# Identifica causa raiz

> /careful
# Ativa guardrails antes de mexer em prod

> /cso
# Verifica se o bug tem implicações de segurança

> /review
# Antes de mergear o fix
```

### Auditoria completa do projeto

```bash
> /health
# Score de qualidade do codebase

> /cso
# Auditoria de segurança

> /benchmark https://meuapp.com
# Performance

> /design-review https://meuapp.com
# Qualidade visual

> /retro
# O que foi shippado, tendências
```

### Criar novo sistema de design

```bash
> /office-hours
# Entender o produto e público

> /design-consultation
# Propor sistema de design, criar DESIGN.md

> /design-shotgun
# Explorar variantes visuais

> /design-html
# Converter mockup aprovado em HTML/CSS de produção
```

---

## Configuração Global

```bash
# Ver config atual
~/.claude/skills/gstack/bin/gstack-config get proactive

# Desativar sugestões proativas (Claude só invoca se você digitar /skill)
~/.claude/skills/gstack/bin/gstack-config set proactive false

# Habilitar auto-upgrade
~/.claude/skills/gstack/bin/gstack-config set auto_upgrade true

# Telemetria (community / anonymous / off)
~/.claude/skills/gstack/bin/gstack-config set telemetry off
```

---

## Regras de roteamento (CLAUDE.md)

O gstack funciona melhor quando o CLAUDE.md do projeto tem regras de roteamento. Instale com:

```bash
> /gstack
# Na primeira execução: oferece adicionar routing rules ao CLAUDE.md
```

Ou manualmente, adicione ao `CLAUDE.md`:

```markdown
## Skill routing

- Ideia nova, brainstorm → invoke office-hours
- Bug, erro, comportamento quebrado → invoke investigate
- Ship, deploy, criar PR → invoke ship
- QA, testar o site → invoke qa
- Code review → invoke review
- Atualizar docs → invoke document-release
- Retro semanal → invoke retro
- Design system → invoke design-consultation
- Audit visual → invoke design-review
- Review de arquitetura → invoke plan-eng-review
- Salvar progresso → invoke checkpoint
- Quality check → invoke health
```

---

## Referências

- [Repositório GitHub](https://github.com/garrytan/gstack)
- [CHANGELOG](https://github.com/garrytan/gstack/blob/main/CHANGELOG.md)
- [BROWSER.md](https://github.com/garrytan/gstack/blob/main/BROWSER.md) — documentação completa do browser
- [ARCHITECTURE.md](https://github.com/garrytan/gstack/blob/main/ARCHITECTURE.md)
- [ETHOS.md](https://github.com/garrytan/gstack/blob/main/ETHOS.md)
