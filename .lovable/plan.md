## Causa raiz

O payload atual envia `credential` no nível raiz do body:
```json
{ "search": {...}, "credential": { "customer_key": "..." } }
```

Mas o exemplo oficial da Judit posiciona dentro de `search.search_params`:
```json
{ "search": { "search_type": "...", "search_key": "...", "search_params": { "credential": { "customer_key": "..." } } } }
```

Como a Judit espera a credencial dentro de `search_params`, o campo no nível raiz está sendo ignorado silenciosamente — por isso o tracking continua usando a credencial antiga (`111056/PR`) em vez de `alangeral`.

## Correção

1. **`judit-ativar-monitoramento-oab/index.ts`** — mover `credential` para dentro de `search.search_params`:
   ```ts
   const trackingPayload = {
     recurrence: 1,
     search: {
       search_type: 'lawsuit_cnj',
       search_key: numeroLimpo,
       ...(customerKey && { search_params: { credential: { customer_key: customerKey } } })
     },
     callback_url: webhookUrl,
     with_attachments: true,
   };
   ```
   (sem `notification_emails`, conforme pedido)

2. **Forçar recriação do tracking do processo `0044263-62.2025.8.16.0021`** para aplicar a credencial `alangeral`:
   - Deletar o tracking atual na Judit (`DELETE /tracking/{tracking_id}`) OU limpar `tracking_id` do registro `processos_oab` para o fluxo cair no branch de criação de novo tracking.
   - Recomendação: limpar `tracking_id` via SQL apenas desse processo específico (`dab8e0bb-b2f8-4f51-a69e-7012daa5f23b`) e clicar reativar no Vouti — assim cria novo tracking já com o payload corrigido.

3. **Aplicar mesma correção** em outras edge functions que criam tracking com credencial, se existirem (verificar `judit-ativar-monitoramento` e `judit-buscar-processo` durante implementação).

## Arquivos afetados

- `supabase/functions/judit-ativar-monitoramento-oab/index.ts` (payload)
- Possivelmente `supabase/functions/judit-ativar-monitoramento/index.ts` e `judit-buscar-processo/index.ts` (verificar e ajustar se também usam credential no root)
- Migração SQL pontual para limpar `tracking_id` do processo de teste

## Impacto

1. **Usuário final (UX):** nenhuma mudança visual. O dropdown de credencial continua igual; a diferença é que agora a credencial selecionada efetivamente passa a ser usada pela Judit.
2. **Dados:** apenas o `tracking_id` do processo de teste será limpo. Nenhuma migration estrutural, nenhuma RLS afetada.
3. **Riscos colaterais:**
   - Trackings já existentes continuam com a credencial antiga até serem recriados (resume não troca credencial). Novos trackings e recriações pegam o formato correto.
   - Se a Judit aceitar ambos os formatos, nada quebra. Se aceitar só o novo, comportamento melhora. Não há regressão esperada.
4. **Quem é afetado:** todos os tenants que dependem de credencial customizada para tribunais sigilosos (Solvenza em primeiro lugar). Tenants sem credencial (`customerKey` null) não são afetados — o `search_params` simplesmente não é adicionado.

## Validação

1. Após deploy, limpar `tracking_id` do processo `0044263-62.2025.8.16.0021`.
2. Reativar monitoramento no Vouti com `alangeral` selecionada.
3. Conferir log da edge `judit-ativar-monitoramento-oab` — payload enviado deve mostrar `search.search_params.credential.customer_key = "alangeral"`.
4. Conferir `judit_api_logs.request_payload` para o tracking criado.
5. Confirmar que a Judit responde 200 e que o novo `tracking_id` foi gravado.
