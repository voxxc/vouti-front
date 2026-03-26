

# Alinhar Previews e Adicionar Controle de Posição Vertical dos Botões

## Problemas identificados

1. **ProfilePreview (aba "Preview")** está desalinhado do MobilePreview — não mostra imagem de fundo, não respeita `show_avatar`, não renderiza sub-botões (accordions), e usa fundo branco fixo
2. **Posição vertical dos botões** — atualmente os botões ficam grudados no topo, sem controle para posicioná-los mais ao centro da página

## Solução

### 1. Redesign do `ProfilePreview.tsx`
Tornar consistente com o `MobilePreview` (que é o preview correto):
- Aplicar `getProfileBackground()` (mostra imagem de fundo e gradientes)
- Respeitar `show_avatar`, `show_username`, `display_name`
- Usar `getUsernameStyle()` e `getSubButtonStyle()`
- Renderizar sub-botões como accordions (mesmo comportamento do MobilePreview)
- Remover fundo branco fixo — usar o tema real do perfil
- Receber `collections` como prop (atualmente não recebe)

### 2. Novo campo `content_vertical_position` no perfil
Permite ajustar a posição vertical do conteúdo (avatar + botões) na página:

**Migration SQL:**
```sql
ALTER TABLE link_profiles
  ADD COLUMN content_vertical_position text NOT NULL DEFAULT 'top';
```

Valores: `top` (padrão atual), `center`, `bottom`

**Implementação:**
- `LinkProfile` type: novo campo `content_vertical_position`
- `linkThemeUtils.ts`: nova função `getContentAlignment()` que retorna `justifyContent` CSS
- `MobilePreview.tsx`: aplicar `justifyContent` no container interno
- `ProfilePreview.tsx`: aplicar o mesmo
- `LinkPublicProfile.tsx`: aplicar na página pública
- `ThemeCustomizer.tsx`: adicionar controle visual (3 opções: Topo, Centro, Baixo) na seção de layout

## Arquivos

- **Migration SQL**: novo campo `content_vertical_position`
- `src/types/link.ts` — adicionar campo
- `src/lib/linkThemeUtils.ts` — nova função `getContentAlignment()`
- `src/components/Link/ProfilePreview.tsx` — redesign completo alinhado ao MobilePreview
- `src/components/Link/MobilePreview.tsx` — aplicar posição vertical
- `src/pages/LinkPublicProfile.tsx` — aplicar posição vertical
- `src/components/Link/ThemeCustomizer.tsx` — controle de posição vertical
- `src/pages/LinkDashboard.tsx` — passar `collections` ao ProfilePreview

