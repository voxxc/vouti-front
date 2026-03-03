

## Diagnóstico: QR Code não abre no tenant De Morais

### Causa Raiz
No `AgentConfigDrawer.tsx`, a função `checkConnectionStatusOnLoad` é chamada com `setTimeout(300ms)` dentro de `loadInstanceConfig`, mas utiliza a variável de estado `config` da closure — que ainda contém valores **vazios** (o `setConfig` ainda não foi re-renderizado). Isso faz a edge function cair no fallback das variáveis de ambiente globais (`Z_API_URL`, `Z_API_TOKEN`), verificando o status de uma instância **diferente** da do agente.

Se a instância global estiver desconectada, o problema não se manifesta. Mas se estiver em outro estado, pode marcar `isConnected = true` incorretamente — **escondendo o botão de QR Code**.

Mesmo quando `isConnected` fica `false`, a verificação de status com credenciais erradas pode causar comportamento inconsistente.

### Correção

**Arquivo: `src/components/WhatsApp/settings/AgentConfigDrawer.tsx`**

1. **Passar as credenciais carregadas diretamente para `checkConnectionStatusOnLoad`** em vez de depender do state `config` (que é stale no closure):
   - Alterar a assinatura para receber `instanceId`, `instanceToken`, `clientToken` como parâmetros
   - Na chamada dentro de `loadInstanceConfig`, passar os valores extraídos do `data` do banco
   - Se não houver credenciais salvas (agente sem config), **pular a verificação de status** para evitar fallback

2. **Garantir que `handleConnect` não dispare se não tiver credenciais**:
   - Adicionar validação para exibir toast se `config.zapi_instance_id` ou `config.zapi_instance_token` estiverem vazios

### Mudança principal (pseudocódigo)
```typescript
// De:
checkConnectionStatusOnLoad() // usa config do closure (vazio)

// Para:
checkConnectionStatusOnLoad(extractedId, extractedToken, "")
// Função recebe credenciais como parâmetro, não depende do state
// Se ambos forem vazios, retorna sem fazer request
```

