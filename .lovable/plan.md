

## Tab dentro do editor: indentar texto em vez de mover foco

### Causa raiz
O `contentEditable` do `Vouti.docs` não intercepta a tecla **Tab**. O comportamento padrão do navegador toma conta e move o foco para o próximo elemento focável da página (botões da toolbar, painel lateral, etc.) — em vez de indentar o parágrafo, como o Word faz.

### Correção

Em `src/components/Documentos/DocumentoEditor.tsx`, adicionar tratamento de `Tab` no `onKeyDown` do corpo (`bodyRef`), e também das zonas `header` e `footer`:

1. **Tab** → `e.preventDefault()` + inserir indentação:
   - Se o cursor estiver dentro de um item de lista (`<li>`): chamar `document.execCommand("indent")` — aumenta o nível da lista (comportamento Word).
   - Caso contrário: inserir um espaçamento horizontal de ~4 espaços usando `document.execCommand("insertHTML", false, '<span style="display:inline-block;width:2.5em"></span>')`. Isso emula o "tab stop" do Word sem depender de `\t` (que o HTML colapsa).

2. **Shift+Tab** → `e.preventDefault()` + remover indentação:
   - Em listas: `document.execCommand("outdent")`.
   - Fora de listas: tentar remover o último `<span>` de indentação imediatamente antes do cursor (se existir); senão, no-op.

3. Disparar `onChange` do corpo após a operação para que o estado e a paginação sejam recalculados.

4. Garantir que o handler **só intercepta** quando o foco está dentro de uma das zonas editáveis — fora delas (toolbar, painel), Tab continua navegando normalmente.

### Arquivos afetados

**Modificados:**
- `src/components/Documentos/DocumentoEditor.tsx` — handler `onKeyDown` para Tab/Shift+Tab nas três zonas editáveis (corpo, cabeçalho, rodapé).

**Sem mudanças:** banco, RLS, exportação PDF, toolbar, hooks.

### Impacto

**Usuário final (UX):**
- Apertar **Tab** dentro da página branca agora indenta o parágrafo em ~2,5em (≈4 caracteres), igual ao Word — não rouba mais o foco para a toolbar.
- Em listas, Tab aumenta o nível (sub-item) e Shift+Tab volta um nível, comportamento idêntico ao Word/Google Docs.
- **Shift+Tab** desfaz a indentação.
- Acessibilidade: para sair do editor com teclado, o usuário usa **Esc** seguido de Tab (padrão de editores ricos), ou clica fora.

**Dados:**
- Indentação é salva como `<span style="display:inline-block;width:2.5em"></span>` dentro do HTML — renderiza idêntico no editor, no preview, no PDF e em qualquer documento copiado/colado.
- Sem migração, sem mudança de schema.

**Riscos colaterais:**
- Usuários acostumados a usar Tab para navegar entre campos podem estranhar inicialmente — mitigado por ser o padrão universal de editores de texto rico.
- Span vazio é inerte e não afeta seleção de texto.

**Quem é afetado:**
- Apenas usuários do editor `/documentos/:id` (qualquer tenant). Sem impacto em outras telas.

### Validação

1. Abrir `/solvenza/documentos/novo`, clicar no corpo da folha.
2. Apertar **Tab** → o cursor recua ~2,5em na linha atual; foco permanece no editor.
3. Apertar **Tab** novamente → recua mais 2,5em (acumula).
4. Apertar **Shift+Tab** → remove a última indentação.
5. Criar uma lista com bullets, apertar **Tab** dentro de um item → vira sub-item; **Shift+Tab** → volta ao nível anterior.
6. Apertar Tab dentro do cabeçalho/rodapé → mesma indentação.
7. Salvar, recarregar, exportar PDF → indentação preservada.
8. Fora do editor (botões da toolbar, painel lateral) → Tab continua navegando entre elementos normalmente.

