

# Criação dedicada de Link-in-Bio pelo Super Admin

## Problema atual

O Super Admin usa o mesmo `SystemTypeSection` + `CreateTenantDialog` para todos os system types, incluindo Link-in-Bio. Isso cria um **tenant** (tabela `tenants`) com profile/user_roles do sistema jurídico — completamente errado para Link-in-Bio, que usa `link_profiles` e `link_user_roles`.

Existe um tenant incorreto "amsadvocacia" (id: `4f1f0568-...`) criado assim.

## Solução

### 1. Limpeza: remover tenant incorreto "amsadvocacia"
- Deletar o tenant `4f1f0568-dfe6-40f1-a73c-c77b62459383` e dados associados (profiles, user_roles) via SQL

### 2. Nova Edge Function: `create-linkbio-profile`
- Recebe: `username`, `full_name`, `email`, `password`, `bio` (opcional)
- Valida unicidade do username em `link_profiles`
- Cria auth user com `raw_user_meta_data: { app: 'linkbio', username, full_name }`
- O trigger `handle_new_user` já cuida de criar o `link_profiles` e `link_user_roles` automaticamente
- Retorna o perfil criado

### 3. Novo componente: `LinkBioSection.tsx`
Substitui `SystemTypeSection` quando o system_type é Link-in-Bio:
- Lista perfis de `link_profiles` (não tenants)
- Mostra: username, full_name, URL pública (`vouti.co/{username}`), quantidade de links
- Botões: criar novo, editar, excluir perfil
- Botão "Criar Novo" abre dialog dedicado

### 4. Novo componente: `CreateLinkBioDialog.tsx`
Dialog com campos específicos:
- Username (será a URL pública)
- Nome completo
- Bio (opcional)
- Email
- Senha + confirmação
- Preview da URL: `vouti.co/{username}`

### 5. Hook: `useSuperAdminLinkBio.ts`
- `fetchProfiles()`: busca todos os `link_profiles` com contagem de links
- `createProfile()`: chama edge function `create-linkbio-profile`
- `deleteProfile()`: remove perfil e usuário auth
- `toggleStatus()`: ativa/desativa perfil (se campo existir)

### 6. Modificar `SuperAdmin.tsx` (aba Clientes)
No loop de `systemTypes.map()`, detectar quando `systemType.code === 'linkinbio'` e renderizar `LinkBioSection` em vez de `SystemTypeSection`.

## Fluxo do usuário após a implementação

1. Super Admin abre aba "Clientes"
2. Na seção "Gestão Link-in-Bio", vê todos os perfis existentes com username e URL
3. Clica "Criar Novo Perfil"
4. Preenche: username `amsadvocacia`, nome, email, senha
5. Sistema cria auth user + link_profile
6. Cliente acessa `vouti.co/linkbio` para fazer login e gerenciar links
7. Público acessa `vouti.co/amsadvocacia` para ver os links

## Arquivos envolvidos

- **Novo**: `supabase/functions/create-linkbio-profile/index.ts`
- **Novo**: `src/components/SuperAdmin/LinkBioSection.tsx`
- **Novo**: `src/components/SuperAdmin/CreateLinkBioDialog.tsx`
- **Novo**: `src/hooks/useSuperAdminLinkBio.ts`
- **Modificar**: `src/pages/SuperAdmin.tsx` — condicional para LinkBioSection
- **SQL**: Limpeza do tenant incorreto + deletar dados orphaned

