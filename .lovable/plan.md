# Popular andamentos do processo 7000047 via GET /responses (sem custo)

## Causa raiz
O processo `13a9f104-b4aa-4078-8387-77f0d74c4bb9` (CNJ 7000047-89.2026.8.22.0021) está sem andamentos. O usuário forneceu o `request_id` válido: **`a72cf37c-599f-446c-8eac-ee1a575d00f8`**. Basta fazer GET `https://requests.prod.judit.io/responses?request_id=a72cf37c-599f-446c-8eac-ee1a575d00f8` (sem custo) e inserir os steps em `processos_oab_andamentos`.

## Correção

### Operação one-shot (executar agora)
Criar uma edge function temporária `judit-rebuscar-andamentos` que:
1. Recebe `{ processoOabId, requestIdOverride? }`.
2. Lê `processos_oab` para obter `tenant_id` e `detalhes_request_id`. Se `requestIdOverride` vier no body, usa ele e atualiza `detalhes_request_id` no processo.
3. Faz GET `/responses?request_id=<id>&page=1&page_size=100` com `JUDIT_API_KEY`.
4. Itera `page_data`, extrai `steps/movements/andamentos/history/last_steps` do primeiro item que tiver array não vazio.
5. Insere em `processos_oab_andamentos` com `(processo_oab_id, tenant_id, data_movimentacao, tipo_movimentacao, descricao, dados_completos, lida=false)` — ignora erro `23505` (índice único `idx_andamentos_unique_v3`).
6. Atualiza `processos_oab` com `parte_ativa/parte_passiva/tribunal/capa_completa` se a resposta agora vier com dados completos (caso a importação original tenha salvo só capa).
7. Loga em `judit_api_logs` com `tipo_chamada='lawsuit_cnj_refetch_responses'`, `custo_estimado=0`.

### Botão no UI já existente
Trocar `handleRebuscarAndamentosJudit` em `ProcessoOABDetalhes.tsx` para invocar `judit-rebuscar-andamentos` (sem custo) em vez do `judit-buscar-processo-cnj` (com custo). Mensagem do toast: "Andamentos atualizados — sem custo Judit".

### Reverter o ramo `processoOabIdExistente` em `judit-buscar-processo-cnj`
Remover o suporte que adicionei no turno anterior, devolvendo essa função ao papel original (apenas import com POST).

### Disparo imediato pra esse processo
Após a função estar publicada, invocá-la com:
```json
{ "processoOabId": "13a9f104-b4aa-4078-8387-77f0d74c4bb9", "requestIdOverride": "a72cf37c-599f-446c-8eac-ee1a575d00f8" }
```
para popular os andamentos do CNJ 7000047 agora.

## Arquivos afetados
- **Novo**: `supabase/functions/judit-rebuscar-andamentos/index.ts`
- **Editado**: `src/components/Controladoria/ProcessoOABDetalhes.tsx` (alvo da invoke + texto)
- **Editado (revert parcial)**: `supabase/functions/judit-buscar-processo-cnj/index.ts` (remover `processoOabIdExistente`)
- Sem migrations.

## Impacto
1. **Usuário final**: o processo 7000047 ganha seus andamentos sem nova cobrança Judit. Daniel passa a ter um botão "Re-buscar" gratuito para qualquer processo OAB já importado.
2. **Dados**: nenhum schema novo. Inserts em `processos_oab_andamentos` deduplicados pelo índice existente. `judit_api_logs` registra `custo_estimado=0` para auditoria.
3. **Riscos colaterais**: se a Judit já expirou o `response` no cache deles, o GET volta vazio — exibimos toast informativo, sem custo. O override de `request_id` é restrito a `podeEditarCredencial`.
4. **Quem é afetado**: somente Daniel (gate `EDIT_CREDENCIAL_EMAIL`). Importações novas continuam pagando 1 crédito normalmente em `judit-buscar-processo-cnj`.

## Validação
- Após rodar a invoke one-shot com o request_id `a72cf37c…`, conferir `SELECT count(*) FROM processos_oab_andamentos WHERE processo_oab_id='13a9f104-b4aa-4078-8387-77f0d74c4bb9'` > 0.
- `judit_api_logs` ganha 1 registro com `tipo_chamada='lawsuit_cnj_refetch_responses'` e `custo_estimado=0`.
- Abrir o processo na UI: aba de andamentos lista as movimentações.
- Re-clicar o botão: nenhuma duplicata criada.
