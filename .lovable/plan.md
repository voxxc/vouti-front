

## Plano: Cor e tamanho do @username customizáveis

### Objetivo
Adicionar no ThemeCustomizer controles para definir a cor e o tamanho da fonte do `@username` exibido na página pública e no preview.

### Alterações

**1. Migration SQL** — Novas colunas em `link_profiles`
- `username_color` (text, nullable) — cor do @username (fallback: usa `button_text_color`)
- `username_font_size` (text, default `'xl'`) — tamanho: `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`

**2. `src/types/link.ts`** — Adicionar campos
- `username_color: string | null`
- `username_font_size: string`

**3. `src/components/Link/ThemeCustomizer.tsx`** — Nova seção "Username"
- Color picker para cor do @username
- Seletor visual de tamanho com opções (P, M, G, GG, XG) mapeando para os valores de font-size
- Preview em tempo real via `updateAndPreview`

**4. `src/components/Link/MobilePreview.tsx`** — Aplicar estilo
- No `<h1>` do @username (linha 39), usar `profile.username_color` como cor (fallback `btnStyle.color`) e mapear `username_font_size` para classes Tailwind (`text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`)

**5. `src/pages/LinkPublicProfile.tsx`** — Mesma lógica
- No `<h1>` do @username (linha 102), aplicar cor e tamanho dinâmicos

### Mapeamento de tamanhos
| Valor DB | Label | Classe Tailwind |
|----------|-------|-----------------|
| `sm` | P | `text-sm` |
| `base` | M | `text-base` |
| `lg` | G | `text-lg` |
| `xl` | GG | `text-xl` |
| `2xl` | XG | `text-2xl` |
| `3xl` | XXG | `text-3xl` |

### Arquivos
| Arquivo | Mudança |
|---------|---------|
| SQL migration | `username_color`, `username_font_size` |
| `src/types/link.ts` | Novos campos |
| `ThemeCustomizer.tsx` | Seção "Username" com color picker + seletor de tamanho |
| `MobilePreview.tsx` | Estilo dinâmico no @username |
| `LinkPublicProfile.tsx` | Estilo dinâmico no @username |
| `linkThemeUtils.ts` | Helper `getUsernameStyle(profile)` |

