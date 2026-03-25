

# Corrigir barra de busca sumindo quando não encontra resultados

## Problema
Quando o usuário pesquisa um processo na aba Geral e nenhum resultado é encontrado, o componente faz um `return` antecipado (linha 423) que renderiza apenas a mensagem "Nenhum processo encontrado" — sem a barra de busca. O usuário fica preso sem poder buscar outro termo.

## Solução
Modificar a condição do early return na linha 423 de `GeralTab.tsx` para só mostrar o estado vazio genérico quando **não há busca ativa**. Quando houver `searchTerm` preenchido, renderizar a UI completa (com filtros e barra de busca) e mostrar uma mensagem contextual de "nenhum resultado para esta busca" na área de listagem.

## Alteração em `src/components/Controladoria/GeralTab.tsx`

1. **Linha 423**: Adicionar `&& !searchTerm` à condição do early return — só faz return antecipado se não há busca ativa
2. **Na área de listagem** (após as seções de instância): Adicionar um bloco condicional que, quando `processosFiltrados.length === 0` e não está carregando, mostra uma mensagem "Nenhum processo encontrado para esta busca" com opção de limpar a busca

