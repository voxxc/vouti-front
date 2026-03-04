

## Plano: Página pública do Link-in-Bio em `/:username`

### Objetivo
Permitir que terceiros acessem o perfil público de links em `vouti.co/danieldemorais` (ou `vouti.lovable.app/danieldemorais`).

### Análise de conflito de rotas
- Todas as rotas tenant existentes têm **dois ou mais segmentos** (`/:tenant/auth`, `/:tenant/dashboard`, etc.)
- Uma rota `/:username` (segmento único) **não conflita** desde que seja declarada **depois** das rotas estáticas (`/`, `/install`, `/linkbio`, etc.)
- React Router resolve pela ordem: rotas estáticas primeiro, depois dinâmicas

### Alterações

**1. Criar `src/pages/LinkPublicProfile.tsx`** — Nova página pública
- Recebe `:username` da URL via `useParams`
- Busca `link_profiles` pelo username (query pública, sem auth)
- Busca `link_items` ativos do profile
- Renderiza o perfil estilo Linktree (reutiliza visual do `ProfilePreview`/`MobilePreview`)
- Registra cliques nos links (incrementa `clicks` via RPC ou update)
- Exibe 404 se username não encontrado

**2. Atualizar `src/App.tsx`** — Adicionar rota
- Adicionar `<Route path="/:username" element={<LinkPublicProfile />} />` **antes** do catch-all `*` e **depois** de todas as rotas estáticas e `/:tenant/*`
- Sem wrapper de auth (página pública)

**3. SQL Migration** — RLS para acesso público
- Adicionar policy `SELECT` na tabela `link_profiles` para `anon` (where `true` ou filtrado)
- Adicionar policy `SELECT` na tabela `link_items` para `anon` (links ativos)
- Adicionar policy `UPDATE` na tabela `link_items` para `anon` apenas no campo `clicks` (ou usar edge function)

**4. Atualizar `MobilePreview` e `LinkDashboard`**
- Mostrar a URL pública correta (`vouti.co/{username}`) no preview e settings

### Fluxo
```text
Visitante acessa vouti.co/danieldemorais
  → React Router match /:username
  → LinkPublicProfile busca profile + links
  → Renderiza página pública estilo Linktree
  → Clique em link → incrementa clicks + redirect
```

### Arquivos
| Arquivo | Mudança |
|---------|---------|
| `src/pages/LinkPublicProfile.tsx` | **Novo** — página pública |
| `src/App.tsx` | Rota `/:username` |
| SQL migration | RLS anon para `link_profiles` e `link_items` |
| `src/pages/LinkDashboard.tsx` | URL pública no settings |

