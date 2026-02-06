
# Renomeacao de Entidades: Protocolo → Processos | Processos → Casos

## Objetivo

Renomear as entidades no sistema:
1. **Protocolo** → **Processos** (o que antes era chamado de protocolo)
2. **Processos** (processos_oab) → **Casos** (os processos judiciais)

---

## Escopo da Mudanca

Esta e uma mudanca de **labels/UI apenas** - nao afeta nomes de tabelas no banco de dados, hooks ou nomes de componentes internos. Alteraremos apenas os textos exibidos ao usuario.

---

## Mapeamento de Termos

| Termo Atual | Novo Termo |
|-------------|------------|
| Protocolo | Processo |
| Protocolos | Processos |
| Novo protocolo | Novo processo |
| Nenhum protocolo | Nenhum processo |
| Buscar protocolos | Buscar processos |
| Processos (aba de processos_oab) | Casos |
| Processo Vinculado | Caso Vinculado |
| processo (referente a processos_oab) | caso |

---

## Arquivos a Modificar

### 1. Aba de Navegacao Principal (ProjectView.tsx)

**Mudancas:**
```
"Protocolos" → "Processos"
"Processos" → "Casos"
```

| Localizacao | Antes | Depois |
|-------------|-------|--------|
| Linha ~1148 | Protocolos | Processos |
| Linha ~1162 | Processos | Casos |

---

### 2. Lista de Protocolos (ProjectProtocolosList.tsx)

**Mudancas de labels:**
- Titulo: "Protocolos" → "Processos"
- Botao: "Novo protocolo" → "Novo processo"
- Placeholder: "Buscar protocolos..." → "Buscar processos..."
- Filtro: "Todos os protocolos" → "Todos os processos"
- Empty state: "Nenhum protocolo criado" → "Nenhum processo criado"
- Empty state: "Nenhum protocolo encontrado" → "Nenhum processo encontrado"

---

### 3. Dialog de Adicionar (AddProtocoloDialog.tsx)

**Mudancas:**
- Titulo: "Novo Protocolo" → "Novo Processo"
- Label: "Nome do Protocolo" → "Nome do Processo"
- Botao: "Criar Protocolo" → "Criar Processo"

---

### 4. Lista de Processos OAB (ProjectProcessos.tsx)

**Mudancas:**
- Titulo da secao (se houver) → "Casos"
- Badges: "X processo(s)" → "X caso(s)"
- Mensagens de toast: "Processo vinculado" → "Caso vinculado"
- Dialogo adicionar: referencias a processo → caso

---

### 5. Drawer de Protocolo (ProjectProtocoloDrawer.tsx)

**Mudancas nas tabs e labels:**
- Aba "Vinculo": "Processo Vinculado" → "Caso Vinculado"
- Toast: "Protocolo atualizado" → "Processo atualizado"
- Historico: "Historico do Protocolo" → "Historico do Processo"

---

### 6. Tab de Vinculo (ProtocoloVinculoTab.tsx)

**Mudancas:**
- "Processo Vinculado" → "Caso Vinculado"
- "vincular processo" → "vincular caso"
- Mensagens toast adaptadas

---

### 7. Workspace Tabs (ProjectWorkspaceTabs.tsx)

**Mudancas:**
- AlertDialog: "protocolos, colunas e tarefas" → "processos, colunas e tarefas"

---

### 8. Relatorio (RelatorioProtocolo.tsx)

**Mudancas:**
- Titulo: "Historico do Protocolo" → "Historico do Processo"
- Outras referencias visuais

---

### 9. ConcluirEtapaModal.tsx

**Mudancas:**
- "relatorio do protocolo" → "relatorio do processo"

---

### 10. Dashboard Metrics (AdminMetrics.tsx)

**Mudancas nos cards de metricas:**
- "Protocolos" → "Processos" (card titulo)
- "Pendentes" (de protocolos) mantido mas contexto muda
- Variaveis internas podem manter nomes (nao sao visiveis ao usuario)

---

### 11. Hook useProjectProtocolos.ts

**Mudancas apenas nas mensagens de toast:**
- "Protocolo criado com sucesso" → "Processo criado com sucesso"
- "Protocolo atualizado" → "Processo atualizado"
- "Erro ao criar protocolo" → "Erro ao criar processo"
- (nomes de funcoes e tipos internos permanecem iguais)

---

### 12. useProtocoloVinculo.ts

**Sem mudancas** - logica interna, nenhum texto visivel ao usuario

---

### 13. Agenda.tsx

**Mudancas:**
- Referencia "Protocolo/Etapa" em labels → "Processo/Etapa"

---

## Resumo de Arquivos

| Arquivo | Tipo de Mudanca |
|---------|-----------------|
| `src/pages/ProjectView.tsx` | Labels de abas |
| `src/components/Project/ProjectProtocolosList.tsx` | Titulos, botoes, placeholders, empty states |
| `src/components/Project/AddProtocoloDialog.tsx` | Dialog titulo, labels, botao |
| `src/components/Project/ProjectProcessos.tsx` | Badges, toasts, dialogs |
| `src/components/Project/ProjectProtocoloDrawer.tsx` | Tabs, toasts, labels |
| `src/components/Project/ProtocoloVinculoTab.tsx` | Labels de vinculo |
| `src/components/Project/ProjectWorkspaceTabs.tsx` | AlertDialog texto |
| `src/components/Project/RelatorioProtocolo.tsx` | Titulos de secoes |
| `src/components/Project/ConcluirEtapaModal.tsx` | Descricao |
| `src/components/Dashboard/Metrics/AdminMetrics.tsx` | Card titulo |
| `src/hooks/useProjectProtocolos.ts` | Mensagens de toast |
| `src/pages/Agenda.tsx` | Label origem |

---

## Importante

**O que NAO sera alterado:**
- Nomes de tabelas no banco (project_protocolos, processos_oab, etc.)
- Nomes de hooks (useProjectProtocolos, useOABs, etc.)
- Nomes de componentes (ProjectProtocoloDrawer, ProjectProcessos, etc.)
- Nomes de tipos TypeScript (ProjectProtocolo, ProcessoOAB, etc.)

Isso garante que a mudanca seja segura e nao quebre nenhuma logica existente.
