

# Plano: Corrigir Persistência das Credenciais Z-API

## Problema Identificado

| Aspecto | O que acontece | O que deveria acontecer |
|---------|----------------|------------------------|
| `saveZapiConfig()` | Salva apenas `instance_name`, `user_id`, `tenant_id` | Deveria salvar também `zapi_url` e `zapi_token` |
| `save-zapi-config` edge function | Apenas loga os valores, não salva nada | Deveria nem ser necessária |
| Banco de dados | `zapi_url: NULL`, `zapi_token: NULL` | Deveria ter os valores preenchidos |

### Dados atuais no banco:
```text
instance_name: 3E8A7687638142678C80FA4754EC29F2
zapi_url: NULL ← PROBLEMA!
zapi_token: NULL ← PROBLEMA!
```

---

## Correção Necessária

### Modificar `saveZapiConfig` para incluir URL e Token no upsert:

```typescript
const saveZapiConfig = async () => {
  setIsSavingConfig(true);
  
  try {
    if (!zapiConfig.url || !zapiConfig.instanceId || !zapiConfig.token) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos de configuração",
        variant: "destructive",
      });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // CORRIGIDO: Incluir zapi_url e zapi_token no upsert
    const { error: instanceError } = await supabase
      .from('whatsapp_instances')
      .upsert({
        instance_name: zapiConfig.instanceId,
        user_id: userData.user.id,
        tenant_id: tenantId,
        connection_status: 'disconnected',
        last_update: new Date().toISOString(),
        zapi_url: zapiConfig.url,      // ← NOVO
        zapi_token: zapiConfig.token   // ← NOVO
      }, {
        onConflict: 'instance_name'
      });

    if (instanceError) throw instanceError;

    // A edge function não é mais necessária para salvar, 
    // mas podemos manter para log
    await supabase.functions.invoke('save-zapi-config', {
      body: {
        url: zapiConfig.url,
        instanceId: zapiConfig.instanceId,
        token: zapiConfig.token
      }
    });

    toast({
      title: "Configuração salva",
      description: "Credenciais salvas com sucesso! Agora você pode conectar.",
    });
    setActiveTab('conexao');
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    toast({
      title: "Erro",
      description: "Falha ao salvar configuração Z-API",
      variant: "destructive",
    });
  } finally {
    setIsSavingConfig(false);
  }
};
```

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/WhatsApp/sections/WhatsAppSettings.tsx` | Adicionar `zapi_url` e `zapi_token` no upsert (linhas 259-269) |

---

## Resultado Esperado

Após a correção:
1. Usuário preenche URL, Instance ID e Token
2. Clica em "Salvar Configuração"
3. Dados são salvos no banco: `zapi_url`, `zapi_token`, `instance_name`
4. Ao recarregar a página, os campos aparecem preenchidos (já funciona no `loadExistingConfig`)

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────┐
│  USUÁRIO SALVA CONFIGURAÇÃO                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Preenche URL Base, Instance ID, Token                          │
│  2. Clica "Salvar Configuração"                                    │
│  3. UPSERT com TODOS os campos:                                    │
│     - instance_name (Instance ID)                                  │
│     - zapi_url (URL Base) ← NOVO                                   │
│     - zapi_token (Token) ← NOVO                                    │
│     - tenant_id, user_id                                           │
│  4. Toast: "Credenciais salvas com sucesso!"                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  USUÁRIO RECARREGA PÁGINA                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. loadExistingConfig() busca do banco                            │
│  2. Preenche os inputs com valores salvos ✅                        │
│  3. Campos aparecem preenchidos automaticamente                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

