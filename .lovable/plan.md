## 1) Mover protocolo entre projetos (com seleção de workspace destino)

### Causa raiz
Hoje o menu "⋮" do protocolo só permite trocar entre workspaces **do mesmo projeto**. Quando o usuário precisa migrar o protocolo pra outro projeto, não há atalho — precisa excluir e recriar manualmente. Falta um item "Mover para outro projeto" que combine seleção de projeto + workspace destino numa única ação.

### Correção

**1.1. Novo item no `DropdownMenu` (logo abaixo de "Trocar de Workspace"):**
- Label: **"Mover para outro projeto"** com ícone `FolderSymlink`.
- Ao clicar, abre um `Dialog` modal (não submenu) — submenu nested seria pesado pra navegar tenant com muitos projetos.

**1.2. Novo componente `MoveProtocoloDialog`:**
- Header: "Mover protocolo para outro projeto".
- **Passo 1 — Projeto destino:**
  - `Command` (cmdk via `<Command>` do shadcn) com busca por nome.
  - Lista todos os projetos do tenant (exceto o projeto atual), ordenados por nome.
  - Exibe nome + miniatura de cor/ícone (mesmo padrão do `ProjectsDrawer`).
- **Passo 2 — Workspace destino (aparece após selecionar projeto):**
  - Busca em tempo real os workspaces do projeto escolhido (`project_workspaces` filtrado por `project_id`).
  - Mostra como lista de cards clicáveis: ícone `FolderKanban` + nome; marca o `is_default` com badge "padrão".
  - Se o projeto destino tiver apenas 1 workspace, pré-seleciona e mostra como "Será movido para: {nome}".
- **Resumo + ação:**
  - Linha "De: [projeto atual] / [workspace atual]" → "Para: [novo projeto] / [novo workspace]".
  - Botão **"Mover"** (disabled até ter projeto + workspace).
  - Botão "Cancelar".

**1.3. Lógica de mover:**
- Update único em `project_protocolos`: `UPDATE … SET project_id = :novoProjeto, workspace_id = :novoWorkspace WHERE id = :protocoloId AND tenant_id = :tenantId`.
- Validação: `tenantId` do projeto destino === `tenantId` atual (impede vazamento cross-tenant). Como já é mesmo tenant, é guard defensivo.
- Após sucesso: toast "Protocolo movido para {projeto} / {workspace}", `refetch()` dos protocolos do projeto atual (o protocolo some da lista atual).
- Erros: toast destrutivo com mensagem.

**1.4. Carregar projetos do tenant:**
- Usar hook leve novo `useTenantProjectsList(tenantId)` (ou reutilizar `useProjectsOptimized` se já retornar lista plana — verificar shape no momento da implementação). Retorna `{ id, nome, cor, icone }` apenas dos projetos a que o usuário tem acesso (RLS já garante).

**1.5. Carregar workspaces sob demanda:**
- Função local `fetchWorkspaces(projectId)` dentro do dialog (não usar `useProjectWorkspaces` porque ele é stateful e atrelado ao projeto atual). Query: `from('project_workspaces').select('id, nome, is_default').eq('project_id', X).order('ordem')`.

---

## 2) Liberar aba "Audiências" para admin e controller

### Causa raiz
`DashboardSidebar.tsx` linha 138-140 trava o acesso à aba Audiências em `isDaniel` (lock hardcoded de teste). A funcionalidade já está pronta visualmente e pronta pra ser usada por admin e controller do tenant.

### Correção
Substituir o gate em `hasAccessToItem('audiencias')`:

```ts
if (itemId === 'audiencias') {
  return userRoles.includes('admin') || userRoles.includes('controller');
}
```

Remove a flag `isDaniel` deste check (se `isDaniel` não for usado em mais nenhum lugar, mantém o hook por enquanto pra não quebrar outros componentes).

---

### Arquivos afetados
- **Novo:** `src/components/Project/MoveProtocoloDialog.tsx`
- **Editado:** `src/components/Project/ProjectProtocolosList.tsx` (novo item no menu + abrir dialog)
- **Editado:** `src/components/Dashboard/DashboardSidebar.tsx` (gate de audiências)

### Impacto

**1. Usuário final (UX):**
- **Protocolos**: ganha atalho pra mover protocolo entre projetos sem perder etapas, anexos, comentários, vínculos. Fluxo em 2 cliques: escolhe projeto (com busca) → escolhe workspace → confirma.
- **Audiências**: admins e controllers de todos os tenants passam a ver a aba Audiências no menu lateral imediatamente. Antes era invisível pra todos exceto Daniel.

**2. Dados:**
- Zero migration. Update simples em `project_protocolos.project_id + workspace_id` aproveita as constraints e RLS já existentes.
- Etapas, anexos, comentários, marcadores, vínculos de processo do protocolo permanecem intactos (todos referenciam `protocolo_id`, não `project_id`).
- Marcadores (`project_protocolo_marcadores`) são por projeto — ao mover, os marcadores **antigos do projeto de origem** ficam órfãos no protocolo (continuam atrelados mas invisíveis no novo projeto). Isso é o comportamento esperado, mas vou adicionar uma nota no dialog: "Marcadores do projeto atual serão removidos ao mover."
  - Implementação: ao mover, deletar registros em `project_protocolo_marcador_assignments` cujo `marcador_id` pertença ao projeto de origem.

**3. Riscos colaterais:**
- Se o protocolo estiver aberto em outra aba/tab quando movido, vai retornar "não encontrado" na próxima atualização — comportamento aceitável.
- Realtime: outros usuários vendo o projeto de origem verão o protocolo desaparecer; vendo o projeto destino, verão aparecer. Já funciona porque o `useProjectProtocolos` filtra por `project_id` e tem subscription Realtime.
- Audiências: se o tenant não tiver `processos_oab_andamentos` cadastrados, a aba abre vazia (sem erro) — UX já tratada no `AudienciasDrawer`.

**4. Quem é afetado:**
- **Mover protocolo**: qualquer usuário que já tem permissão de editar protocolos (RLS de `project_protocolos` já valida). Em geral admin/controller/agenda.
- **Audiências**: admin e controller de **todos os tenants** (não só Daniel). Demais roles continuam sem ver.

### Validação
1. Abrir um projeto com protocolos → menu ⋮ → "Mover para outro projeto" → dialog abre.
2. Buscar projeto destino pelo nome → selecionar → lista de workspaces aparece → escolher → "Mover".
3. Confirmar toast, protocolo some da lista atual. Abrir projeto destino → aba do workspace escolhido → protocolo aparece com etapas e anexos preservados.
4. Marcadores do projeto origem foram removidos do protocolo (verificar `project_protocolo_marcador_assignments`).
5. Logar como admin de outro tenant (não Daniel) → aba Audiências aparece no menu lateral → drawer abre e lista audiências do tenant.
6. Logar como advogado/comercial → aba Audiências não aparece.
