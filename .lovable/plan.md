

## Corrigir Politica RLS Publica na Tabela link_profiles

### Problema

A tabela `link_profiles` tem uma politica SELECT chamada "Public can view profiles by username" com `USING(true)`, permitindo que **qualquer pessoa sem autenticacao** leia todos os 27 perfis, incluindo nomes completos, usernames e avatar URLs.

### Analise do codigo

Apenas dois locais no frontend consultam `link_profiles`:
- `src/contexts/LinkAuthContext.tsx` - busca o perfil do usuario logado (`eq('user_id', userId)`)
- `src/pages/LinkDashboard.tsx` - atualiza o perfil do usuario logado (`eq('id', profile.id)`)

Ambos exigem autenticacao. Nao existe nenhuma pagina publica que consulte perfis por username sem auth.

### O que sera feito

Remover a politica publica e manter apenas as politicas existentes que ja cobrem o acesso autenticado:

```text
Remover:  "Public can view profiles by username" -> USING(true) para role anon+authenticated
Manter:   "Users can view their own link profile" -> USING(auth.uid() = user_id)
Manter:   "Users can update their own link profile" -> USING(auth.uid() = user_id)
```

### Detalhes tecnicos

**Migracao SQL:**

```sql
DROP POLICY IF EXISTS "Public can view profiles by username" ON link_profiles;
```

Apenas uma linha. As politicas existentes "Users can view their own link profile" e "Users can update their own link profile" ja garantem que usuarios autenticados acessem apenas seus proprios dados. Nenhuma alteracao no frontend e necessaria.

