

# Fix: Contagem de tokens inconsistente entre usuários

## Problema

Os **tokens** são buscados sem filtro de permissão (linha 90-94 — busca todos os tokens do tenant), enquanto as **carteiras** são filtradas por `totp_wallet_viewers` para usuários não-admin. Resultado: um usuário comum vê tokens de carteiras que ele nem tem acesso, gerando contagem diferente entre usuários.

## Solução

Filtrar os tokens no `useTOTPData.ts` para que usuários não-admin só vejam tokens das carteiras visíveis para eles.

### Mudança em `src/hooks/useTOTPData.ts`

Na query de tokens (linha 86-100):
- Adicionar dependência de `isAdminOrController` e `user?.id` na queryKey
- Se admin/controller: manter busca atual (todos os tokens do tenant)
- Se usuário comum: primeiro buscar `wallet_ids` do `totp_wallet_viewers`, depois filtrar tokens com `.in('wallet_id', walletIds)`
- Se não tem carteiras visíveis, retornar array vazio

Lógica idêntica à já usada na query de wallets (linha 61-79), aplicada aos tokens.

