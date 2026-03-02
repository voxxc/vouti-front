

## Correção: Botão "Projetos" visível para Controllers

**Arquivo:** `src/components/Dashboard/DashboardSidebar.tsx`

**Mudança:** Adicionar `'controller'` ao array de roles da seção `projetos` no `sectionRoleMap` (linha 97).

De:
```ts
'projetos': ['advogado'],
```

Para:
```ts
'projetos': ['advogado', 'controller'],
```

Isso fará o botão "Projetos" aparecer no sidebar para usuários com perfil `controller`, mantendo o acesso existente para `advogado` e `admin` (que já tem acesso a tudo).

