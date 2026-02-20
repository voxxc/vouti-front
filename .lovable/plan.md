

## Corrigir criacao de projeto ao cadastrar cliente + tornar nome do cliente opcional

### Problemas identificados

1. **Projeto nao e criado pelo Drawer**: O `CRMDrawer` passa os estados `criarProjeto` e `nomeProjeto` para o `ClienteForm`, mas seu `handleFormSuccess` nao tem nenhuma logica para criar o projeto. Essa logica so existe no `ClienteCadastro.tsx` (pagina standalone).

2. **Campo `client` obrigatorio na tabela `projects`**: A coluna `client` na tabela `projects` e `NOT NULL`, impedindo criar projetos sem nome do cliente.

### Solucao

**1. Migracao SQL** - Tornar coluna `client` opcional

Alterar a coluna `client` da tabela `projects` para permitir valores nulos, com default vazio:

```text
ALTER TABLE projects ALTER COLUMN client DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN client SET DEFAULT '';
```

**2. `src/components/CRM/CRMDrawer.tsx`** - Adicionar logica de criacao de projeto

No `handleFormSuccess` do drawer (view "novo"), replicar a mesma logica do `ClienteCadastro`:
- Importar `useProjectsOptimized` e `supabase`
- Se `criarProjeto` estiver marcado, chamar `createProject` com o `nomeProjeto`
- Atualizar o projeto com o `cliente_id` retornado pelo form
- O campo `client` (nome do cliente) sera passado apenas se disponivel, nao sendo obrigatorio

**3. `src/hooks/useProjectsOptimized.ts`** - Aceitar `client` opcional

Alterar a tipagem do parametro de `createProject` para aceitar `client` como opcional:

```text
// De:
data: { name: string; client: string; description: string }
// Para:
data: { name: string; client?: string; description: string }
```

E usar `data.client || ''` no insert.

**4. `src/pages/ClienteCadastro.tsx`** - Corrigir await do update

O `supabase.from('projects').update(...)` dentro do `.then()` nao tem `await`, entao erros sao silenciados. Adicionar tratamento adequado.

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | Tornar `client` nullable com default vazio |
| `src/hooks/useProjectsOptimized.ts` | `client` opcional no `createProject` |
| `src/components/CRM/CRMDrawer.tsx` | Adicionar logica de criacao de projeto no `handleFormSuccess` |
| `src/pages/ClienteCadastro.tsx` | Corrigir await no update do `cliente_id` |

