## Causa raiz
Hoje os 4 endpoints da Judit (`judit-webhook`, `judit-webhook-oab`, `judit-webhook-cnpj`, `judit-webhook-push-docs`) aceitam toda requisição que chega e processam (insert de andamentos, atualização de processos etc.). Não existe kill-switch — para parar de receber, a única opção atual seria desfazer o cadastro do webhook na Judit ou deletar as functions.

## Correção
Adicionar um kill-switch via secret de runtime, sem deploy futuro para ligar/desligar:

- Criar o secret `JUDIT_WEBHOOKS_ENABLED` (default tratado como `"false"` quando ausente). Valores aceitos: `"true"` libera o processamento; qualquer outra coisa (`"false"`, vazio) faz as functions responderem `200 OK` mas descartarem o payload.
- No início de cada uma das 4 functions, logo após o handler de CORS/OPTIONS, ler `Deno.env.get('JUDIT_WEBHOOKS_ENABLED')`. Se diferente de `"true"`:
  - Logar `console.info('[judit-webhook*] paused — payload descartado')` (sem PII).
  - Retornar `new Response(JSON.stringify({ ok: true, paused: true }), { status: 200, ... })`.
  - Por que 200 e não 4xx/5xx? Para a Judit não acumular retries nem marcar o endpoint como morto. Quando você reativar, ela volta a entregar normalmente os próximos eventos.

Inicialização: vou criar o secret já com valor `"false"` (pausado), conforme você pediu. Para reativar depois, basta me avisar e eu rodo `update_secret` para `"true"`.

## Arquivos afetados
- `supabase/functions/judit-webhook/index.ts`
- `supabase/functions/judit-webhook-oab/index.ts`
- `supabase/functions/judit-webhook-cnpj/index.ts`
- `supabase/functions/judit-webhook-push-docs/index.ts`

Em cada um: ~6 linhas no topo do handler. Sem migration, sem mudança de RLS, sem mudança no frontend.

Secret novo:
- `JUDIT_WEBHOOKS_ENABLED` = `"false"` (criado já pausado)

## Impacto
1. **Usuário final (UX):** Nenhuma mudança visível. Os processos simplesmente param de receber andamentos/atualizações automáticas vindas da Judit enquanto o switch estiver pausado. Sincronizações manuais (botões "Sincronizar", buscas sob demanda) continuam funcionando normalmente — elas não passam por webhook.
2. **Dados:** Nada é gravado enquanto pausado. Sem mudanças de schema, RLS ou performance. Eventos que a Judit tentar entregar durante a pausa **serão perdidos** — ela recebe 200 e não reenvia. Para recuperar o histórico do período, será preciso uma sincronização manual (ex.: `judit-sync-monitorados`) depois de reativar.
3. **Riscos colaterais:**
   - Push-docs (publicações) também ficam pausados — confirme se isso é aceitável; se não for, removo do escopo.
   - Andamentos novos não vão notificar usuários nem disparar prazos automáticos durante a pausa.
   - Logs vão mostrar "paused" em todas as entregas — útil para auditar tentativas.
4. **Quem é afetado:** Todos os tenants que dependem do monitoramento Judit (processos, OAB, CNPJ, push-docs). É um switch global.

## Validação
- Após o deploy, chamar `judit-webhook` com `supabase--curl_edge_functions` enviando um payload qualquer → deve retornar `{ ok: true, paused: true }` em 200.
- Conferir `edge_function_logs` mostrando "paused — payload descartado".
- Verificar que nenhum `INSERT` novo aparece em `processos_oab_andamentos` / `processo_movimentacoes` originado de webhook.
- Quando você pedir para religar, eu atualizo o secret para `"true"` e refaço o teste para confirmar que o processamento normal voltou.
