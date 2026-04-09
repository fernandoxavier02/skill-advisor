# cc-sdd Global Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instalar o plugin cc-sdd globalmente em `~/.claude/` no modo `--claude-agent --lang pt`, sem sobrescrever nenhum artefato existente.

**Architecture:** Rodar `npx cc-sdd@latest` a partir de `~` (home directory) para que os paths relativos resolvam para `~/.claude/commands/kiro/` e `~/.claude/agents/kiro/`. Dry-run primeiro para inspeção, install real depois, limpeza do `~/CLAUDE.md` gerado.

**Tech Stack:** Node.js / npx, bash, Claude Code global config (`~/.claude/`)

---

### Task 1: Snapshot de segurança — estado atual antes de instalar

**Arquivos verificados (leitura apenas, nada é modificado):**
- `~/.claude/commands/` — lista atual de comandos globais
- `~/.claude/agents/` — lista atual de agentes globais
- `~/.kiro/specs/` — specs existentes que não devem ser tocadas

- [ ] **Step 1: Capturar snapshot de comandos existentes**

```bash
ls ~/.claude/commands/ | sort > /tmp/commands-before.txt
cat /tmp/commands-before.txt
```

Esperado: lista dos arquivos `.md` atuais (ex: `commit-commands-commit.md`, `deploy.md`, etc.). Nenhum `kiro` deve aparecer.

- [ ] **Step 2: Capturar snapshot de agentes existentes**

```bash
ls ~/.claude/agents/ | sort > /tmp/agents-before.txt
cat /tmp/agents-before.txt
```

Esperado: lista atual (ex: `adversarial-reviewer.md`, `figma-*`, `spec-implementer.md`, etc.). Nenhum `kiro` deve aparecer.

- [ ] **Step 3: Verificar specs existentes no .kiro**

```bash
ls ~/.kiro/specs/
ls ~/.kiro/settings/ 2>/dev/null || echo "settings/ nao existe ainda"
```

Esperado: `cek-fix-batch1` e `sync-cek` presentes. `settings/` pode ou não existir.

---

### Task 2: Dry-run — inspecionar plano de instalação

**Objetivo:** Ver exatamente o que o cc-sdd vai criar/modificar antes de executar de verdade.

- [ ] **Step 1: Rodar dry-run a partir do home directory**

```bash
cd ~ && npx cc-sdd@latest --claude-agent --lang pt --dry-run
```

Esperado: output listando todos os arquivos que seriam criados:
```
[dry-run] Would create: .claude/commands/kiro/spec-init.md
[dry-run] Would create: .claude/commands/kiro/spec-requirements.md
[dry-run] Would create: .claude/agents/kiro/spec-design.md
... (12 commands + 9 agents + settings)
[dry-run] Would create: CLAUDE.md
```

- [ ] **Step 2: Verificar que nenhum arquivo existente seria sobrescrito**

No output do dry-run, confirmar que:
- Não aparece nenhum arquivo fora de `.claude/commands/kiro/`, `.claude/agents/kiro/`, `.kiro/settings/` e `CLAUDE.md`
- Nenhum arquivo existente em `.claude/commands/` (raiz) ou `.claude/agents/` (raiz) aparece como destino

Se aparecer qualquer caminho inesperado → **PARAR** e reportar antes de continuar.

---

### Task 3: Instalação real

**Pré-condição:** Task 2 concluída sem surpresas no dry-run.

- [ ] **Step 1: Rodar instalação a partir do home directory**

```bash
cd ~ && npx cc-sdd@latest --claude-agent --lang pt
```

Esperado: output confirmando criação dos arquivos, sem erros.

- [ ] **Step 2: Confirmar criação dos comandos**

```bash
ls ~/.claude/commands/kiro/ | sort
```

Esperado (12 arquivos):
```
spec-design.md
spec-impl.md
spec-init.md
spec-quick.md
spec-requirements.md
spec-status.md
spec-tasks.md
steering-custom.md
steering.md
validate-design.md
validate-gap.md
validate-impl.md
```

- [ ] **Step 3: Confirmar criação dos agentes**

```bash
ls ~/.claude/agents/kiro/ | sort
```

Esperado (9 arquivos):
```
spec-design.md
spec-impl.md
spec-requirements.md
spec-tasks.md
steering-custom.md
steering.md
validate-design.md
validate-gap.md
validate-impl.md
```

- [ ] **Step 4: Confirmar settings criados**

```bash
ls ~/.kiro/settings/
ls ~/.kiro/settings/templates/ 2>/dev/null || echo "templates/ nao encontrado"
```

Esperado: `templates/` presente com arquivos de template de spec.

---

### Task 4: Limpeza pós-instalação

- [ ] **Step 1: Deletar ~/CLAUDE.md gerado pelo cc-sdd**

```bash
ls ~/CLAUDE.md 2>/dev/null && echo "existe - deletar" || echo "nao existe - ok"
```

Se existir:
```bash
rm ~/CLAUDE.md
```

Nota: esse arquivo é apenas um quickstart guide do cc-sdd. O arquivo de configuração global real é `~/.claude/CLAUDE.md` (path diferente) e não é afetado.

---

### Task 5: Verificação final de integridade

- [ ] **Step 1: Confirmar que specs existentes não foram tocadas**

```bash
ls ~/.kiro/specs/
```

Esperado: apenas `cek-fix-batch1` e `sync-cek`. Se aparecer qualquer pasta nova de spec → investigar.

- [ ] **Step 2: Confirmar que comandos raiz não foram alterados**

```bash
ls ~/.claude/commands/ | sort > /tmp/commands-after.txt
diff /tmp/commands-before.txt /tmp/commands-after.txt
```

Esperado: `diff` sem output (nenhuma mudança na raiz de commands). A pasta `kiro/` em si não aparece no diff porque é subdiretório.

- [ ] **Step 3: Confirmar que agentes raiz não foram alterados**

```bash
ls ~/.claude/agents/ | sort > /tmp/agents-after.txt
diff /tmp/agents-before.txt /tmp/agents-after.txt
```

Esperado: diff vazio — nenhum agente na raiz foi adicionado ou removido.

- [ ] **Step 4: Smoke test de um comando**

Abrir Claude Code e rodar:
```
/kiro:steering
```

Esperado: Claude Code reconhece o comando e inicia o fluxo de criação de steering docs.

- [ ] **Step 5: Commit do spec e plano no repositório skill-advisor**

```bash
cd ~/Projetos/skill-advisor
git add docs/superpowers/specs/2026-04-09-cc-sdd-global-install-design.md
git add docs/superpowers/plans/2026-04-09-cc-sdd-global-install.md
git commit -m "docs: add cc-sdd global install spec and plan"
```
