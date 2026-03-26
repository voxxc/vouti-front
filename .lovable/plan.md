

# Sub-links Completos: Criação, Gestão e Personalização

## Problemas identificados

1. `handleSaveLink` no `LinkDashboard` nunca envia `parent_id` ao criar links — sub-links são impossíveis de criar
2. Não existe fluxo para adicionar sub-links a um botão-pai: o `LinkCard` recebe `onAddChild` mas o dashboard não implementa essa callback
3. O `unCollectedLinks` não filtra por `parent_id`, então links filhos aparecem misturados com os pais
4. Não há personalização visual separada para sub-botões no `ThemeCustomizer`

## Solução

### 1. Corrigir `LinkDashboard.tsx` — suporte a parent_id

- `handleSaveLink`: incluir `parent_id` no insert/update quando presente nos dados
- `editLinkDialog` state: expandir para incluir `parentId` opcional
- Adicionar callback `handleAddChild(parentId)` que abre o dialog com `parentId` pré-definido
- Filtrar `unCollectedLinks` para excluir links com `parent_id` (são filhos, não top-level)
- Passar `childLinks` e `onAddChild` ao `LinkCard`

### 2. Melhorar `EditLinkDialog.tsx`

- Receber prop `parentId?: string` para modo "adicionar sub-link"
- Quando `parentId` está definido: esconder toggle "Botão com subitens", mostrar indicação visual "Sub-link de: [pai]"
- Quando `isParent` ativo: mostrar seção informativa "Após salvar, adicione sub-links pelo botão + no card"

### 3. Melhorar `LinkCard.tsx`

- Quando é botão-pai: mostrar botão "Adicionar sub-link" mais proeminente
- Expandir automaticamente quando tem filhos
- Mostrar contagem de sub-links ativos/inativos

### 4. Personalização de sub-botões no `ThemeCustomizer`

Novos campos no banco (migration):
```sql
ALTER TABLE link_profiles
  ADD COLUMN sub_button_style text NOT NULL DEFAULT 'soft',
  ADD COLUMN sub_button_radius text NOT NULL DEFAULT 'xl',
  ADD COLUMN sub_button_padding text NOT NULL DEFAULT 'compact',
  ADD COLUMN sub_button_color text,
  ADD COLUMN sub_button_text_color text;
```

No ThemeCustomizer: novo card "Estilo dos Sub-Botões" com:
- Formato visual (filled/outline/soft/shadow)
- Arredondamento
- Altura
- Cores (fundo, texto) — com fallback para cores do botão principal

### 5. Atualizar `linkThemeUtils.ts`

`getSubButtonStyle()` passa a usar os campos dedicados (`sub_button_*`) em vez de simplesmente copiar o estilo pai com opacity reduzida.

### 6. Atualizar types e previews

- `LinkProfile` em `types/link.ts`: 5 novos campos `sub_button_*`
- `MobilePreview`, `LinkPublicProfile`, `ProfilePreview`: usar `getSubButtonStyle()` atualizado

## Arquivos

- **Migration SQL**: 5 novos campos em `link_profiles`
- `src/types/link.ts`
- `src/pages/LinkDashboard.tsx`
- `src/components/Link/EditLinkDialog.tsx`
- `src/components/Link/LinkCard.tsx`
- `src/components/Link/ThemeCustomizer.tsx`
- `src/lib/linkThemeUtils.ts`
- `src/components/Link/MobilePreview.tsx` (já funciona, só atualizar getSubButtonStyle)
- `src/pages/LinkPublicProfile.tsx`

