

## Corrigir Politicas RLS Permissivas (USING(true))

### Problema

A tabela `project_workspaces` tem uma politica SELECT com `USING(true)`, permitindo que qualquer usuario autenticado veja workspaces de qualquer tenant. As demais tabelas com `USING(true)` sao casos aceitaveis (tabelas de referencia, sistemas isolados, ou acesso publico intencional).

### Classificacao das tabelas

| Tabela | Risco | Acao |
|---|---|---|
| **project_workspaces** | CRITICO - expoe dados entre tenants | Corrigir |
| avisos_sistema | Baixo - avisos do sistema para todos | Manter (intencional) |
| batink_profiles / batink_user_roles | Baixo - sistema Batink isolado | Manter |
| metal_profiles / metal_setor_flow / metal_user_roles | Baixo - sistema Metal isolado | Manter |
| prazos_processuais_cpc | Nenhum - tabela de referencia publica | Manter |
| tipos_acao | Nenhum - tabela de referencia publica | Manter |
| landing_leads (INSERT anon) | Nenhum - captura publica de leads | Manter |
| link_profiles | Nenhum - perfis publicos do Vlink | Manter |
| service_role policies | Nenhum - acesso apenas server-side | Manter |

### O que sera feito

Substituir a politica SELECT da tabela `project_workspaces` para validar que o usuario pertence ao mesmo tenant:

```text
Antes:  USING(true)  -- qualquer usuario ve tudo
Depois: USING(tenant_id = get_user_tenant_id() AND is_project_member(project_id))
```

### Detalhes tecnicos

**Migracao SQL:**

```sql
-- Remover politica permissiva
DROP POLICY "Users can view workspaces" ON project_workspaces;

-- Criar politica com isolamento por tenant + membro do projeto
CREATE POLICY "Users can view workspaces"
  ON project_workspaces
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id()
    AND is_project_member(project_id)
  );
```

As funcoes `get_user_tenant_id()` e `is_project_member()` ja existem no banco como SECURITY DEFINER, entao nao ha risco de recursao.

**Nenhuma alteracao de codigo frontend e necessaria** - o hook `useProjectWorkspaces` ja filtra por `project_id`, e o contexto de tenant ja esta presente nas queries.

Apos aprovar, a politica sera atualizada e o finding de seguranca sera marcado como resolvido.

