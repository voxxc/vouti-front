# Publicações de monitoramento sumindo no filtro de período

## Causa raiz
Publicações vindas do monitoramento (`origem='monitoramento_processo'`) recebem `data_disponibilizacao` igual à data real do andamento no tribunal — que pode ser de meses atrás. O filtro padrão "7 dias" no drawer usa essa data e descarta todas, mesmo tendo sido criadas hoje. KPI "Pendentes total" continua mostrando 20 porque não filtra por período.

## Correção
No filtro de período em `PublicacoesDrawer.tsx`:

- Para publicações de **monitoramento**, comparar o período contra `created_at` (quando entrou no Vouti) em vez de `data_disponibilizacao` (data do andamento no tribunal).
- Para publicações de **DJEN/scraper**, manter `data_disponibilizacao` (comportamento atual).
- No card de monitoramento, exibir badge `dd/MM` com a data do andamento + tempo relativo de `created_at` ("há 2 min"), deixando claro qual data é qual.

Sem mudança no banco. Sem mudança nas Edge Functions.

## Arquivos afetados
- `src/components/Publicacoes/PublicacoesDrawer.tsx` — ajustar o `filter` de período e o cabeçalho do card de monitoramento.

## Impacto
- **Usuário final:** as 20 publicações do teste passam a aparecer imediatamente no filtro "7 dias" (default). Comportamento das publicações DJEN não muda.
- **Dados:** nenhum. Sem migration, sem RLS, sem reprocessamento.
- **Riscos:** baixos. Se uma publicação de monitoramento for antiga mas só importada agora, ela aparece como "nova" — o que é o comportamento desejado (é nova para o escritório).
- **Quem é afetado:** todos os tenants que usam monitoramento (hoje só demorais em teste).

## Validação
1. Abrir Publicações no tenant demorais com filtro "7 dias" → ver os 20 cards.
2. Trocar para "Hoje" → continuam visíveis (foram criadas hoje).
3. Trocar para "Tudo" → continuam visíveis.
4. Confirmar que cards mostram a data do andamento + "há X min".
