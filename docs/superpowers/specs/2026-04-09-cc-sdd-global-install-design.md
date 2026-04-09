# Design: Instalação Global do cc-sdd no Claude Code

**Data:** 2026-04-09  
**Status:** Aprovado  
**Abordagem escolhida:** A — npx do home directory com dry-run primeiro

---

## Contexto

O plugin [cc-sdd](https://github.com/gotalab/cc-sdd) implementa Spec-Driven Development ao estilo Kiro IDE para Claude Code. O usuário quer instalá-lo globalmente em `~/.claude/` sem duplicar artefatos já existentes de outros plugins (CEK sdd, superpowers, pipeline-orchestrator).

---

## Artefatos instalados

| Artefato | Destino | Ação |
|----------|---------|------|
| 12 comandos `/kiro:*` | `~/.claude/commands/kiro/` | Instalar |
| 9 agentes kiro | `~/.claude/agents/kiro/` | Instalar |
| Settings/templates | `~/.kiro/settings/templates/` | Instalar (subpasta nova, não sobrescreve specs) |
| `~/CLAUDE.md` | `~/CLAUDE.md` | Deletar após install |

**Modo:** `--claude-agent` (12 commands + 9 subagents)  
**Linguagem:** `--lang pt`

---

## Sequência de execução

1. **dry-run** — inspecionar plano antes de qualquer escrita
   ```bash
   cd ~ && npx cc-sdd@latest --claude-agent --lang pt --dry-run
   ```
2. **verificar** — confirmar que `~/.kiro/settings/` só cria `templates/` (não toca specs existentes: `cek-fix-batch1`, `sync-cek`)
3. **instalar**
   ```bash
   cd ~ && npx cc-sdd@latest --claude-agent --lang pt
   ```
4. **limpar** — deletar `~/CLAUDE.md` gerado (é apenas quickstart, não é config)
5. **verificar resultado**
   ```bash
   ls ~/.claude/commands/kiro/
   ls ~/.claude/agents/kiro/
   ```

---

## Análise de duplicatas

### Sem colisão de arquivos
- Comandos `/kiro:*` — namespace exclusivo, não existe hoje
- Agentes em `~/.claude/agents/kiro/` — subpasta isolada, não conflita com agentes existentes

### Sobreposição funcional (coexistência intencional)
| cc-sdd | CEK sdd | Convencão de uso |
|--------|---------|-----------------|
| `/kiro:spec-*` | `sdd:plan`, `sdd:implement` | cc-sdd para specs novas do zero; CEK sdd para tasks dentro de pipeline ativo |
| Agentes kiro (spec-requirements, spec-design...) | business-analyst, software-architect... | Workflows distintos, sem conflito |

### Agentes existentes que NÃO são substituídos
`spec-implementer`, `spec-validator`, `spec-post-impl-validator` — validação pós-spec, propósito diferente dos agentes kiro.

---

## Critérios de sucesso

- `~/.claude/commands/kiro/` contém 12 arquivos `.md`
- `~/.claude/agents/kiro/` contém 9 arquivos `.md`
- `~/.kiro/settings/templates/` existe e contém templates de spec
- `~/CLAUDE.md` não existe (deletado)
- Specs existentes em `~/.kiro/specs/` intactas (`cek-fix-batch1`, `sync-cek`)
- Nenhum arquivo existente em `~/.claude/commands/` ou `~/.claude/agents/` foi sobrescrito
