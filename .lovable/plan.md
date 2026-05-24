# Falha em "Migrar próximo lote" — `judit-migrar-trackings-attachments`

## Causa raiz
O toast retornou **"Failed to send a request to the Edge Function"** e, ao consultar `supabase--edge_function_logs`, **não há nenhum log** dessa função (nem boot, nem shutdown). Isso significa que a Edge Function **nunca subiu** com sucesso na infra. Dois fatores suspeitos no `index.ts` atual:

1. Usa `https://deno.land/std@0.168.0/http/server.ts` e `https://esm.sh/@supabase/supabase-js@2.7.1` — combinação que costuma falhar em deploy novo da Lovable (veja `edge-function-deploy-errors` no guia: preferir `npm:` specifiers).
2. CORS declarado manualmente sem `Access-Control-Allow-Methods` — bloqueia o preflight em alguns navegadores.

Resultado: o invoke do front nem chega no runtime → "Failed to send request".

## Correção
1. Reescrever `supabase/functions/judit-migrar-trackings-attachments/index.ts` mantendo **toda a lógica de negócio igual** (OAB + CNPJ, batchSize, dryRun, tenantId, gravação em `judit_migracao_attachments`, `processo_monitoramento_audit`), apenas trocando:
   - `serve` → `Deno.serve` nativo.
   - `https://esm.sh/...` → `npm:@supabase/supabase-js@2`.
   - CORS via `npm:@supabase/supabase-js@2/cors` + `Allow-Methods`.
   - `try/catch` global devolvendo JSON com status 500 + corsHeaders (hoje qualquer throw mata o response sem CORS).
2. Forçar redeploy via `supabase--deploy_edge_functions(["judit-migrar-trackings-attachments"])` e validar com `supabase--curl_edge_functions` enviando `{ dryRun: true, batchSize: 1, tipo: "all" }` para confirmar boot.
3. Conferir logs (`supabase--edge_function_logs`) — esperar ver "booted" + execução.

## Arquivos afetados
- `supabase/functions/judit-migrar-trackings-attachments/index.ts` (reescrita técnica, mesma API e mesmo contrato com a UI).

Nenhuma mudança em UI, hooks, RPC ou banco. `SuperAdminMigracaoAnexos.tsx` e `useMigracaoAnexos.ts` continuam idênticos.

## Impacto
- **Usuário final (Super-Admin):** o botão "Migrar próximo lote" (global e por tenant — incluindo Solvenza) volta a funcionar com lote 5/10/25/50/100. Simular (dryRun) também volta.
- **Dados:** nenhuma migration. O fluxo aditivo continua igual — cria novo tracking com `with_attachments:true`, grava em `judit_migracao_attachments` e `processo_monitoramento_audit`, depois pausa o tracking antigo. Sem perda de andamentos.
- **Riscos colaterais:** baixos. Reescrita é equivalente; o invoke já existe no front. Custo Judit por tracking recriado segue o mesmo (1 por processo migrado).
- **Quem é afetado:** somente Super-Admin (UI restrita). Tenants não veem mudança no app deles até que andamentos novos comecem a chegar com anexos.

## Validação
1. `curl_edge_functions` com `dryRun:true` → resposta 200 com `processados>0, migrados=0`.
2. `curl_edge_functions` com `dryRun:false, batchSize:1, tenantId: Solvenza` → 1 tracking migrado, linha em `judit_migracao_attachments` com `status='migrado'` e `tracking_id_novo`.
3. Recarregar a aba Super-Admin → contador "Trackings OAB X/Y" sobe em 1, card Solvenza desce 1 pendente.
4. Repetir no lote de 5 que o usuário tentou e confirmar 5 migrados sem erro.
