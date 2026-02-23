

## Persistir grupos WhatsApp identificados

### Problema
Os grupos buscados via "Buscar Grupos" nao estao sendo salvos no banco. O codigo atual tenta usar `upsert` com `onConflict: "phone,tenant_id"`, mas a tabela `whatsapp_contacts` usa um **indice unico parcial** (`WHERE tenant_id IS NOT NULL`) ao inves de uma constraint direta. O Supabase JS client nao consegue fazer upsert corretamente com indices parciais, fazendo o insert falhar silenciosamente.

### Solucao

**1. Migration SQL: criar constraint unica real**

Adicionar uma constraint UNIQUE real em `(tenant_id, phone)` que o upsert consiga utilizar, ou substituir o indice parcial por uma constraint:

```sql
-- Remover indice parcial existente
DROP INDEX IF EXISTS idx_whatsapp_contacts_tenant_phone;

-- Criar constraint unica real (que funciona com ON CONFLICT)
ALTER TABLE whatsapp_contacts
  ADD CONSTRAINT whatsapp_contacts_tenant_phone_unique
  UNIQUE (tenant_id, phone);
```

**2. Ajustar o upsert no codigo (WhatsAppInbox.tsx)**

Atualizar a funcao `handleFetchGroups` para:
- Usar `ignoreDuplicates: true` como fallback
- Adicionar tratamento de erro no loop de persistencia
- Garantir que os grupos sao carregados do banco apos salvar

```typescript
// Persistir grupos - inserir ou atualizar
for (const group of data.groups) {
  await supabase
    .from("whatsapp_contacts")
    .upsert({
      phone: group.id,
      name: group.name,
      tenant_id: tenantId,
    }, { onConflict: "tenant_id,phone" })
    .select();
}
```

**3. Garantir carregamento ao montar o componente**

O `useEffect` que carrega grupos salvos (linhas 506-519) ja existe e esta correto. Apos a migration, ele passara a funcionar pois os dados estarao efetivamente salvos no banco.

### Resumo tecnico

| Etapa | Acao |
|---|---|
| Migration SQL | Substituir indice parcial por constraint UNIQUE real |
| WhatsAppInbox.tsx | Ajustar onConflict para usar a nova constraint |
| Carregamento | Ja implementado - useEffect com `like("phone", "%@g.us")` |

