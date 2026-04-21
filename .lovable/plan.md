

## Teclas Home/End: navegar até início/fim da linha visual

### Causa raiz
O `contentEditable` do editor `Vouti.docs` deixa as teclas **Home** e **End** com o comportamento padrão do navegador, que dentro de um bloco grande pode pular para o início/fim do **bloco inteiro** (parágrafo) em vez do **início/fim da linha visual** onde o cursor está — comportamento diferente do Word.

### Correção

Em `src/components/Documentos/DocumentoEditor.tsx`, estender o handler `onKeyDown` já existente (que cobre Tab/Shift+Tab) para tratar `Home` e `End` nas três zonas editáveis (corpo, cabeçalho, rodapé):

1. **End** (sem modificadores) → `e.preventDefault()` + mover cursor para o fim da linha visual:
   - Usar `selection.modify("move", "forward", "lineboundary")` (API nativa `Selection.modify`, suportada em Chrome/Edge/Safari).

2. **Home** (sem modificadores) → `e.preventDefault()` + mover para o início da linha visual:
   - Usar `selection.modify("move", "backward", "lineboundary")`.

3. **Shift+End / Shift+Home** → idem, mas com `"extend"` em vez de `"move"`, para permitir seleção até o fim/início da linha (comportamento Word).

4. **Ctrl+Home / Ctrl+End** → não interceptar, deixa o navegador levar ao topo/fim do documento (padrão Word também).

5. Fallback: se `selection.modify` não existir (browsers antigos), não chamar `preventDefault` — deixa o navegador fazer o padrão.

### Arquivos afetados

**Modificados:**
- `src/components/Documentos/DocumentoEditor.tsx` — adicionar branches `Home` e `End` no `handleKeyDown` existente das três zonas editáveis.

**Sem mudanças:** banco, RLS, exportação PDF, toolbar, hooks, paginação.

### Impacto

**Usuário final (UX):**
- **End** → cursor pula para o fim da linha visual atual (não do parágrafo inteiro).
- **Home** → cursor pula para o início da linha visual atual.
- **Shift+End / Shift+Home** → seleciona texto da posição atual até o fim/início da linha.
- **Ctrl+End / Ctrl+Home** → continua indo ao fim/topo do documento (padrão preservado).
- Comportamento idêntico ao Word/Google Docs.

**Dados:** nenhum — apenas movimento de cursor, sem alterar o HTML.

**Riscos colaterais:**
- `Selection.modify` não está em todos os browsers exóticos, mas tem suporte amplo em Chrome/Edge/Safari/Firefox modernos. O fallback (não interceptar) garante que nada quebra em browsers sem suporte.
- Nenhum impacto em copy/paste, undo/redo ou paginação.

**Quem é afetado:** apenas usuários do editor `/documentos/:id` (todos os tenants). Sem efeito em outras telas.

### Validação

1. Abrir `/solvenza/documentos/1a5ef4e5...`, posicionar cursor no meio de um parágrafo longo que ocupa várias linhas visuais.
2. Apertar **End** → cursor vai ao fim da linha visual atual (não do parágrafo).
3. Apertar **Home** → cursor volta ao início dessa mesma linha visual.
4. **Shift+End** → seleciona da posição atual até o fim da linha; **Shift+Home** seleciona até o início.
5. **Ctrl+End** → vai para o fim do documento; **Ctrl+Home** → vai para o topo.
6. Repetir os testes no cabeçalho e no rodapé — mesmo comportamento.
7. Tab/Shift+Tab continuam funcionando normalmente (sem regressão).
8. Fora do editor (toolbar, painel lateral) → Home/End mantêm comportamento padrão dos inputs.

