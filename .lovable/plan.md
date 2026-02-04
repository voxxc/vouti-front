
# Plano: Dar Acesso aos Tokens TOTP para Heloise

## Situação Atual

| Atributo | Valor |
|----------|-------|
| Usuária | Heloise L. (lorenzzattoadv@gmail.com) |
| Tenant | Solvenza |
| Role atual | `advogado` |
| Acesso TOTP | ❌ Não tem |

## Lógica de Acesso TOTP

O sistema atualmente permite acesso aos tokens TOTP apenas para usuários com role `admin` ou `controller`:

```typescript
const canSeeTOTP = currentUserRole === 'admin' || currentUserRole === 'controller';
```

## Solução Proposta

Adicionar a role `controller` à Heloise. Isso é feito via SQL no banco de dados.

A role `controller` é apropriada porque:
- Dá acesso às funcionalidades de controle (incluindo TOTP)
- Não concede privilégios de administrador total
- Heloise mantém sua role principal como `advogado`

## Comando SQL

```sql
INSERT INTO user_roles (user_id, role, tenant_id, is_primary)
VALUES (
  '3be82b03-5931-4a0a-b9f9-a83c666cf93f',  -- Heloise
  'controller',
  '27492091-e05d-46a8-9ee8-b3b47ec894e4',  -- Solvenza
  false  -- Não é a role principal
);
```

## Resultado Esperado

Após a execução:

| Antes | Depois |
|-------|--------|
| Role: advogado | Roles: advogado + controller |
| TOTP: ❌ | TOTP: ✅ |

A Heloise poderá ver o ícone de relógio (tokens TOTP) no menu lateral do Dashboard, com a mesma visualização que admins e controllers têm.

## Nenhuma Alteração de Código

Esta solução não requer modificação de arquivos - apenas uma inserção no banco de dados.
