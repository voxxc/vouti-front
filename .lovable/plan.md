

## Corrigir salvamento de configuracoes do Agente IA

### Problema raiz

O `useEffect` do componente `WhatsAppAISettings` tem `tenantId` como dependencia. Quando o hook `useTenantId()` carrega assincronamente (de `null` para o UUID real), o `loadConfig` roda novamente e **sobrescreve todas as alteracoes feitas pelo usuario** com os valores padrao, pois nao existe config no banco para aquele `agent_id` ainda.

Alem disso, se o usuario clicar em "Salvar" apos o overwrite, os dados padrao (nao os editados) sao salvos. Se clicar novamente, o INSERT falha com violacao de indice unico porque a primeira tentativa ja criou a linha, mas o `config.id` foi limpo pelo `loadConfig` re-disparado.

### Correcoes

| Mudanca | Descricao |
|---|---|
| Guard no `useEffect` | Evitar re-executar `loadConfig` se ja carregou com sucesso para o mesmo `agentId` |
| Usar `loading` do `useTenantId` | Aguardar `tenantId` estar pronto antes de chamar `loadConfig` |
| Tratar INSERT duplicado | Usar `upsert` no lugar de `insert` para evitar erro de conflito de indice unico |

### Detalhes tecnicos

**1. Aguardar tenantId carregar antes de loadConfig**

Extrair `loading` do hook `useTenantId` e adicionar guard no `useEffect`:

```text
const { tenantId, loading: tenantLoading } = useTenantId();

useEffect(() => {
  if (tenantLoading && !isSuperAdmin) return;
  loadConfig();
}, [tenantId, isSuperAdmin, agentId, tenantLoading]);
```

Isso garante que `loadConfig` so roda quando o `tenantId` esta resolvido, eliminando a re-execucao que sobrescreve as edicoes do usuario.

**2. Usar `upsert` em vez de `insert` para novos configs**

No `handleSave`, trocar o INSERT por UPSERT com conflito no `agent_id`:

```text
// Em vez de insert simples:
const result = await supabase
  .from('whatsapp_ai_config')
  .upsert(payload, { onConflict: 'agent_id' })
  .select()
  .single();
```

Isso elimina o erro de violacao de indice unico caso o usuario salve varias vezes rapidamente.

**3. Adicionar ref para evitar overwrite**

Adicionar uma flag `hasLoadedRef` para impedir que o `loadConfig` rode novamente para o mesmo agente apos ja ter carregado:

```text
const hasLoadedRef = useRef<string | null>(null);

useEffect(() => {
  if (tenantLoading && !isSuperAdmin) return;
  if (hasLoadedRef.current === (agentId || 'global')) return;
  loadConfig();
}, [tenantId, isSuperAdmin, agentId, tenantLoading]);

// Dentro de loadConfig, apos carregar:
hasLoadedRef.current = agentId || 'global';
```

### Arquivo afetado

`src/components/WhatsApp/settings/WhatsAppAISettings.tsx`

### Resultado esperado

- O usuario abre a aba "Comportamento da IA" de qualquer agente
- Edita os campos normalmente sem que os valores sejam sobrescritos
- Clica "Salvar" e a configuracao e gravada corretamente
- Ao reabrir a aba, os valores salvos aparecem carregados

