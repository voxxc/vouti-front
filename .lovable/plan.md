

## Ajustes Mobile: Botoes e Badges Flutuantes

### 1. Botoes mais minimalistas no mobile

Os botoes "Solicitar Demonstracao" e "Ver Modulos" (linhas 306-320) atualmente usam `text-base px-8 py-6` em todos os tamanhos. No mobile, serao reduzidos:

**Arquivo:** `src/pages/HomePage.tsx`

- "Solicitar Demonstracao": trocar classes para `text-sm px-5 py-3 sm:text-base sm:px-8 sm:py-6` e reduzir o icone da seta
- "Ver Modulos": mesma reducao `text-sm px-5 py-3 sm:text-base sm:px-8 sm:py-6`
- Resultado: botoes compactos e discretos no mobile, tamanho normal no desktop

### 2. Badges flutuantes visiveis no mobile

Atualmente todos os badges (Prazos, Processos, WhatsApp, etc.) usam `hidden lg:flex`, ficando invisiveis no mobile. A mudanca:

- Trocar `hidden lg:flex` por `flex` em todos os 8 badges (linhas 326-380)
- Reduzir tamanho no mobile: `px-2.5 py-1.5 sm:px-4 sm:py-2.5`, icones `w-3.5 h-3.5 sm:w-5 sm:h-5`, texto `text-xs sm:text-sm`
- Reposicionar para mobile: usar posicoes relativas menores (ex: `-top-2 -left-2` em vez de `-top-4 -left-4`) para caber na tela menor sem sair dos limites
- Adicionar `overflow-hidden` no container pai para evitar scroll horizontal

### Detalhes tecnicos

**Arquivo:** `src/pages/HomePage.tsx`

1. **Linhas 306-320**: Ajustar classes dos 2 botoes para responsividade mobile-first
2. **Linhas 326-380**: Em cada badge:
   - Remover `hidden lg:flex`, substituir por `flex`
   - Adicionar classes responsivas para padding, icone e texto
   - Ajustar posicoes absolutas com prefixos `sm:` e `lg:` para cada breakpoint
3. **Linha 324**: Adicionar `overflow-hidden` ao container `relative` dos badges para conter no mobile

