

## Corrigir salvamento de grupos do WhatsApp no Vouti.CRM

### Diagnostico

Ao clicar em "Buscar Grupos", a edge function `whatsapp-list-groups` busca os chats na Z-API, filtra os grupos e retorna corretamente. Porem, o salvamento na tabela `whatsapp_contacts` falha silenciosamente por dois motivos:

1. **Erros do upsert sao ignorados**: O loop `for...of` faz `await supabase.from("whatsapp_contacts").upsert(...)` sem verificar o resultado `.error`. Se o RLS bloquear ou houver qualquer erro, ele segue em frente sem avisar.

2. **Formato do ID do grupo inconsistente**: A Z-API retorna `chat.phone` que pode nao conter o sufixo `@g.us`. Ao carregar grupos salvos, o codigo filtra com `.like("phone", "%@g.us")`, entao mesmo que o save funcione, os grupos nao aparecem se o phone nao tiver esse sufixo.

3. **Upserts individuais sao lentos e frageis**: Fazer um upsert por grupo (um a um) e ineficiente e aumenta a chance de falha parcial.

### Solucao

**Arquivo: `src/components/WhatsApp/sections/WhatsAppInbox.tsx`**

Modificar a funcao `handleFetchGroups`:

1. **Normalizar o ID do grupo**: Garantir que todo group ID tenha o sufixo `@g.us`. Se a Z-API retornar sem, adicionar.

2. **Fazer upsert em batch**: Em vez de um loop `for...of`, usar um unico `upsert` com array de todos os grupos.

3. **Verificar erros do upsert**: Checar `.error` e exibir toast de erro se falhar.

```typescript
const handleFetchGroups = useCallback(async () => {
  if (!myAgentId || !tenantId) return;
  setIsLoadingGroups(true);
  try {
    const { data, error } = await supabase.functions.invoke("whatsapp-list-groups", {
      body: { agentId: myAgentId },
    });
    if (error) throw error;
    if (data?.groups && data.groups.length > 0) {
      // Normalizar IDs: garantir sufixo @g.us
      const normalizedGroups = data.groups.map((g: any) => ({
        id: g.id.includes("@g.us") ? g.id : `${g.id}@g.us`,
        name: g.name,
      }));

      // Upsert em batch
      const contactsToUpsert = normalizedGroups.map((g: any) => ({
        phone: g.id,
        name: g.name,
        tenant_id: tenantId,
      }));

      const { error: upsertError } = await supabase
        .from("whatsapp_contacts")
        .upsert(contactsToUpsert, { onConflict: "tenant_id,phone" });

      if (upsertError) {
        console.error("Erro ao salvar grupos:", upsertError);
        toast.error("Grupos encontrados mas erro ao salvar.");
      } else {
        toast.success(`${normalizedGroups.length} grupos salvos.`);
      }

      setGroups(normalizedGroups);
    } else {
      toast.info("Nenhum grupo encontrado.");
    }
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    toast.error("Erro ao buscar grupos.");
  } finally {
    setIsLoadingGroups(false);
  }
}, [myAgentId, tenantId]);
```

**Arquivo: `supabase/functions/whatsapp-list-groups/index.ts`**

Tambem normalizar o ID no lado do servidor para consistencia:

```typescript
const groups = (Array.isArray(chats) ? chats : [])
  .filter((chat: any) => chat.isGroup === true)
  .map((chat: any) => {
    const rawId = chat.phone || chat.id;
    return {
      id: rawId.includes("@g.us") ? rawId : `${rawId}@g.us`,
      name: chat.name || chat.phone || 'Grupo',
      isGroup: true,
    };
  });
```

### Resumo

| Mudanca | Motivo |
|---|---|
| Normalizar group ID com `@g.us` (edge function + frontend) | IDs sem sufixo nao sao encontrados ao recarregar |
| Upsert em batch (array unico) | Mais rapido e atomico |
| Verificar `.error` do upsert | Erros silenciosos impediam o save |
| Toast de erro em caso de falha | Usuario sabe que algo deu errado |

