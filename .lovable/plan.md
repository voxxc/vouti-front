
# Alterar limite de usuários do plano Essencial

Mudança simples em `src/pages/HomePage.tsx`, linha 222:

```
'3 usuários' → '5 usuários'
```

Também verificar se `CreateTenantDialog.tsx` e `planos_config` no banco precisam atualizar. O dialog já mostra `3` hardcoded para Essencial, e o banco `planos_config` pode ter `limite_usuarios = 3`.

## Arquivos

1. **`src/pages/HomePage.tsx`** — linha 222: `usersLabel: '5 usuários'`
2. **`src/components/SuperAdmin/CreateTenantDialog.tsx`** — linha com `essencial: { ... usuarios: '3' }` → `'5'`
3. **Banco `planos_config`** — UPDATE `limite_usuarios = 5` WHERE `codigo = 'essencial'`
