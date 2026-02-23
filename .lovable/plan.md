

## Correcoes Urgentes + Agenda no CRM

### 1. Agenda como Drawer na Sidebar do CRM (isolada do Vouti)

A Agenda sai de Config > Conta e vira um botao proprio na sidebar do CRM, abrindo como uma secao completa (igual Contatos, Campanhas, etc.).

**Arquivos editados:**

- **`WhatsAppDrawer.tsx`**: Adicionar `"agenda"` ao tipo `WhatsAppSection`. Adicionar case `"agenda"` no `renderSection()` que renderiza `<AgendaContent />`
- **`WhatsAppLayout.tsx`**: Adicionar case `"agenda"` no `renderSettingsSection()` ou como secao principal. Adicionar div para montar a secao Agenda
- **`WhatsAppSidebar.tsx`**: Adicionar botao "Agenda" com icone `Calendar` na sidebar, entre Campanhas e Central de Ajuda
- **`WhatsAppAccountSettings.tsx`**: Remover a aba "Agenda" e o import de `AgendaContent`. Manter apenas "Geral" e "Usuarios"

A agenda do CRM reutiliza o componente `AgendaContent` mas e totalmente isolada -- os dados ja sao filtrados por tenant/usuario logado, entao nao se mistura com o Vouti.

---

### 2. DESFAZER Comentarios no ProcessoOABDetalhes (Casos)

Os comentarios foram adicionados ERRONEAMENTE no drawer de Casos (`ProcessoOABDetalhes.tsx`). "Processo" no contexto de Workspace NAO e "Caso/Processo Judicial".

**Arquivo:** `ProcessoOABDetalhes.tsx`
- Remover o import de `ProcessoComentarios`
- Remover o bloco `<Card>` com `<ProcessoComentarios>` que esta nas linhas 488-491 da aba Resumo

A tabela `processo_comentarios`, o hook `useProcessoComentarios` e o componente `ProcessoComentarios` continuam existindo -- serao reaproveitados para os Processos do Workspace (TaskModal).

---

### 3. TaskModal (Processos do Workspace): Limpeza Completa + Comentarios

O TaskModal AINDA possui codigo residual de Vinculo, Historico e Relatorio que precisa ser removido, ALEM de receber o sistema de comentarios.

**Arquivo:** `TaskModal.tsx`

**Remover:**
- `TabsContent value="vinculo"` (linhas 1111-1118) -- o bloco condicional com `TaskVinculoTab`
- `TabsContent value="historico"` (linhas 1140-1142) -- o bloco com `TaskHistoryPanel`
- O bloco `RelatorioUnificado` (linhas 1148-1158) e o estado `relatorioOpen`
- A prop `onGerarRelatorio` passada para `TaskTarefasTab` (linha 1128)
- Os imports nao mais utilizados: `TaskVinculoTab`, `TaskHistoryPanel`, `RelatorioUnificado`, `useTaskVinculo`, `History`, `Link2`
- Os estados: `relatorioOpen`, `processoOabId`, `processoVinculado`

**Adicionar na aba "Detalhes":**
- Abaixo dos comentarios existentes (que ja existem no final da tab "detalhes"), ou como secao propria, adicionar `<ProcessoComentarios>` usando o `task.id` como `processoId`
- O componente `ProcessoComentarios` ja suporta replies e mencoes, perfeito para processos do workspace

**Arquivo:** `TaskTarefasTab.tsx`
- Remover a prop `onGerarRelatorio` e `hasVinculo`
- Remover o botao "Gerar Relatorio" (linhas 408-412)

**Nota sobre a tabela:** A tabela `processo_comentarios` usa `processo_id` referenciando `processos_oab`. Para os processos do workspace (tasks), sera necessario criar uma tabela separada `task_comentarios` ou adaptar `processo_comentarios` para aceitar tasks. A abordagem mais limpa: criar `task_comentarios` com a mesma estrutura, referenciando `project_processos(id)` em vez de `processos_oab(id)`.

**Migracao SQL:**
```
CREATE TABLE task_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  reply_to_id UUID REFERENCES task_comentarios(id) ON DELETE SET NULL,
  mentioned_user_ids UUID[] DEFAULT '{}',
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE task_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_task_comentarios" ON task_comentarios
  FOR ALL USING (tenant_id = get_user_tenant_id());
```

**Novo hook:** `useTaskComentarios.ts` -- similar ao `useProcessoComentarios` mas referenciando `task_comentarios`

**Novo componente:** `TaskComentarios.tsx` -- similar ao `ProcessoComentarios` mas usando o novo hook

---

### Resumo de Alteracoes

| Arquivo | Acao |
|---|---|
| `WhatsAppDrawer.tsx` | Adicionar "agenda" ao type + case no switch |
| `WhatsAppLayout.tsx` | Adicionar secao Agenda na renderizacao |
| `WhatsAppSidebar.tsx` | Adicionar botao Agenda na sidebar |
| `WhatsAppAccountSettings.tsx` | Remover aba Agenda, manter so Geral e Usuarios |
| `ProcessoOABDetalhes.tsx` | REMOVER ProcessoComentarios (foi adicionado no lugar errado) |
| `TaskModal.tsx` | Remover Vinculo/Historico/Relatorio residuais + adicionar TaskComentarios |
| `TaskTarefasTab.tsx` | Remover props onGerarRelatorio e hasVinculo e botao |
| Novo: `TaskComentarios.tsx` | Componente de comentarios para processos do workspace |
| Novo: `useTaskComentarios.ts` | Hook para CRUD de comentarios em tasks |
| Migracao SQL | Criar tabela `task_comentarios` |
