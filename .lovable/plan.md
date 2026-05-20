# Liberar combinação livre de Perfil + Permissões Adicionais

## Causa raiz
Em `src/components/Admin/UserManagementDrawer.tsx` há filtros que escondem do bloco "Permissões Adicionais" a role que está selecionada como Perfil principal e ainda removem essa role das marcações já existentes ao trocar o Perfil. Isso impede, por exemplo, alguém com Perfil = Comercial de marcar também "Clientes" (comercial) como permissão adicional, ou manter "Controladoria" ao mudar para Controller.

## Correção
Remover qualquer filtro/sanitização entre Perfil e Permissões Adicionais no drawer. Qualquer admin poderá escolher qualquer Perfil e marcar todas as Permissões Adicionais que quiser, livremente, sem que o sistema desmarque ou esconda nada.

1. Trocar `availablePermissions` e `createAvailablePermissions` para exibir a lista completa de `ADDITIONAL_PERMISSIONS` (sem filtrar pela role principal).
2. No `onValueChange` do Select de Perfil (edição e criação), parar de remover a nova role do array `additionalPermissions` — manter exatamente o que o usuário marcou.
3. Manter o resto do fluxo (salvar, badges, resumo "Selecionadas: ...") intacto — ele já tolera role principal repetida nas adicionais.

`UserManagement.tsx` já é livre, não precisa de mudanças.

## Arquivos afetados
- `src/components/Admin/UserManagementDrawer.tsx`

## Impacto
- **Usuário final (admin que edita):** passa a ver todas as 5 opções (Agenda, Clientes, Financeiro, Controladoria, Reuniões) sempre, independente do Perfil escolhido, e nada é desmarcado ao trocar o Perfil.
- **Dados:** nenhuma migration. O salvamento continua via `primary_role` + `additional_roles` no RPC já existente; a tabela `user_roles` aceita a mesma role repetida sem efeito colateral (unique por user_id+role).
- **Riscos colaterais:** baixos. A função `has_role_in_tenant` é idempotente — ter a role principal também listada como adicional não duplica acesso nem gera erro.
- **Quem é afetado:** apenas telas de edição/criação de usuário no Admin do tenant. Não toca Super-Admin, suporte global, nem RLS.

## Validação
- Abrir Editar Usuário, escolher Perfil = Comercial e marcar todas as 5 permissões adicionais → salva sem erro.
- Trocar o Perfil de Comercial para Controller com permissões marcadas → marcações permanecem.
- Criar novo usuário com Perfil = Admin e todas as adicionais marcadas → salva sem erro.
