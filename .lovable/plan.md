

## Plano: Migrar Auth do Link-in-Bio para Email + Senha Normal

### Problema Atual
O sistema usa um hack: converte `username` → `username@vlink.bio` para criar contas no Supabase Auth. Isso causa problemas quando usuários são criados com emails reais (ex: `danieldemorais@vouti.co`), pois o login tenta `danieldemorais@vlink.bio` e falha.

### Solução
Mudar o formulário de login/cadastro para usar **email real + username + senha**. O username continua sendo usado para a URL pública do perfil, mas a autenticação usa o email real.

### Alterações

**1. `src/pages/LinkAuth.tsx`** — Formulário
- **Login**: trocar campo "Username" por "Email" (type=email)
- **Cadastro**: adicionar campo "Email" (obrigatório) + manter "Username" (obrigatório, para URL pública) + "Nome" + "Senha"
- Ajustar validações

**2. `src/contexts/LinkAuthContext.tsx`** — Lógica de auth
- `signIn(email, password)` — usar email direto, sem converter para `@vlink.bio`
- `signUp(email, username, password, fullName?)` — usar email real, passar username nos metadados
- Atualizar interface `LinkAuthContextType` para refletir os novos parâmetros

**3. Trigger `handle_new_link_user`** — Migração SQL
- Atualmente extrai username do email (`split_part(NEW.email, '@', 1)`). Precisa mudar para pegar do `raw_user_meta_data->>'username'`
- Atualizar a condição do trigger: em vez de filtrar por `@vouti.bio` / `@vlink.bio`, usar um metadata flag (ex: `raw_user_meta_data->>'app' = 'linkbio'`)
- Atualizar `handle_new_user` para ignorar usuários com esse metadata flag

**4. Corrigir usuário `danieldemorais`**
- O user `8eda80fa-0319-4791-923e-551052282e62` já existe com email `danieldemorais@vouti.co` e já tem `link_profiles` criado com username `danieldemorais`. Funcionará automaticamente com a nova lógica (login com email real).

### Fluxo após correção

```text
Cadastro: email real + username + senha
  → Supabase Auth cria user com email real
  → Trigger lê username do metadata
  → Cria link_profiles com username

Login: email real + senha
  → Supabase Auth valida direto
  → Carrega link_profiles pelo user_id
```

### Resumo de arquivos
| Arquivo | Mudança |
|---------|---------|
| `src/pages/LinkAuth.tsx` | Campos email + username no form |
| `src/contexts/LinkAuthContext.tsx` | signIn/signUp com email real |
| Migração SQL | Trigger `handle_new_link_user` usa metadata |
| Migração SQL | Trigger `handle_new_user` ignora por metadata |

