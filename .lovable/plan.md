

## Paginação real estilo Word — folhas A4 distintas com cabeçalho/rodapé repetidos

### Causa raiz
Hoje o `DocumentoEditor` renderiza **uma única "folha" infinita** (`minHeight: 1123px`) — quando o usuário digita muito, o corpo cresce verticalmente e o rodapé é empurrado para baixo, ao invés de iniciar uma nova página A4. Não existe paginação real.

### Conceito (como o Word funciona)
O Word mantém um único fluxo de texto editável e, em tempo de renderização, calcula onde quebrar e desenha **uma nova página visual** (folha branca + cabeçalho + rodapé) cada vez que o conteúdo passa do limite vertical. O cabeçalho/rodapé são **um conteúdo só**, replicados em todas as páginas.

Vamos reproduzir o mesmo modelo:
- `cabecalhoHtml`, `conteudoHtml`, `rodapeHtml` continuam sendo **um único fluxo cada** (sem mudança no banco).
- O corpo é editado em **um único `contentEditable`** real, mas visualmente partido em "páginas" sobrepostas/empilhadas.
- Cabeçalho e rodapé são renderizados **uma vez por página visual**, lendo o mesmo `cabecalhoHtml` / `rodapeHtml`.

### Correção — abordagem técnica

**Arquivo principal:** `src/components/Documentos/DocumentoEditor.tsx`

#### A) Constantes de página
```text
PAGE_WIDTH  = 794px   (A4 @ 96dpi)
PAGE_HEIGHT = 1123px
HEADER_H    = 60px
FOOTER_H    = 60px
SIDE_PAD    = 96px
BODY_H_PER_PAGE = 1123 - 60 - 60 = 1003px   (área útil do corpo por página)
```

#### B) Estrutura DOM por página
A "mesa de trabalho" passa a renderizar **N folhas A4 empilhadas** com gap entre elas:

```text
[Folha 1]
  ├ Cabeçalho (60px) — render do mesmo cabecalhoHtml
  ├ Corpo (1003px)   — janela visual sobre o fluxo único
  └ Rodapé (60px)
[gap 16px]
[Folha 2]
  ├ Cabeçalho (60px) — mesmo HTML, repetido
  ├ Corpo (1003px)
  └ Rodapé (60px)
...
```

#### C) Como manter UM editor mas N páginas visuais
Implementação escolhida: **"editor flutuante + máscaras de página"**.

1. Existe **um único** `<div contentEditable>` com `cabecalhoHtml`/`bodyHtml`/`rodapeHtml` (apenas o body é o editor longo). Esse editor fica em `position: absolute; top:0; left:0; width:602px` (largura útil = 794 − 96×2) **dentro** de um wrapper `position: relative`.
2. Por cima/abaixo, renderizamos as "folhas visuais" como uma camada de **molduras**: cada folha é um `div` posicionado em `top: i*(PAGE_HEIGHT+GAP)`, com cabeçalho desenhado no topo, rodapé no fundo, e uma "janela transparente" no meio. As folhas têm `pointer-events: none` exceto cabeçalho/rodapé.
3. O número de páginas é calculado por `Math.ceil(bodyScrollHeight / BODY_H_PER_PAGE)` via `ResizeObserver` no `<div contentEditable>` do corpo.
4. O corpo recebe `padding-top` extra para que o texto "pule" os cabeçalhos das páginas seguintes:  
   `padding inserido antes do byte que cruza cada limite`. Na prática, mais simples: deixamos o body como um fluxo contínuo SEM gaps, e desenhamos as folhas com **cabeçalhos/rodapés flutuando "sobre" o texto** apenas como decoração visual (não-interativos), com `background: white` cobrindo a faixa onde cairia texto cortado. Para o texto não ficar coberto, aplicamos `padding-block` no body que reserva o espaço de cabeçalho+rodapé+gap a cada `BODY_H_PER_PAGE` percorridos — feito injetando `<div class="page-break-spacer" style="height:120px">` automaticamente via `useEffect` após cada mudança (não-editáveis, `contenteditable=false`).

> Em resumo: o body é um único editor; o efeito visual de "passar para a página 2" vem de **espaçadores invisíveis** inseridos automaticamente quando o corpo ultrapassa o limite, e de molduras (folha + cabeçalho + rodapé) renderizadas atrás.

#### D) Cabeçalho e rodapé — edição
Mantemos o comportamento atual (duplo-clique destrava). A diferença: o **mesmo** `cabecalhoHtml` é renderizado em todas as folhas (somente leitura nas folhas 2+). A edição acontece sempre na **folha 1**; alterações são propagadas automaticamente porque o HTML é único — as outras folhas apenas espelham via `dangerouslySetInnerHTML`.

#### E) Quebra de página manual (opcional)
Adicionar atalho `Ctrl+Enter` que insere um `<div class="page-break" data-page-break="true" style="break-before: page;"></div>` no corpo. O cálculo de páginas trata esse marker como "forçar próxima página" (avança o cursor de medição até o próximo múltiplo de `BODY_H_PER_PAGE`).

### Exportação PDF — sincronizar com a paginação visual
**Arquivo:** `src/components/Documentos/DocumentosPDFExport.tsx`

Já existe `doc.addPage()` e `drawHeaderFooter()` por página — está OK. Acrescentar:
- Respeitar marcadores `<div data-page-break="true">` forçando `doc.addPage()` ao encontrá-los.
- Manter altura útil idêntica (`contentBottom = pageHeight - margin - footerHeight`) para o PDF refletir o que se vê na tela.

### Arquivos afetados

**Modificados:**
- `src/components/Documentos/DocumentoEditor.tsx` — paginação visual, `ResizeObserver`, espaçadores automáticos, atalho `Ctrl+Enter`, render de folhas múltiplas com cabeçalho/rodapé repetidos.
- `src/components/Documentos/DocumentosPDFExport.tsx` — respeitar `data-page-break` para forçar nova página no PDF.
- `src/components/Documentos/RichTextToolbar.tsx` — botão "Quebra de página" (ícone `FileText` ou `SeparatorHorizontal`) chamando comando customizado.
- `src/pages/DocumentoEditar.tsx` — passar handler para inserir quebra de página via toolbar (extensão de `onFormat`).

**Sem mudanças:** banco de dados, RLS, tipos, hooks (`useDocumentos`).

### Impacto

**Usuário final (UX):**
- Ao digitar muito, o corpo automaticamente "transborda" para uma segunda folha A4 visualmente separada, com o mesmo cabeçalho e rodapé repetidos no topo/fundo. Idêntico ao Word.
- Botão novo na toolbar para quebra de página manual (`Ctrl+Enter`).
- Cabeçalho editado uma vez aparece em todas as páginas automaticamente.
- Preview e Aplicar definitivamente continuam funcionando (operam sobre o HTML único).

**Dados:**
- Zero mudança no banco. Continua salvando 3 campos HTML (`cabecalho_html`, `conteudo_html`, `rodape_html`).
- Marcadores `<div data-page-break>` ficam embutidos no HTML do corpo — preservados em backups, copy/paste e exportações.

**Riscos colaterais:**
- `ResizeObserver` rodando no corpo a cada digitação tem custo baixo, mas é debounce-ado (60ms) para não disparar a cada tecla.
- Inserção automática de espaçadores pode interferir com a posição do cursor — mitigado salvando `Selection` antes/depois da reinjeção.
- HTML antigo (sem markers) continua funcionando: a paginação calcula tudo por altura medida.
- Telas pequenas (<900px CSS): folha A4 já scrolla horizontal; a paginação vertical não muda nada.

**Quem é afetado:**
- Apenas usuários do editor `/documentos/:id`. Listagens, CRM, demais tenants — sem mudança.

### Validação
1. Abrir `/demorais/documentos/novo` — vejo 1 folha A4.
2. Digitar parágrafos até ultrapassar ~1000px de corpo → automaticamente surge uma 2ª folha A4 abaixo, com o cabeçalho/rodapé repetidos.
3. Editar o cabeçalho na folha 1 → texto novo aparece também no cabeçalho da folha 2 instantaneamente.
4. Pressionar `Ctrl+Enter` no meio do texto → cursor pula para o início de uma nova folha; o conteúdo abaixo passa para a próxima página.
5. Botão "Quebra de página" na toolbar tem o mesmo efeito.
6. Apagar conteúdo até voltar a caber em 1 folha → folha 2 desaparece automaticamente.
7. Exportar PDF → cada folha visual vira uma página real do PDF, com cabeçalho e rodapé repetidos.
8. Modo Preview com cliente vinculado → variáveis substituídas em todas as folhas.
9. Documento salvo, recarregado → paginação reconstruída pelo cálculo de altura, idêntica.
10. Tema claro e escuro: folhas continuam brancas (papel), com sombra; gap visível entre páginas.

