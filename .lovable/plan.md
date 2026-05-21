# Banco de IDs — simplificação e paginação

## Objetivo
Reduzir o diálogo de Banco de IDs (`TenantBancoIdsDialog`) a 4 abas focadas em monitoramento e adicionar busca + paginação client-side (20 por página) em cada aba para evitar carregar listas gigantes de uma vez na UI.

## Abas finais
1. **Trackings ON** — processos com `tracking_id` e `tracking_ativo = true`.
2. **Trackings OFF** — processos com `tracking_id` mas inativo / desativado.
3. **OABs** — registros `tipo = 'oab'`.
4. **Push-docs** — documentos monitorados via `push_docs_cadastrados` (CPF/CNPJ/OAB) com status ≠ `deletado`.

Removidas: **Processos (consolidado)**, **Requests CNJ** e **Histórico**.

## Comportamento de cada aba
- Campo de busca no topo do dialog (mantido) filtra por CNJ, Tracking ID, OAB ou documento, conforme a aba ativa.
- Paginação: 20 itens por página, com controles `Anterior / Próxima` + indicador `Página X de Y` e contagem total filtrada.
- Ao trocar de aba ou alterar a busca, volta para a página 1.
- Estado vazio amigável em cada aba.

## Dados
- Trackings ON/OFF e OABs continuam derivados de `tenant_banco_ids` (já carregado via `fetchAllPaginated`).
- Push-docs: nova busca paralela em `push_docs_cadastrados` por `tenant_id`, filtrando `tracking_status != 'deletado'`. Mostrar: documento, tipo (CPF/CNPJ/OAB), descrição, status (ativo/pausado/pendente/erro), `tracking_id` (com botão copiar), total de processos recebidos.

## Arquivos afetados
- `src/components/SuperAdmin/TenantBancoIdsDialog.tsx` — remove abas, adiciona paginação e nova aba Push-docs.

## Impacto
1. **UX**: dialog mais limpo, foco em monitoramento. Listas grandes (ex.: SOLVENZA com 14k registros) deixam de travar a renderização — apenas 20 itens por vez no DOM.
2. **Dados**: nenhuma migration; consulta extra leve em `push_docs_cadastrados`. PDF de exportação continua exportando o universo completo de processos com tracking/request (não muda).
3. **Riscos**: perda da visão histórica diária no dialog — quem precisar auditar o log bruto de `tenant_banco_ids` terá que consultar via SQL direto. Como combinado, o histórico não é prioritário agora.
4. **Afetados**: somente Super-Admin.

## Validação
- Abrir Banco de IDs em um tenant pequeno: confirmar 4 abas, contadores corretos, busca filtrando, paginação 20/pg.
- Abrir em SOLVENZA: confirmar que o dialog abre rápido e a navegação entre páginas é instantânea.
- Push-docs: comparar contagem com a aba dedicada de Push-docs do tenant.
