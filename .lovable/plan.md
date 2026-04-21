

## Cabeçalho e rodapé no editor de documentos (estilo Word)

### Objetivo
Adicionar **cabeçalho** e **rodapé** editáveis na folha A4 do `DocumentoEditor`, com o mesmo padrão do Word: por padrão ficam "travados" (cinza, não-editáveis); ao dar **duplo-clique** na zona superior ou inferior da página, a área destrava e fica editável; clicar no corpo trava de volta.

---

### 1. Modelo de dados

Adicionar dois novos campos persistidos por documento:
- `cabecalho_html` (text, nullable)
- `rodape_html` (text, nullable)

**Migração SQL:**
```sql
ALTER TABLE documentos
  ADD COLUMN cabecalho_html TEXT,
  ADD COLUMN rodape_html TEXT;
```

**Atualizações de tipos:**
- `src/types/documento.ts`: adicionar `cabecalho_html?: string | null` e `rodape_html?: string | null` em `Documento`, `CreateDocumentoData`, `UpdateDocumentoData`.
- `src/integrations/supabase/types.ts`: refletir novos campos na tabela `documentos`.
- `src/hooks/useDocumentos.ts`: incluir os campos no `insert` (create), no `update`, e no `gerarDeModelo` (copia cabeçalho/rodapé do modelo para a instância).

---

### 2. Mudanças visuais na "folha A4"

`src/components/Documentos/DocumentoEditor.tsx`:

A folha continua `794px × 1123px`, mas o `padding: 96px` deixa de ser usado em bloco único. A folha passa a ser dividida verticalmente em três zonas:

```text
+------------------------------------------------+   <- topo da folha (0px)
|  [ZONA CABEÇALHO]  altura ~60px, padding lateral 96px  |
+------------------------------------------------+   <- 60px
|                                                |
|  [ZONA CORPO]  padding lateral 96px            |
|                                                |
+------------------------------------------------+   <- 1123 - 60 = 1063px
|  [ZONA RODAPÉ]   altura ~60px, padding lateral 96px   |
+------------------------------------------------+   <- 1123px
```

Cada zona é um `div` independente com seu próprio `contentEditable` controlado por estado local `activeZone: 'header' | 'body' | 'footer' | null`.

**Estados visuais por zona (como no Word):**
- **Inativa**: texto em `text-muted-foreground/60`, sem cursor de edição, sem outline; ao passar o mouse mostra um marcador discreto (linha tracejada `border-dashed` cinza claro) e tooltip "Duplo-clique para editar cabeçalho".
- **Ativa**: borda tracejada azul (`border-dashed border-primary/40`), label flutuante no canto ("Cabeçalho" / "Rodapé") em badge pequeno, cursor de texto, `contentEditable=true`.
- **Corpo ativo**: zonas de cabeçalho/rodapé voltam ao estado inativo automaticamente.

**Interações:**
- `onDoubleClick` na zona de cabeçalho → `setActiveZone('header')` e `focus()` no editor da zona.
- `onDoubleClick` na zona de rodapé → `setActiveZone('footer')`.
- `onClick` ou `onFocus` no corpo → `setActiveZone('body')` (trava header/footer).
- Tecla `Escape` em qualquer zona ativa de header/footer → volta para `'body'`.

---

### 3. API do componente

`DocumentoEditor` ganha props novas:
```typescript
interface DocumentoEditorProps {
  value: string;
  onChange: (value: string) => void;
  cabecalhoHtml: string;
  onCabecalhoChange: (value: string) => void;
  rodapeHtml: string;
  onRodapeChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
  previewHtml?: string | null;
  previewCabecalho?: string | null;
  previewRodape?: string | null;
}
```

`DocumentoEditorHandle` (imperativo) continua com `insertAtCursor`/`focus`, mas **insere na zona ativa** (corpo, cabeçalho ou rodapé). Útil para o painel de variáveis funcionar dentro do cabeçalho também (ex: número de processo no topo).

A toolbar (`RichTextToolbar`) passa a operar sobre a zona ativa — `document.execCommand` já age sobre o `contentEditable` focado, então funciona naturalmente; só precisamos garantir que o foco volte para a zona ativa após clicar num botão da toolbar.

---

### 4. Integração com a página

`src/pages/DocumentoEditar.tsx`:
- Novos estados: `cabecalhoHtml`, `rodapeHtml`.
- Carregar do `documento` no `useEffect` existente.
- Passar para `<DocumentoEditor />` os 4 valores e callbacks.
- No `handleSave`, enviar `cabecalho_html` e `rodape_html` no `createDocumento` / `updateDocumento`.
- No `handleExportPDF`, gerar HTML final concatenando cabeçalho + corpo + rodapé já com variáveis aplicadas.
- No modo **Preview** (cliente vinculado), aplicar `applyClienteVariables` também no cabeçalho e rodapé, gerando `previewCabecalho` e `previewRodape`.
- Botão "Aplicar definitivamente" também substitui variáveis em cabeçalho e rodapé.

---

### 5. Exportação PDF

`src/components/Documentos/DocumentosPDFExport.tsx`:
- Aceitar `cabecalhoHtml` e `rodapeHtml` opcionais.
- No HTML montado para o PDF, renderizar cabeçalho no topo de cada página e rodapé no fim de cada página usando `@page` CSS:
  ```css
  @page {
    margin: 60px 0;
    @top-center { content: element(header); }
    @bottom-center { content: element(footer); }
  }
  ```
- Fallback: se a engine de PDF usada (jsPDF/html2canvas) não suportar `@page`, renderizar cabeçalho/rodapé fixos em cada página via cálculo manual ao paginar.

---

### 6. Painel de variáveis funciona em qualquer zona

`VariaveisPanel` continua chamando `editorRef.current?.insertAtCursor(v)`. A implementação do `insertAtCursor` no editor passa a:
1. Detectar qual `contentEditable` tem o foco atual (`document.activeElement`).
2. Inserir na seleção dessa zona.
3. Disparar o `onChange` correto (`onChange`, `onCabecalhoChange` ou `onRodapeChange`).

---

### Arquivos afetados

**Migração nova:**
- SQL adicionando `cabecalho_html` e `rodape_html` em `documentos`.

**Modificados:**
- `src/types/documento.ts` — campos novos.
- `src/integrations/supabase/types.ts` — campos novos.
- `src/hooks/useDocumentos.ts` — persistir cabeçalho/rodapé no create/update/gerarDeModelo.
- `src/components/Documentos/DocumentoEditor.tsx` — 3 zonas editáveis, lógica de duplo-clique, estado `activeZone`, roteamento de `insertAtCursor` para a zona ativa.
- `src/pages/DocumentoEditar.tsx` — estados, carregamento, salvamento, integração com preview/aplicação de variáveis.
- `src/components/Documentos/DocumentosPDFExport.tsx` — aceitar e renderizar cabeçalho/rodapé na exportação.

---

### Impacto

**Usuário final (UX):**
- Comportamento idêntico ao Word: por padrão a folha mostra só o corpo "ativo"; cabeçalho e rodapé ficam suaves, em cinza claro, com aviso de duplo-clique no hover. Ao dar duplo-clique, a zona destrava, ganha borda pontilhada azul, label "Cabeçalho"/"Rodapé" e cursor de texto. Clicar no corpo trava de volta.
- Variáveis (`${_X_cliente_}`) podem ser inseridas também no cabeçalho/rodapé — útil para "Processo nº", "Cliente: ..." no topo de toda página.
- Modelos novos podem definir cabeçalho/rodapé padrão que serão herdados pelas instâncias geradas.

**Dados:**
- Migração simples, dois campos `TEXT` nullable. Nenhum dado existente é alterado; documentos antigos ficam com cabeçalho/rodapé vazios. Sem mudança em RLS, índices ou performance relevante.

**Riscos colaterais:**
- `document.execCommand` aplicado em múltiplos `contentEditable` precisa garantir foco correto; mitigado por `activeElement` check antes da inserção.
- Exportação PDF com `@page` pode variar entre engines; fallback manual previsto.
- Em telas estreitas (<900px) a folha A4 já rola horizontalmente — o comportamento de zonas continua igual, sem regressão.

**Quem é afetado:**
- Apenas usuários do módulo `/documentos` (criação/edição). Listagens e CRM (aba "Documentos" do cliente) não mudam.

---

### Validação

1. Abrir `/demorais/documentos/novo` — folha A4 mostra zona de cabeçalho cinza no topo e rodapé cinza embaixo, com texto placeholder.
2. Hover na zona de cabeçalho → borda tracejada cinza + tooltip "Duplo-clique para editar".
3. Duplo-clique no cabeçalho → borda azul tracejada, label "Cabeçalho", cursor pisca, posso digitar.
4. Clicar no corpo → cabeçalho volta ao cinza, corpo recebe o foco.
5. Mesma sequência funciona no rodapé.
6. Inserir variável `${_Nome_cliente_}` com cabeçalho ativo → variável vai para o cabeçalho, não para o corpo.
7. Salvar documento, recarregar página, cabeçalho e rodapé persistem.
8. Vincular cliente, alternar Preview → variáveis no cabeçalho/rodapé também são substituídas.
9. Aplicar definitivamente → substituição também ocorre em cabeçalho/rodapé.
10. Exportar PDF → cabeçalho aparece no topo e rodapé no fim de cada página.
11. Gerar instância a partir de modelo → cabeçalho/rodapé do modelo são copiados para a nova instância.

