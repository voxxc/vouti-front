

# Redesign: Estilos de Botão, Subbotões e Remoção do Footer "Vouti"

## 3 mudanças principais

### 1. Remover texto "Vouti" do preview e página pública
O footer com "Vouti" aparece no `MobilePreview.tsx` (linhas 99-103), `LinkPublicProfile.tsx` (footer) e `ProfilePreview.tsx`. Será removido de todos.

### 2. Estilo avançado dos botões (novo card no ThemeCustomizer)
Novos campos na tabela `link_profiles`:

```sql
ALTER TABLE link_profiles
  ADD COLUMN button_style text NOT NULL DEFAULT 'filled',
  ADD COLUMN button_radius text NOT NULL DEFAULT 'xl',
  ADD COLUMN button_padding text NOT NULL DEFAULT 'normal',
  ADD COLUMN button_spacing text NOT NULL DEFAULT 'normal',
  ADD COLUMN button_border_color text;
```

- **button_style**: `filled` | `outline` | `soft` | `shadow`
- **button_radius**: `none` (0) | `md` (8px) | `xl` (16px) | `full` (9999px/pill)
- **button_padding**: `compact` (py-2) | `normal` (py-4) | `spacious` (py-6)
- **button_spacing**: `tight` (gap-1) | `normal` (gap-3) | `spacious` (gap-5)

O card "Cor dos Botões" no ThemeCustomizer será redesenhado como "Estilo dos Botões" com:
- Seletores visuais (mini-previews) para cada estilo
- Seletor de arredondamento
- Seletor de altura (padding)
- Seletor de espaçamento
- Color pickers (fundo, texto, borda — borda só visível para outline)

O `getButtonStyle()` em `linkThemeUtils.ts` será expandido para retornar os estilos completos. Nova função `getButtonSpacing()`.

### 3. Subbotões (botão expansível com sub-links)
Novo campo `parent_id` na tabela `link_items`:

```sql
ALTER TABLE link_items ADD COLUMN parent_id uuid REFERENCES link_items(id) ON DELETE CASCADE;
```

Lógica:
- Um `link_item` com `parent_id = null` e `url = null` (ou vazio) é um **botão-pai** (accordion)
- Um `link_item` com `parent_id = <id do pai>` é um **subbotão**
- No preview e página pública: clicar no botão-pai expande/colapsa os subbotões abaixo dele
- No dashboard de gerenciamento: ao editar um link, opção "Este é um botão com subitens" (toggle) — ao ativar, remove a URL e permite adicionar sub-links dentro dele

Mudanças nos componentes:
- **LinkCard.tsx**: mostrar sub-links indentados abaixo do pai, com botão "Adicionar sub-link"
- **EditLinkDialog.tsx**: toggle "Botão com subitens", se ativo esconde campo URL
- **MobilePreview.tsx** e **LinkPublicProfile.tsx**: renderizar botão-pai como accordion — ao clicar, exibe subbotões com estilo levemente reduzido (menor padding, indentação)

## Arquivos envolvidos

- **Nova migration SQL** — 5 colunas de estilo + `parent_id`
- `src/types/link.ts` — novos campos em `LinkProfile` e `LinkItem`
- `src/lib/linkThemeUtils.ts` — expandir `getButtonStyle()`, nova `getButtonSpacing()`
- `src/components/Link/ThemeCustomizer.tsx` — redesign card de botões
- `src/components/Link/MobilePreview.tsx` — remover footer Vouti, aplicar estilos, subbotões
- `src/components/Link/ProfilePreview.tsx` — remover footer Vouti
- `src/pages/LinkPublicProfile.tsx` — remover footer Vouti, aplicar estilos, subbotões com accordion
- `src/components/Link/LinkCard.tsx` — exibir hierarquia pai/filho
- `src/components/Link/EditLinkDialog.tsx` — toggle "botão com subitens"

