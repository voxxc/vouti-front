
## Sistema de Permissoes de Visualizacao para Carteiras TOTP

### O que muda

Hoje, todas as carteiras TOTP sao visiveis para todos os usuarios com role `admin` ou `controller`. Com essa mudanca, o administrador podera controlar **quem pode ver cada carteira individualmente**, adicionando ou removendo usuarios autorizados.

### Como vai funcionar

- Cada carteira tera um botao de "Permissoes" (icone de usuarios) ao lado do botao de excluir
- Ao clicar, abre um dialog simples e limpo com:
  - Lista dos usuarios que ja tem acesso (com botao X para remover)
  - Campo de busca para adicionar novos usuarios
- Admins e Controllers continuam vendo todas as carteiras por padrao
- Usuarios comuns so verao carteiras onde foram explicitamente autorizados
- O botao do relogio (2FA) passara a aparecer para todos os usuarios, mas so mostrara as carteiras que o usuario tem permissao

### Detalhes tecnicos

**1. Nova tabela no banco: `totp_wallet_viewers`**

```text
totp_wallet_viewers
  - id (uuid, PK)
  - wallet_id (uuid, FK -> totp_wallets.id, ON DELETE CASCADE)
  - user_id (uuid, FK -> auth.users.id, ON DELETE CASCADE)
  - tenant_id (uuid, FK -> tenants.id)
  - granted_by (uuid, FK -> auth.users.id) -- quem deu a permissao
  - granted_at (timestamptz, default now())
  - UNIQUE(wallet_id, user_id)
```

RLS: admins/controllers podem gerenciar; usuarios comuns so podem SELECT onde sao o `user_id`.

**2. Novo componente: `src/components/Dashboard/TOTP/WalletViewersDialog.tsx`**

Dialog simplificado (inspirado no ProjectParticipants mas mais enxuto):
- Titulo: "Quem pode ver esta carteira"
- Lista de usuarios com acesso (avatar + nome + botao X)
- Campo de busca para adicionar usuarios do tenant
- Sem roles/badges complexos -- apenas adicionar/remover

**3. Alteracao: `src/components/Dashboard/TOTP/WalletCard.tsx`**

- Adicionar botao de "Permissoes" (icone `Users`) ao lado do botao de lixeira
- Prop `onManageViewers` para abrir o dialog
- Usar o padrao `onSelect` com `e.preventDefault()` + `setTimeout` para evitar conflito de foco

**4. Alteracao: `src/hooks/useTOTPData.ts`**

- Adicionar query para buscar `totp_wallet_viewers`
- Adicionar mutations para `addViewer` e `removeViewer`
- Modificar a query de wallets: se o usuario NAO e admin/controller, filtrar apenas wallets onde existe um registro em `totp_wallet_viewers` com seu `user_id`

**5. Alteracao: `src/components/Dashboard/TOTPSheet.tsx`**

- Passar `onManageViewers` para cada `WalletCard`
- Gerenciar estado do `WalletViewersDialog`

**6. Alteracao: `src/components/Dashboard/DashboardLayout.tsx`**

- Remover restricao `canSeeTOTP` baseada em role
- Mostrar o botao 2FA para todos os usuarios
- A filtragem de carteiras visiveis acontece no hook `useTOTPData`

**7. Atualizar tipos em `src/integrations/supabase/types.ts`**

- Sera atualizado automaticamente ao criar a tabela via SQL

### Resumo dos arquivos

1. SQL: Criar tabela `totp_wallet_viewers` com RLS
2. `src/components/Dashboard/TOTP/WalletViewersDialog.tsx` (novo)
3. `src/components/Dashboard/TOTP/WalletCard.tsx` (botao permissoes)
4. `src/hooks/useTOTPData.ts` (queries/mutations de viewers + filtro)
5. `src/components/Dashboard/TOTPSheet.tsx` (integrar dialog)
6. `src/components/Dashboard/DashboardLayout.tsx` (liberar botao para todos)
