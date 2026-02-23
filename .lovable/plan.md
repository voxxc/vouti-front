

## Corrigir vulnerabilidades RLS

### 1. project_workspaces - Ja corrigido

Ao verificar as politicas RLS atuais, elas JA possuem isolamento por tenant:
- SELECT: `tenant_id = get_user_tenant_id() AND is_project_member(project_id)`
- INSERT: `tenant_id = get_user_tenant_id() AND is_project_member(project_id)`
- UPDATE: `tenant_id = get_user_tenant_id() AND is_project_member(project_id)`
- DELETE: `tenant_id = get_user_tenant_id() AND is_project_member(project_id)`

Nenhuma acao necessaria. O alerta do scan esta desatualizado.

### 2. metal_profiles - Leitura publica de dados pessoais

**Problema:** A politica SELECT usa `USING(true)`, permitindo que qualquer pessoa (incluindo anonimos) leia emails e nomes de funcionarios.

**Solucao:** Substituir a politica SELECT para exigir autenticacao e pertencer ao sistema Metal (ter um role na tabela `metal_user_roles`).

**SQL Migration:**

```sql
-- Remover politica permissiva
DROP POLICY "Users can view all profiles" ON metal_profiles;

-- Nova politica: apenas usuarios autenticados do Metal podem ver perfis
CREATE POLICY "Authenticated metal users can view profiles"
ON metal_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM metal_user_roles
    WHERE metal_user_roles.user_id = auth.uid()
  )
);
```

Isso garante que so usuarios autenticados que possuem um role no sistema Metal conseguem listar os perfis, bloqueando acesso anonimo e de usuarios de outros sistemas (juridico, link, etc).

### Resumo

| Item | Acao |
|---|---|
| project_workspaces | Nenhuma - politicas ja estao corretas |
| metal_profiles | Migration SQL para restringir SELECT a usuarios autenticados do Metal |

