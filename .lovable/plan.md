

## Plano: Botão 2FA no topbar do Super Admin

### Objetivo
Adicionar um botão de acesso rápido ao autenticador 2FA diretamente no topbar do Super Admin, usando um Popover/Sheet que mostra os tokens e códigos sem precisar navegar para a aba.

### Mudança

**Novo arquivo**: `src/components/SuperAdmin/SuperAdminTOTPTopbar.tsx`
- Componente com botão `ShieldCheck` no topbar
- Ao clicar, abre um `Popover` (ou `Sheet`) com:
  - Lista de tokens salvos com código TOTP e barra de progresso do timer
  - Botão de copiar código (1 clique)
  - Botão "+" para adicionar token (abre dialog inline)
  - Botão de remover token
- Reutiliza a mesma lógica e `localStorage` key (`vouti_totp_tokens`) do `SuperAdminAuthenticator` existente
- Reutiliza `generateTOTP`, `getSecondsRemaining`, `isValidBase32` de `@/lib/totp`

**Arquivo editado**: `src/pages/SuperAdmin.tsx`
- Importar `SuperAdminTOTPTopbar`
- Inserir no topbar (linha ~277, entre ThemeToggle e botão Sair):
  ```tsx
  <SuperAdminTOTPTopbar />
  ```

### Detalhes
- O componente será compacto: popover com largura fixa (~320px), mostrando tokens em lista vertical
- Timer compartilhado (barra de progresso no topo do popover)
- Copiar código com 1 clique no próprio código
- A aba "Authenticator" existente continua funcionando normalmente (mesma source de dados no localStorage)

### Arquivos
- Criar: `src/components/SuperAdmin/SuperAdminTOTPTopbar.tsx`
- Editar: `src/pages/SuperAdmin.tsx` (1 import + 1 linha no topbar)

