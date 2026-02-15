
## Ajuste de cores de fundo das faixas showcase

### Problema
As imagens das secoes showcase (Processos, Financeiro, Prazos) tem fundos embutidos que nao correspondem exatamente ao fundo da secao onde estao inseridas, criando um contraste visivel e pouco profissional.

### Solucao
Unificar o fundo de todas as secoes showcase para **branco puro (`bg-white` / `#ffffff`)**, removendo a alternancia entre `bg-gray-50` e `bg-white`. Tambem ajustar o `backgroundColor` inline das imagens para `transparent`, permitindo que o fundo da secao se aplique diretamente. Se as imagens ainda mostrarem bordas visiveis, adicionar um leve gradiente de fade nas bordas.

### Detalhes tecnicos

**Arquivo:** `src/pages/HomePage.tsx`

1. **Linha 427**: Remover a alternancia de fundo - trocar `${isEven ? 'bg-gray-50' : 'bg-white'}` por simplesmente `bg-white`
2. **Linha 441**: Remover o `style` condicional de `backgroundColor` das imagens, ou setar `backgroundColor: 'transparent'` para todas
3. Manter o `border-t border-gray-200` como separador visual entre as secoes
