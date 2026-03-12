

# Fix: Prevenir double-click na criação de prazos

## Problema
Ao clicar em "Criar Prazo", se o usuário clicar duas vezes rapidamente, dois prazos são criados porque não há estado de loading bloqueando o botão.

## Solução

### 1. `AgendaContent.tsx`
- Adicionar estado `creatingDeadline` (boolean)
- No início de `handleCreateDeadline`, setar `true`; no finally, setar `false`
- No botão "Criar Prazo" (linha 1184): adicionar `disabled={creatingDeadline}` e mostrar spinner quando ativo

### 2. `CreateDeadlineDialog.tsx`
- Já possui estado `saving` e o botão já está com `disabled={saving}`, mas falta o guard no início da função
- Adicionar `if (saving) return;` no topo de `handleCreate` para evitar chamadas concorrentes antes do re-render

Mudança mínima em dois arquivos, sem impacto visual além do botão desabilitado durante o salvamento.

