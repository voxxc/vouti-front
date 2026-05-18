# Paginação na aba "Andamentos Não Lidos"

## Causa raiz
A aba lista todos os processos com andamentos não lidos numa única tabela rolável. Em tenants grandes (ex.: Solvenza) isso gera centenas de linhas e dificulta a navegação. A aba OABs já segue um padrão de 20 itens por página com controle de paginação — adotar o mesmo aqui.

## Correção
1. Em `CentralAndamentosNaoLidos.tsx`, adicionar estado `currentPage` (default 1) e constante `ITEMS_PER_PAGE = 20`.
2. Calcular `paginatedProcessos = filteredProcessos.slice((currentPage-1)*20, currentPage*20)` e renderizar somente esse slice na tabela.
3. Resetar `currentPage` para 1 sempre que `searchTerm` ou `filterOabId` mudarem (via `useEffect`).
4. Renderizar abaixo da tabela um rodapé com:
   - texto "Mostrando X–Y de Z processos"
   - componentes `Pagination` / `PaginationContent` / `PaginationPrevious` / `PaginationNext` / `PaginationLink` (já existentes em `src/components/ui/pagination.tsx`)
   - lógica de páginas visíveis igual à da aba OABs (primeira, última, atual ± 1, ellipsis).
5. Esconder o rodapé quando `filteredProcessos.length <= 20`.

## Arquivos afetados
- `src/components/Controladoria/CentralAndamentosNaoLidos.tsx` (único arquivo).

## Impacto
- **Usuário final**: a aba "Não Lidos" passa a exibir 20 processos por página com navegador inferior, igual à aba OABs. Busca e filtro de OAB continuam funcionando e voltam para a página 1 ao mudar. Botões "Ler Todos" (global) e "Marcar como lido" (por processo) continuam idênticos — "Ler Todos" segue afetando todos os processos filtrados, não só a página visível.
- **Dados**: nenhum. Sem migration, sem RLS, sem nova query. Paginação 100% client-side sobre o array já carregado pelo hook `useAndamentosNaoLidosGlobal`.
- **Riscos colaterais**: nenhum esperado. O hook e o badge de contagem global no `CentralControladoria` não mudam.
- **Quem é afetado**: todos os tenants que usam Controladoria → Central → Não Lidos.

## Validação
- Abrir Solvenza → Controladoria → Central → Andamentos Não Lidos: ver no máximo 20 linhas, rodapé "Mostrando 1–20 de N", navegar entre páginas.
- Digitar no campo de busca / trocar filtro de OAB: a paginação volta para página 1.
- Tenant pequeno (≤20 processos não lidos): rodapé não aparece.
- Clicar "Ler Todos": continua marcando todos os filtrados (não só a página visível).
