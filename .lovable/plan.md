# Banco de IDs — adicionar aba Requests CNJ

## Correção
Adicionar 5ª aba **Requests CNJ** ao `TenantBancoIdsDialog`, listando processos com `request_id` (importações via CNJ na Judit). Mantém busca por CNJ/Request ID e paginação de 20/página, alinhado às demais abas.

Ordem final das abas:
1. Trackings ON
2. Trackings OFF
3. **Requests CNJ** (nova)
4. OABs
5. Push-docs

## Arquivos afetados
- `src/components/SuperAdmin/TenantBancoIdsDialog.tsx` — adiciona tab trigger, lista derivada `requestsCnj`, renderização do item com CNJ + tribunal + Request ID copiável; atualiza `grid-cols-4` → `grid-cols-5`.

## Impacto
1. **UX**: Super-Admin recupera visão dos Request IDs gerados por importação CNJ, sem reintroduzir o histórico bruto.
2. **Dados**: nenhuma migration; usa o mesmo `processosAgg` já derivado de `tenant_banco_ids`.
3. **Riscos**: nenhum — apenas leitura/filtro adicional client-side.
4. **Afetados**: somente Super-Admin.

## Validação
- Abrir Banco de IDs em SOLVENZA: confirmar contagem em Requests CNJ, busca por CNJ e paginação 20/pg.
- Verificar que itens sem `request_id` não aparecem na aba.
