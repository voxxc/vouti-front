

## Cabeçalho/rodapé robustos com suporte real a imagens

### Causa raiz
1. A faixa do cabeçalho tem **altura fixa de 60px** e **sem `overflow`/sem limite no `<img>`** — qualquer imagem colada/arrastada renderiza no tamanho original e escapa visualmente da área tracejada.
2. **Não existe botão "Inserir imagem"** na toolbar; o usuário está colando uma imagem grande sem qualquer normalização (sem `max-width`, sem reescala).
3. O **padding-top do corpo é fixo** em `HEADER_H + 12 = 72px` — mesmo que aumentássemos a faixa, o texto do corpo entraria por baixo da logo.
4. O cálculo de paginação (`recalcPages`) também assume `HEADER_H = 60px`. Se o cabeçalho variar, o número de páginas fica errado.

### Correção — abordagem

**A) Tornar a altura do cabeçalho/rodapé dinâmica (medida do conteúdo real).**

Em `DocumentoEditor.tsx`:
- Trocar as constantes `HEADER_H` e `FOOTER_H` por **estado** `headerH` / `footerH`, com mínimos `MIN_HEADER = 48` e máximos `MAX_HEADER = 240` (idem rodapé).
- Medir a altura real do conteúdo do cabeçalho/rodapé via `ResizeObserver` no `headerRef`/`footerRef` e atualizar o estado (clampado entre min/max).
- A faixa do cabeçalho na folha visual passa a usar `height: ${headerH}px`. O `paddingTop` do corpo passa a ser `headerH + 12`. Idem rodapé.
- `BODY_H` vira derivado: `PAGE_HEIGHT - headerH - footerH`. `INTER_PAGE_BAND` também.
- `recalcPages` recalcula sempre que `headerH`/`footerH` mudarem.
- As folhas 2+ continuam mostrando `dangerouslySetInnerHTML` do cabeçalho — mesma altura medida (espelhamento).

**B) Conter visualmente qualquer overflow da zona.**

- Adicionar `overflow: hidden` na faixa visual de cabeçalho/rodapé como **rede de segurança** (caso a medição falhe, o conteúdo nunca escapa para fora da área tracejada).
- Adicionar CSS escopado no editor para **limitar imagens automaticamente**:
  ```css
  [data-zone="header"] img,
  [data-zone="footer"] img {
    max-width: 100%;
    max-height: 200px;
    height: auto;
    object-fit: contain;
    display: inline-block;
    vertical-align: middle;
  }
  [data-zone="body"] img {
    max-width: 100%;
    height: auto;
  }
  ```
- Marcar cada zona com `data-zone="header|body|footer"` no `div` editável.

**C) Botão "Inserir imagem" oficial na toolbar.**

Em `RichTextToolbar.tsx`:
- Novo botão com ícone `ImagePlus` que dispara `onFormat("insertImage")`.
- Em `DocumentoEditor.handleFormat`, ao receber `"insertImage"`:
  - Abre um `<input type="file" accept="image/*">` programático.
  - Lê o arquivo como `dataURL` (base64) — armazenado dentro do HTML do cabeçalho/rodapé/corpo.
  - **Pré-redimensiona via `<canvas>`**: se a largura > 600px, reescala para 600px mantendo proporção. Isso evita salvar HTML gigante no banco.
  - Insere via `document.execCommand("insertImage", false, dataUrl)` na zona ativa.
  - Dispara `onChange` da zona correta.
- Aceitar também **paste** (`onPaste`) e **drop** (`onDrop`) de imagens nas três zonas: intercepta, reescala via canvas, insere como `<img>` com `max-width:100%`. Evita o bug de "colei e ficou gigante".

**D) Ajustar `useEffect` de sincronização de HTML.**

Hoje o `useEffect` que injeta `cabecalhoHtml` no `headerRef` não dispara `recalcPages`. Como agora a altura do header afeta o cálculo, adicionar `requestAnimationFrame(() => recalcPages())` após injetar o HTML do cabeçalho e do rodapé.

**E) Indicador visual de altura.**

Quando o cabeçalho/rodapé estiver ativo (em edição), mostrar pequeno badge no canto com a altura atual (ex: "Cabeçalho · 120px"). Apenas decorativo, ajuda o usuário entender por que o corpo "desceu".

### Arquivos afetados

**Modificados:**
- `src/components/Documentos/DocumentoEditor.tsx` — alturas dinâmicas (`headerH`/`footerH`), `ResizeObserver` adicional para header/footer, `data-zone` nas zonas, CSS injetado para `img`, recálculo de paginação dependendo das alturas, handlers de `paste`/`drop` para imagens, handler `insertImage` que abre file picker e reescala via canvas, `overflow:hidden` na faixa visual.
- `src/components/Documentos/RichTextToolbar.tsx` — novo botão "Inserir imagem" (ícone `ImagePlus`).
- `src/components/Documentos/DocumentosPDFExport.tsx` — usar a altura **real** do cabeçalho/rodapé (medida do HTML em uma sandbox oculta) ao reservar margem no jsPDF, em vez do `60px` fixo, para o PDF refletir o que aparece na tela.

**Sem mudanças:** banco, RLS, tipos, hooks. O HTML salvo continua sendo `cabecalho_html` / `rodape_html` / `conteudo_html`.

### Impacto

**Usuário final (UX):**
- Posso colar (Ctrl+V), arrastar ou usar o botão "Inserir imagem" pra pôr uma logo no cabeçalho. A imagem é redimensionada automaticamente para caber na largura útil da página (≈602px) e nunca passa de 200px de altura no cabeçalho/rodapé — fica sempre dentro da área tracejada.
- A faixa do cabeçalho **cresce** automaticamente conforme o conteúdo (logo, texto em várias linhas etc.), e o corpo do texto se reposiciona pra começar logo abaixo. Nada mais "vaza".
- O mesmo cabeçalho continua sendo replicado em todas as páginas, com a altura nova.
- Botão claro na toolbar pra inserir imagem; placeholder "Duplo-clique para adicionar cabeçalho" continua aparecendo.

**Dados:**
- Imagens entram como base64 (`data:image/...`) dentro do HTML — comportamento atual do `execCommand("insertImage")`. A reescala para 600px reduz o tamanho médio do payload de MBs para ~50-150KB.
- Sem migrações, sem mudança de RLS.

**Riscos colaterais:**
- HTML antigo de cabeçalho/rodapé continua funcionando — se já tinha `<img>` gigante salvo, agora o CSS `max-width:100%; max-height:200px` o exibirá contido (mas o base64 cru continua no banco; isso é estético, não destrutivo).
- `ResizeObserver` em três zonas tem custo desprezível.
- Reescala via canvas pode perder qualidade em logos pequenas ampliadas; mitigado fazendo reescala somente quando `width > 600`.
- A medição da altura real do header pelo PDF requer renderização DOM oculta de uma cópia — fallback: se medição falhar, usa o `headerH` atual passado como prop pelo editor.

**Quem é afetado:**
- Apenas o editor `/documentos/:id`. Listagens, modelos antigos e outras páginas — sem mudança.

### Validação

1. Abrir `/demorais/documentos/novo`, dar duplo-clique no cabeçalho.
2. Clicar em "Inserir imagem" na toolbar, escolher uma logo PNG grande (ex: 1500×400). A imagem aparece dentro do cabeçalho, **redimensionada** para no máximo 600px de largura e 200px de altura, sem vazar para fora do tracejado.
3. A faixa do cabeçalho cresce automaticamente para acomodar a logo (ex: 140px). O texto do corpo começa logo abaixo, sem sobrepor.
4. Colar (Ctrl+V) outra imagem direto no cabeçalho — mesmo comportamento.
5. Arrastar uma imagem do desktop pra dentro do cabeçalho — mesmo comportamento.
6. Digitar bastante texto no corpo até gerar página 2 — a página 2 mostra a mesma logo no cabeçalho, mesma altura.
7. Salvar, recarregar — cabeçalho persiste com a imagem, altura recalculada automaticamente na montagem.
8. Exportar PDF — cabeçalho com a logo aparece em todas as páginas, sem corte.
9. Cabeçalho com texto puro continua funcionando (altura mínima 48px).
10. Modo Preview com cliente vinculado — variáveis no cabeçalho substituídas, imagem permanece.

