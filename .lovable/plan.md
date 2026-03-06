

## Gerenciar Carteiras TOTP por Usuário (via Usuários)

### Objetivo
Adicionar uma seção "Carteiras 2FA" no dialog de edição de usuário (`UserManagementDrawer`), onde o admin pode marcar/desmarcar checkboxes para liberar quais carteiras TOTP o usuário pode ver. Salva instantaneamente na tabela `totp_wallet_viewers`.

### Implementação

**Arquivo: `src/components/Admin/UserManagementDrawer.tsx`**

1. Ao abrir o dialog de edição de um usuário, buscar:
   - Todas as `totp_wallets` do tenant (para listar as opções)
   - Os `totp_wallet_viewers` existentes para aquele `user_id` (para marcar os checkboxes)

2. Adicionar uma seção "Carteiras 2FA" abaixo das Permissões Adicionais no form de edição, com checkboxes para cada carteira do tenant.

3. Ao marcar/desmarcar um checkbox:
   - **Marcar**: `INSERT` em `totp_wallet_viewers` com `wallet_id`, `user_id`, `tenant_id`, `granted_by`
   - **Desmarcar**: `DELETE` de `totp_wallet_viewers` onde `wallet_id` e `user_id` correspondem

4. A ação é instantânea (não depende do botão "Salvar Alterações") — toggle individual por carteira.

5. Não exibir esta seção se o usuário sendo editado for `admin` ou `controller` (eles já veem tudo).

### Dados já existentes
- Tabela `totp_wallet_viewers` já existe com campos: `id`, `wallet_id`, `user_id`, `tenant_id`, `granted_by`, `granted_at`
- Tabela `totp_wallets` já existe com `id`, `name`, `tenant_id`
- Hook `useTOTPData` já filtra carteiras por viewers para usuários não-admin
- Nenhuma migração de banco necessária

### Isolamento multi-tenant
- Query de carteiras filtra por `tenant_id`
- Query de viewers filtra por `tenant_id` e `user_id`
- Insert inclui `tenant_id` do admin logado

