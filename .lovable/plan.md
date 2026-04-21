

## Texto vazando sobre rodapé/cabeçalho entre páginas — corrigir paginação real

### Causa raiz
O corpo do editor é **um único `contentEditable` longo** com apenas `paddingTop` (espaço do cabeçalho da página 1) e `paddingBottom` (espaço do rodapé da última página). Entre as páginas, **não existe nenhum espaço reservado** — o texto continua fluindo livremente e passa por baixo das faixas opacas de rodapé/cabeçalho/logo das páginas intermediárias.

Visualmente: a "folha A4" é só uma moldura desenhada por cima; o editor não respeita essa moldura. Por isso na imagem aparecem palavras (`aSD`, `AS`, `dAS`, `dA`, `sDa`...) escondidas dentro do retângulo vermelho — elas estão lá no DOM, mas **atrás** da faixa branca do rodapé/cabeçalho com a logo do escritório.

O `recalcPages` calcula corretamente quantas páginas precisam, mas só serve para desenhar mais molduras — não cria espaço real no fluxo do texto.

### Correção

**Estratégia: espaçadores não-editáveis injetados automaticamente no corpo entre as "páginas virtuais".**

Em `src/components/Documentos/DocumentoEditor.tsx`:

1. **Após cada mudança no corpo** (e quando `headerH`/`footerH` mudam), executar uma função `injectPageSpacers()` que:
   - Mede o `bodyRef.scrollHeight` real, descontando os espaçadores existentes.
   - Calcula quantas quebras visuais são necessárias: `Math.ceil(usefulHeight / BODY_H) - 1`.
   - Remove todos os espaçadores antigos (`[data-page-spacer="true"]`).
   - Para cada quebra `i`, encontra a posição vertical `i * BODY_H` dentro do corpo, identifica qual nó/elemento está atravessando essa linha, e **insere um `<div data-page-spacer="true" contenteditable="false" style="height: ${INTER_PAGE_BAND}px; ...">`** logo antes desse nó.
   - O espaçador empurra o conteúdo seguinte para baixo da faixa rodapé+gap+cabeçalho da próxima folha — exatamente onde a área útil da página seguinte começa.

2. **Posicionamento preciso do espaçador**: usar `document.elementFromPoint()` ou iterar pelos filhos do `bodyRef` e medir `getBoundingClientRect()` de cada um para achar o primeiro elemento cujo `offsetTop` ultrapasse o limite da página atual. Inserir o espaçador antes desse elemento.

3. **Quebras manuais (`data-page-break`) já no HTML**: respeitar a posição delas — se uma quebra manual cai antes do limite calculado, ela conta como início da próxima página e o cálculo continua a partir dela.

4. **Preservar a posição do cursor**: salvar `Selection`/`Range` antes de mexer no DOM, e restaurar depois (offsets em relação ao texto, não ao DOM, porque inserir/remover espaçadores invalida nós).

5. **Marcar espaçadores como invisíveis ao usuário**: `user-select: none`, sem borda, fundo transparente, mas ocupando `INTER_PAGE_BAND` px de altura. Isso faz o texto da próxima "página" começar na posição certa.

6. **`onChange` ignora os espaçadores**: ao serializar `bodyRef.innerHTML` para o estado/banco, **remover** todos os `[data-page-spacer="true"]` antes de enviar. Eles são puramente visuais — recalculados em cada montagem. Isso garante que ao reabrir o documento ou exportar PDF, o HTML salvo continue limpo.

7. **`recalcPages` agora reflete o número real de páginas geradas pelos espaçadores** (não mais um cálculo paralelo).

### Arquivos afetados

**Modificados:**
- `src/components/Documentos/DocumentoEditor.tsx` — função `injectPageSpacers()` chamada após `onInput`, mudança de `headerH`/`footerH`, e injeção inicial de HTML; sanitização do `onChange` para remover espaçadores antes de propagar; preservação de cursor durante reflow.

**Sem mudanças:** banco, RLS, tipos, hooks, exportação PDF (já lê `data-page-break`; espaçadores não são salvos no banco).

### Impacto

**Usuário final (UX):**
- Ao digitar muito texto, ele agora **respeita** a área útil de cada página: ao chegar perto do rodapé da página 1, automaticamente "salta" para depois da faixa do cabeçalho da página 2. Nada mais fica escondido atrás da logo.
- A ilusão de páginas A4 distintas fica completa, idêntica ao Word.
- Cursor não "pula" inesperadamente: posição preservada durante o reflow.
- Quebras manuais (`Ctrl+Enter`) continuam funcionando.

**Dados:**
- HTML salvo no banco continua **sem** os espaçadores (sanitizado no `onChange`). Documentos antigos não mudam.
- PDF export continua igual: jsPDF já gera páginas reais conforme texto cabe.

**Riscos colaterais:**
- Inserção/remoção repetida de DOM nodes pode piscar visualmente — mitigado com `requestAnimationFrame` + `ResizeObserver` debounce de 50ms.
- Cursor pode pular 1-2 caracteres em casos extremos (texto muito longo na borda da página); aceitável e raro.
- Imagens muito altas no corpo (>BODY_H) ainda podem ficar cortadas — caso de borda, fora do escopo.

**Quem é afetado:**
- Apenas usuários do editor `/documentos/:id`. Sem impacto em listagens, modelos antigos ou outros tenants.

### Validação

1. Abrir `/demorais/documentos/novo`, adicionar logo no cabeçalho.
2. Digitar várias linhas até gerar página 2 — texto da página 1 termina **antes** da faixa do rodapé; texto da página 2 começa **depois** da faixa do cabeçalho com a logo. Nada escondido.
3. Continuar digitando até gerar página 3 e 4 — mesmo comportamento em todas.
4. Cursor permanece visível durante a digitação, sem saltos bruscos.
5. Salvar, recarregar — espaçadores são recalculados; HTML salvo no banco está limpo (sem `data-page-spacer`).
6. Exportar PDF — paginação real do jsPDF, idêntica à visualização.
7. `Ctrl+Enter` no meio do texto → quebra manual continua funcionando.
8. Aumentar a altura do cabeçalho (colar logo maior) → espaçadores se ajustam, texto se reorganiza.
9. Apagar texto até voltar a 1 página → espaçadores desaparecem, fica só o corpo limpo.
10. Modo Preview com cliente vinculado → variáveis substituídas, paginação preservada.

