

## Restaurar "Dados" para todos + restringir edição a admin/controller

### Problema

1. `ProjectDrawerContent.tsx` hardcoda `role: 'advogado'`, então `isAdmin` nunca é true no drawer
2. `ProjectView.tsx` esconde o botão "Dados" com `{isAdmin && (`, impedindo qualquer participante de ver
3. `isAdmin` só checa `role === 'admin'`, sem incluir `controller`

### Mudanças

**1. `src/components/Project/ProjectDrawerContent.tsx` (linha 20, 34)**

- Importar `userRole` de `useAuth()`
- Trocar `role: 'advogado' as const` por `role: (userRole as any) || 'advogado'`

**2. `src/pages/ProjectView.tsx`**

- Linha 84: Expandir check do `isAdmin` para incluir `controller`:
  ```ts
  if (currentUser?.role === 'admin' || currentUser?.role === 'controller') {
    setIsAdmin(true);
  }
  ```

- Linhas 1081-1088: Remover guard `{isAdmin && (` do botão "Dados" — todos veem o botão

- Linha 1379-1390: Passar prop `readOnly={!isAdmin}` ao `ProjectClientDataDialog`

**3. `src/components/Project/ProjectClientDataDialog.tsx`**

- Adicionar prop `readOnly?: boolean` na interface (linha 36)
- Quando `readOnly` for true e já houver cliente vinculado: esconder o botão "Desvincular Cliente" (linhas 195-204)
- Quando `readOnly` for true e não houver cliente: mostrar mensagem "Nenhum cliente vinculado" em vez do seletor de cliente (linhas 138-185)

### Resultado

| Role | Vê "Dados" | Pode vincular/desvincular |
|---|---|---|
| admin | Sim | Sim |
| controller | Sim | Sim |
| advogado/outros | Sim | Não (somente visualiza) |

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/components/Project/ProjectDrawerContent.tsx` | Usar `userRole` real do `useAuth()` |
| `src/pages/ProjectView.tsx` | Incluir `controller` no `isAdmin`; remover guard do botão "Dados"; passar `readOnly` ao dialog |
| `src/components/Project/ProjectClientDataDialog.tsx` | Aceitar `readOnly` e esconder controles de edição |

