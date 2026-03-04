

## Plano: Migrar rotas do Link-in-Bio para `/linkbio` e corrigir acesso do danieldemorais

### 1. Corrigir build error do PWA
O bundle JS (10.2 MB) excede o limite de cache do PWA (5 MB). Aumentar `maximumFileSizeToCacheInBytes` para `11 * 1024 * 1024` em `vite.config.ts`.

### 2. Reestruturar rotas para `/linkbio/...`
Alterar todas as rotas do sistema Link-in-Bio:
- `/link-auth` → `/linkbio`  (página de auth)
- `/link-dashboard` → `/linkbio/dashboard`

**Arquivos a alterar:**
- `src/App.tsx` — rotas e guards (`LinkProtectedRoute`, `LinkPublicRoute`)
- `src/pages/LinkAuth.tsx` — navegação para dashboard
- `src/contexts/LinkAuthContext.tsx` — `emailRedirectTo` no signup
- `src/pages/LandingPage1.tsx`, `LandingPage2.tsx`, `BatinkLanding.tsx` — código secreto `vlink`

### 3. Corrigir acesso do `danieldemorais`
O usuário foi criado com email `danieldemorais@vouti.co` mas o login converte username para `username@vlink.bio`. Precisa atualizar o email na tabela `auth.users` via SQL Editor ou Edge Function.

**Opção recomendada:** Executar via SQL Editor no Supabase Dashboard:
```sql
-- Atualizar email do usuário para o formato correto
UPDATE auth.users SET email = 'danieldemorais@vlink.bio' WHERE id = '8eda80fa-0319-4791-923e-551052282e62';
```
*(Não posso executar isso via migration pois é schema `auth` reservado — ação manual no Dashboard.)*

### 4. Adicionar redirect legado
Redirecionar `/link-auth` → `/linkbio` e `/link-dashboard` → `/linkbio/dashboard` para não quebrar links existentes.

### Resumo de alterações
| Arquivo | Mudança |
|---------|---------|
| `vite.config.ts` | Aumentar limite PWA cache |
| `src/App.tsx` | Rotas `/linkbio` + `/linkbio/dashboard` + redirects legados |
| `src/pages/LinkAuth.tsx` | Navegação → `/linkbio/dashboard` |
| `src/contexts/LinkAuthContext.tsx` | `emailRedirectTo` → `/linkbio/dashboard` |
| `src/pages/LandingPage1.tsx` | Código secreto → `/linkbio` |
| `src/pages/LandingPage2.tsx` | Código secreto → `/linkbio` |
| `src/pages/BatinkLanding.tsx` | Código secreto → `/linkbio` |
| **Manual (Dashboard)** | Atualizar email do `danieldemorais` em `auth.users` |

