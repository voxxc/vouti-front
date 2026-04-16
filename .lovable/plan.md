
Objetivo: corrigir de vez a navegação por seta na busca rápida do `/solvenza/dashboard`.

Diagnóstico
- O componente correto dessa tela é `src/components/Search/ProjectQuickSearch.tsx`.
- Ele já tem `onKeyDown` e `highlightedIndex`, então o problema não é mais “falta de listener”.
- O defeito restante está na combinação atual:
  - o input é um `<Input>` separado
  - os resultados são renderizados com `Command / CommandItem` (`cmdk`)
- Assim, o teclado está sendo tratado manualmente, mas o visual/seleção ainda depende do `cmdk`, que controla o estado selecionado internamente. Isso deixa a seta sem efeito visível ou inconsistente.
- A captura mostra exatamente esse sintoma: o primeiro item continua “preso” como selecionado.

O que vou ajustar
1. Remover a dependência de `CommandItem` dentro de `ProjectQuickSearch`
   - manter o portal/dropdown atual
   - trocar os itens por linhas renderizadas manualmente (`div`/`button`)
   - aplicar destaque via `className` usando `highlightedIndex`, sem depender de `data-selected` do `cmdk`

2. Manter a navegação 100% controlada pelo componente
   - `ArrowDown` avança
   - `ArrowUp` volta
   - `Enter` seleciona o item destacado
   - `Escape` fecha e limpa
   - resetar índice ao mudar o termo

3. Continuar usando uma lista unificada de resultados
   - projetos + protocolos em uma única sequência navegável
   - mouse hover sincroniza com o mesmo índice do teclado

4. Garantir usabilidade no dropdown
   - se necessário, adicionar `scrollIntoView` no item ativo para a seta continuar funcionando mesmo com lista maior

5. Alinhar comportamento com a outra busca rápida
   - revisar `src/components/WhatsApp/components/CRMQuickSearch.tsx` para evitar novo desencontro entre buscas parecidas

Arquivos
- `src/components/Search/ProjectQuickSearch.tsx`
- se necessário para consistência: `src/components/WhatsApp/components/CRMQuickSearch.tsx`

Validação
- digitar um nome e usar seta para baixo/cima
- confirmar que o destaque realmente muda de item
- pressionar Enter e abrir o projeto/protocolo correto
- testar:
  - só projetos
  - só protocolos
  - mistura dos dois
  - 0 resultados
  - interação alternando mouse + teclado

Detalhe técnico
- A correção mais segura não é “mexer mais no `data-selected`”.
- A correção segura é parar de misturar input externo com seleção interna do `cmdk` nesse componente e deixar toda a navegação explícita no React.
