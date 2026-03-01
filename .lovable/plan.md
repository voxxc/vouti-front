

## Diagnóstico

### Busca não funciona
A barra de pesquisa filtra **apenas os 20 processos da página atual** (client-side), não busca no banco. Com paginação server-side, o termo digitado nunca encontra processos que estão em outras páginas. A busca precisa ser movida para o servidor.

### Paginação verbosa
Os controles de paginação atuais usam componentes `PaginationPrevious`/`PaginationNext` com texto "Previous"/"Next", duplicados em topo e rodapé.

---

## Plano

### 1. `src/hooks/useAllProcessosOAB.ts` — Busca server-side
- Adicionar estado `searchTerm` no hook
- Na query principal, quando `searchTerm` existir, adicionar `.or()` filtrando por `numero_cnj`, `parte_ativa`, `parte_passiva`, `tribunal_sigla`
- Incluir `searchTerm` nas dependências do `fetchProcessos`
- Expor `searchTerm` e `setSearchTerm` no retorno do hook

### 2. `src/components/Controladoria/GeralTab.tsx` — Busca + paginação minimalista
- Remover o filtro local `termoBusca` e usar `searchTerm`/`setSearchTerm` do hook
- Aplicar debounce de ~400ms antes de setar o termo (evitar queries a cada tecla)
- Substituir os dois blocos de paginação por **um único controle minimalista acima do filtro**: apenas `← Página 1 de 5 (100 processos) →` com ícones de seta
- Remover a paginação do rodapé

