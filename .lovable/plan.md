

# Link-in-Bio: Imagem de fundo + controles de visibilidade

## O que será feito

1. **Imagem de fundo** — permitir upload de uma imagem que fica como background do perfil público (por cima ou em vez do gradiente de cores)
2. **Controles de visibilidade** — toggles para o usuário escolher:
   - Mostrar/ocultar o `@username`
   - Mostrar/ocultar a foto de perfil (avatar)
   - Editar o texto exibido no lugar do `@username` (ex: nome da empresa)

## Alterações técnicas

### 1. Migration SQL — novos campos em `link_profiles`
```sql
ALTER TABLE link_profiles
  ADD COLUMN bg_image_url text,
  ADD COLUMN show_username boolean NOT NULL DEFAULT true,
  ADD COLUMN show_avatar boolean NOT NULL DEFAULT true,
  ADD COLUMN display_name text;  -- texto alternativo ao @username
```

### 2. Atualizar `src/types/link.ts`
Adicionar os 4 novos campos ao `LinkProfile`.

### 3. Atualizar `src/lib/linkThemeUtils.ts`
`getProfileBackground()` passa a verificar `bg_image_url` — se existir, aplica como `background-image` com `cover/center`, podendo sobrepor ou combinar com o gradiente.

### 4. Atualizar `src/components/Link/ThemeCustomizer.tsx`
Novo card "Imagem de Fundo":
- Upload de imagem (usa bucket `link-backgrounds` no Supabase Storage)
- Preview da imagem
- Botão para remover imagem

### 5. Atualizar `src/components/Link/ProfileEditHeader.tsx`
Novos toggles:
- **Mostrar foto** (Switch) — controla `show_avatar`
- **Mostrar @username** (Switch) — controla `show_username`
- **Nome de exibição** (Input) — campo `display_name`, aparece quando `show_username` está ativo, como alternativa ao `@username`

### 6. Atualizar `src/pages/LinkPublicProfile.tsx`
- Condicional: só renderiza avatar se `show_avatar` for true
- Condicional: só renderiza `@username` se `show_username` for true
- Se `display_name` existir e `show_username`, mostra `display_name` em vez de `@username`
- Background image aplicado via `getProfileBackground()`

### 7. Atualizar `MobilePreview` e `ProfilePreview`
Mesmas condicionais do perfil público para manter preview fiel.

### 8. Criar bucket Storage `link-backgrounds`
Migration SQL para criar o bucket público + RLS para upload autenticado.

## Arquivos envolvidos

- **Nova migration SQL** (campos + bucket)
- `src/types/link.ts`
- `src/lib/linkThemeUtils.ts`
- `src/components/Link/ThemeCustomizer.tsx`
- `src/components/Link/ProfileEditHeader.tsx`
- `src/pages/LinkPublicProfile.tsx`
- `src/components/Link/MobilePreview.tsx`
- `src/components/Link/ProfilePreview.tsx`

