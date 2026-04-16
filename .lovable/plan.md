
Objetivo: corrigir a busca rápida que você está usando agora no `/dashboard`, porque ela não é a do CRM.

Diagnóstico
- A seta não funciona aí porque essa tela usa `src/components/Search/ProjectQuickSearch.tsx`.
- O ajuste anterior foi feito em `src/components/WhatsApp/components/CRMQuickSearch.tsx`, que é outra busca.
- Em `ProjectQuickSearch`, o input está fora do fluxo de navegação do `cmdk`, então as setas não controlam os resultados.

O que vou ajustar
1. Implementar navegação por teclado em `src/components/Search/ProjectQuickSearch.tsx`
   - `ArrowDown` desce
   - `ArrowUp` sobe
   - `Enter` seleciona o item destacado
   - `Escape` fecha a lista
2. Criar um índice destacado controlado manualmente
   - resetar ao mudar o texto
   - respeitar a lista combinada de resultados visíveis
3. Dar destaque visual real ao item ativo
   - mesmo padrão visual de hover/seleção
4. Garantir que o foco permaneça no input
   - sem depender da navegação nativa do `Command`

Abordagem
- Unificar os resultados visíveis de projetos + protocolos em uma lista navegável
- Controlar o item ativo via estado (`highlightedIndex`)
- Adicionar `onKeyDown` no input da busca
- Mapear clique e Enter para a mesma lógica de seleção
- Manter o dropdown atual, mas sem depender do comportamento implícito do `cmdk`

Arquivos
- `src/components/Search/ProjectQuickSearch.tsx`
- Se necessário para consistência visual/comportamental, também alinhar `src/components/WhatsApp/components/CRMQuickSearch.tsx`

Validação
- Digitar 1 termo e usar seta para baixo/cima
- Confirmar que o destaque anda item por item
- Pressionar Enter e abrir o projeto/protocolo correto
- Testar com:
  - só projetos
  - só protocolos
  - mistura dos dois
  - 0 resultados
  - mouse + teclado no mesmo fluxo

Detalhes técnicos
- O problema não é o input em si; é que a busca do dashboard ainda está em outro componente.
- Para evitar novo desencontro, vou deixar a lógica de teclado explícita e controlada no próprio componente, em vez de confiar no `Command` com input separado.
