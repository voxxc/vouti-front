

## Plano: Redesign Visual do Link-in-Bio (estilo Linktree)

### Referência
A imagem mostra um link-in-bio minimalista: fundo claro/branco, foto circular sem moldura, @username em destaque, botões escuros (dark cards) com texto centralizado e menu de 3 pontos.

### Mudanças

**1. Paleta de cores** (`src/index.css`)
- Ajustar variáveis vlink para tons mais neutros/minimalistas em vez do roxo vibrante atual
- O tema público será: fundo branco/claro, botões escuros (slate/charcoal), texto clean

**2. MobilePreview (`src/components/Link/MobilePreview.tsx`)**
- Remover glow/gradiente no avatar (sem moldura colorida)
- Fundo branco limpo, sem gradientes
- Botões: dark cards (bg-slate-800/900), texto branco, cantos arredondados grandes, sem borda outline
- Footer simplificado
- Remover efeitos de pulse/animação excessivos

**3. ProfileEditHeader (`src/components/Link/ProfileEditHeader.tsx`)**
- Ao clicar na foto: abrir file input para upload de avatar
- Criar dialog de crop/zoom da foto antes de salvar
- Sem moldura/glow no avatar (círculo limpo)

**4. Upload de Avatar — Storage**
- Criar bucket `link-avatars` via SQL migration (público, com RLS)
- Criar componente `AvatarCropDialog` com zoom slider e preview circular
- Ao salvar: upload para bucket, salvar URL no `link_profiles.avatar_url`

**5. ProfilePreview (`src/components/Link/ProfilePreview.tsx`)**
- Mesmo estilo visual: fundo claro, botões escuros, sem moldura na foto

**6. Criação de botões/links melhorada**
- O `EditLinkDialog` já existe — garantir que funcione bem
- No preview, botões devem ser dark cards como na referência

### Arquivos a alterar
| Arquivo | Mudança |
|---------|---------|
| `src/index.css` | Ajustar cores vlink |
| `src/components/Link/MobilePreview.tsx` | Redesign estilo Linktree |
| `src/components/Link/ProfilePreview.tsx` | Mesmo redesign |
| `src/components/Link/ProfileEditHeader.tsx` | Upload de foto clicável + sem moldura |
| `src/components/Link/AvatarCropDialog.tsx` | **Novo** — dialog de crop/zoom |
| `src/components/Link/LinkCard.tsx` | Visual dark card no preview |
| SQL migration | Bucket `link-avatars` + RLS policies |

