

## Plano: Paleta de cores e gradientes para a página pública do Link-in-Bio

### Objetivo
Permitir que o usuário escolha cores de fundo e tipo de gradiente para sua página pública de links, com preview em tempo real.

### Estado atual
- A tabela `link_profiles` tem apenas `theme_color` (texto, default `#8B5CF6`) — usado só no fallback do avatar, nunca no fundo da página.
- A página pública e o preview têm fundo branco fixo (`bg-white`).

### Alterações

**1. Migration SQL** — Adicionar colunas na `link_profiles`
- `bg_color_1` (text, default `#FFFFFF`) — cor primária do fundo
- `bg_color_2` (text, nullable) — cor secundária (se preenchida, ativa gradiente)
- `bg_gradient_direction` (text, default `to-b`) — direção do gradiente: `to-b`, `to-t`, `to-r`, `to-l`
- `button_color` (text, default `#1e293b`) — cor dos botões de link
- `button_text_color` (text, default `#ffffff`) — cor do texto dos botões

**2. Atualizar `src/types/link.ts`** — Adicionar campos no `LinkProfile`

**3. Criar `src/components/Link/ThemeCustomizer.tsx`** — Painel de personalização
- Color pickers para: cor de fundo 1, cor de fundo 2 (opcional), cor dos botões, cor do texto
- Seletor de direção do gradiente com 4 opções visuais (↓ ↑ → ←)
- Toggle para ativar/desativar gradiente
- Botão "Salvar" que chama `onSave` com os dados
- Paletas pré-definidas (ex: "Oceano", "Sunset", "Roxo", "Escuro") para facilitar

**4. Atualizar `src/pages/LinkDashboard.tsx`** — Aba "Customize"
- Renderizar `ThemeCustomizer` na aba "customize" passando `localProfile` e `handleSaveProfile`
- Preview atualiza em tempo real via `localProfile`

**5. Atualizar `src/components/Link/MobilePreview.tsx`** — Aplicar cores
- Fundo do conteúdo usa `bg_color_1` e, se `bg_color_2` existir, aplica gradiente via `style={{ background: ... }}`
- Botões usam `button_color` e `button_text_color` via inline style
- Direção do gradiente mapeada: `to-b` → `to bottom`, `to-t` → `to top`, `to-r` → `to right`, `to-l` → `to left`

**6. Atualizar `src/pages/LinkPublicProfile.tsx`** — Mesma lógica de cores
- Background e botões renderizados com as cores salvas no perfil
- Fallback para branco/slate se campos não preenchidos

### Fluxo
```text
Dashboard > Customize
  → ThemeCustomizer mostra pickers + paletas pré-definidas
  → Usuário escolhe cores e direção
  → localProfile atualiza → MobilePreview reflete em tempo real
  → "Salvar" persiste no banco
  → Página pública (/:username) lê as cores e renderiza
```

### Arquivos
| Arquivo | Mudança |
|---------|---------|
| SQL migration | Novas colunas `bg_color_1`, `bg_color_2`, `bg_gradient_direction`, `button_color`, `button_text_color` |
| `src/types/link.ts` | Novos campos no `LinkProfile` |
| `src/integrations/supabase/types.ts` | Atualizar tipos gerados |
| `src/components/Link/ThemeCustomizer.tsx` | **Novo** — painel de cores e gradiente |
| `src/pages/LinkDashboard.tsx` | Integrar ThemeCustomizer na aba Customize |
| `src/components/Link/MobilePreview.tsx` | Aplicar cores dinâmicas |
| `src/pages/LinkPublicProfile.tsx` | Aplicar cores dinâmicas |

