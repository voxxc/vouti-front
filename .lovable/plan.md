

## Plano: Botão de engrenagem para configurar logo do escritório na impressão

### Objetivo
Adicionar um botão de engrenagem (Settings) ao lado do botão "Imprimir / PDF" que abre um popover/dialog para upload de logo do escritório. A logo será armazenada em `localStorage` (base64) e incluída no cabeçalho de todos os relatórios impressos.

### Implementação

**Arquivo**: `src/components/Controladoria/ControladoriaIndicadores.tsx`

1. **Novo estado**: `logoEscritorio: string | null` — carregado do `localStorage` no mount (`localStorage.getItem("escritorio_logo")`)
2. **Novo estado**: `showLogoConfig: boolean` — controla popover/dialog de configuração
3. **Botão engrenagem**: `<Button variant="ghost" size="icon">` com ícone `Settings` ao lado do botão Imprimir
4. **Dialog de configuração**:
   - Input `type="file"` accept="image/*" para upload de logo
   - Preview da logo atual (se existir)
   - Botão "Remover logo" (se existir)
   - Ao selecionar arquivo: converter para base64 via `FileReader`, salvar em `localStorage` e no estado
5. **Atualizar `handlePrint`**: Em todos os 3 templates HTML (resumo, planilha, por-usuario), adicionar no topo do `<body>`:
   - Se `logoEscritorio` existir: `<img src="${logoEscritorio}" style="max-height:60px; margin-bottom:12px;" />`
   - Logo aparece acima do título do relatório

### Imports adicionais
- `Settings` de `lucide-react`
- `Dialog, DialogContent, DialogHeader, DialogTitle` (já disponíveis no projeto)

### Arquivos a editar
- `src/components/Controladoria/ControladoriaIndicadores.tsx`

