

## Corrigir RLS em `metal_setor_flow` e `project_workspaces`

### Problema 1: `metal_setor_flow` - Leitura publica

A politica SELECT atual e:
```sql
USING (true)  -- roles: {public} (inclui anon!)
```
Qualquer pessoa (incluindo usuarios nao autenticados) pode ler todos os dados de fluxo de producao.

**Correcao:** Dropar a politica permissiva e criar uma nova restrita a usuarios autenticados com role Metal:

```sql
DROP POLICY "Operators can view all flows" ON public.metal_setor_flow;

CREATE POLICY "Authenticated metal users can view flows"
ON public.metal_setor_flow
FOR SELECT
TO authenticated
USING (
  has_metal_role(auth.uid(), 'operador'::metal_role)
  OR has_metal_role(auth.uid(), 'admin'::metal_role)
);
```

Tambem corrigir as outras politicas que usam `roles: {public}` (inclui anon) para usar `TO authenticated`:

```sql
DROP POLICY "Admins can manage all sector flows" ON public.metal_setor_flow;
CREATE POLICY "Admins can manage all sector flows"
ON public.metal_setor_flow FOR ALL TO authenticated
USING (has_metal_role(auth.uid(), 'admin'::metal_role));

DROP POLICY "Operators can delete their sector flows" ON public.metal_setor_flow;
CREATE POLICY "Operators can delete their sector flows"
ON public.metal_setor_flow FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM metal_profiles mp
  WHERE mp.user_id = auth.uid() AND mp.setor = metal_setor_flow.setor
));

DROP POLICY "Operators can insert sector flows" ON public.metal_setor_flow;
CREATE POLICY "Operators can insert sector flows"
ON public.metal_setor_flow FOR INSERT TO authenticated
WITH CHECK (
  has_metal_role(auth.uid(), 'operador'::metal_role)
  OR has_metal_role(auth.uid(), 'admin'::metal_role)
);

DROP POLICY "Operators can update flows" ON public.metal_setor_flow;
CREATE POLICY "Operators can update flows"
ON public.metal_setor_flow FOR UPDATE TO authenticated
USING (
  has_metal_role(auth.uid(), 'operador'::metal_role)
  OR has_metal_role(auth.uid(), 'admin'::metal_role)
);
```

---

### Problema 2: `project_workspaces` - SELECT com `USING(true)`

Analisando as politicas atuais, o SELECT **ja esta correto**:

```
SELECT: USING ((tenant_id = get_user_tenant_id()) AND is_project_member(project_id))
  roles: {authenticated}
```

As politicas de INSERT, UPDATE e DELETE tambem ja verificam `tenant_id = get_user_tenant_id() AND is_project_member(project_id)`.

**Conclusao:** A tabela `project_workspaces` ja possui isolamento por tenant em todas as operacoes. Nenhuma politica usa `USING(true)`. Este ponto ja esta resolvido -- nao requer alteracao.

---

### Resumo

| Tabela | Acao |
|---|---|
| `metal_setor_flow` | Recriar todas as 5 politicas com `TO authenticated` e restringir SELECT a usuarios com role Metal |
| `project_workspaces` | Nenhuma alteracao necessaria (ja esta seguro) |

### Impacto

- **Metal system**: Operadores e admins continuam funcionando normalmente. Usuarios anonimos e de outros sistemas perdem acesso (comportamento desejado).
- **Project workspaces**: Zero impacto, politicas ja estao corretas.

