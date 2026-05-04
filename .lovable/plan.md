## Unificar o detalhe de prazo no Workspace com o da Agenda + mostrar criação

Hoje há **duas telas distintas** para o mesmo conceito:

- **Agenda** → usa o componente `DeadlineDetailDialog` (busca o prazo por ID, abas Info/Comentários/Conclusão, mostra Origem/Vinculado, ações de concluir/reabrir/editar/excluir).
- **Workspace (Protocolo)** → tem um Dialog escrito *inline* dentro de `ProjectProtocoloContent.tsx` (~300 linhas duplicadas), com layout parecido mas divergente.

O resultado é desalinhamento visual e funcional (campos a menos, ações em ordem diferente, sem abas Origem/Vinculado etc.).

### Objetivo

1. No Workspace, abrir **o mesmo `DeadlineDetailDialog` da Agenda** ao clicar num prazo.
2. Adicionar **data + hora de criação** do prazo dentro do diálogo (vale para Agenda e Workspace, já que será o mesmo componente).

---

### Mudanças

**1. `src/components/Project/ProjectProtocoloContent.tsx`**
- Importar `DeadlineDetailDialog` de `@/components/Agenda/DeadlineDetailDialog`.
- Substituir todo o bloco `<Dialog open={isDetailDialogOpen}>...</Dialog>` (linhas ~862–1170) por:
  ```tsx
  <DeadlineDetailDialog
    deadlineId={selectedDeadline?.id ?? null}
    open={isDetailDialogOpen}
    onOpenChange={(open) => {
      setIsDetailDialogOpen(open);
      if (!open) {
        setSelectedDeadline(null);
        fetchPrazosVinculados(); // reflete mudanças (concluir/editar/excluir)
      }
    }}
  />
  ```
- Remover o `EditarPrazoDialog` solto no fim (linhas 1174–1183) — o `DeadlineDetailDialog` já tem o botão "Editar" que abre o `EditarPrazoDialog` internamente.
- Limpar imports e estados que ficarem órfãos (`isEditPrazoOpen`, `editingDeadlineObj`, `confirmCompleteId`, `reopenConfirmId`, `deleteDeadlineConfirm` se só eram usados pelo bloco removido — manter os que ainda forem usados em outros lugares do arquivo, como nos botões de "concluir rápido" da lista).
- Manter `openDeadlineDetails`, `selectedDeadline` e `isDetailDialogOpen` (continuam sendo o gatilho do clique).
- O `DeadlineDetailDialog` se sincroniza via `dispatchDeadlineChange` / evento global `deadline-change`; mesmo assim, o `fetchPrazosVinculados()` no `onOpenChange(false)` garante que a lista local do workspace reflita imediatamente.

**2. `src/components/Agenda/DeadlineDetailDialog.tsx`**
- Na aba **"Informações"**, abaixo dos campos de Data/Projeto/Cliente, adicionar bloco:
  ```tsx
  <div>
    <span className="text-sm font-medium text-muted-foreground">Criado em</span>
    <p className="mt-1 text-sm">
      {format(deadline.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      {deadline.createdByName ? ` por ${deadline.createdByName}` : ''}
    </p>
  </div>
  ```
- O campo `createdAt` já é populado na query interna do componente (linha 232: `createdAt: safeParseTimestamp(d.created_at)`). O `created_at` da tabela `deadlines` é `timestamptz`, então hora vem incluída.
- Se a query interna não estiver trazendo o nome do criador, ler junto: `creator:profiles!deadlines_user_id_fkey(full_name)` e mapear para `createdByName` (opcional — exibe só a data se não vier).

### Resultado

- Mesmo visual, abas e ações ao clicar num prazo, esteja ele na Agenda ou dentro de um Protocolo do Workspace.
- Toda janela de detalhe passa a mostrar **"Criado em DD/MM/AAAA às HH:mm"** (e, se disponível, "por Fulano").
- Reduz ~300 linhas duplicadas em `ProjectProtocoloContent.tsx`.

### Fora de escopo

- Não muda o `EditarPrazoDialog` (form de edição) — continua sendo aberto pelo botão "Editar" dentro do detalhe.
- Não mexe na listagem de prazos do workspace (cards), só no diálogo que abre ao clicar.