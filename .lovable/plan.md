

## Corrigir RLS da tabela `whatsapp_labels` para permitir criacao de etiquetas

### Problema encontrado

O erro no console e claro:
```
new row violates row-level security policy for table "whatsapp_labels"
```

A politica atual de INSERT/UPDATE/DELETE (`whatsapp_labels_admin_all`) exige que o usuario tenha role `admin` ou `controller` na tabela `user_roles`. O usuario atual tem role `advogado`, entao nao consegue criar, editar ou excluir etiquetas.

### Solucao

Adicionar uma politica RLS que permita a **qualquer membro autenticado do tenant** gerenciar etiquetas (INSERT, UPDATE, DELETE) dentro do seu proprio tenant. Etiquetas sao ferramentas de organizacao e nao precisam de restricao administrativa.

### Detalhes tecnicos

**Migracao SQL**: Criar nova politica permissiva para membros do tenant:

```sql
CREATE POLICY "whatsapp_labels_tenant_all"
ON whatsapp_labels
FOR ALL
TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());
```

Isso permite que qualquer usuario autenticado do tenant crie, edite e exclua etiquetas pertencentes ao seu tenant, sem exigir role de admin.

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar politica `whatsapp_labels_tenant_all` para membros do tenant |

Nenhuma mudanca de codigo no frontend -- o componente `WhatsAppLabelsSettings.tsx` ja esta correto e funcional.
