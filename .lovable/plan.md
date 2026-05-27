## Causa raiz

Em `src/App.tsx` (domínio principal `vouti.co`) não existe rota exata para `/:tenant`. O slot `/:slug` é hoje ocupado por `<Route path="/:username" element={<LinkPublicProfile />} />` (linha 743), então `vouti.co/solvenza` cai no perfil público do Link-in-Bio em vez de levar para o auth do tenant. Quem não está logado precisa digitar `/solvenza/auth` manualmente.

No subdomínio `crm.vouti.co` o comportamento desejado já existe: `/:tenant` → `CrmApp` → redireciona para `/crm/:tenant/auth` quando não logado. Não mexo nessa parte.

## Correção

Criar um resolver `TenantOrUsernameRoute` que, ao bater em `/:slug`:

1. Chama o RPC público `get_tenant_by_slug` (já usado pelo `TenantContext`) para descobrir se o slug é um tenant ativo.
2. Se for tenant → `<Navigate to="/:slug/auth" replace />` (o `PublicRoute` do auth já manda para `/dashboard` quando há sessão, então usuário logado segue direto para o dashboard).
3. Se não for tenant → renderiza `LinkPublicProfile` (comportamento atual de Link-in-Bio).
4. Enquanto a checagem roda, mostra o mesmo fallback de loading usado nas outras rotas tenant.

Substituir o `<Route path="/:username" ... />` por `<Route path="/:slug" element={<TenantOrUsernameRoute />} />`. Sem novas migrations, sem mudanças de RLS.

## Arquivos afetados

- `src/components/Routing/TenantOrUsernameRoute.tsx` (novo): resolver com `useParams` + `supabase.rpc('get_tenant_by_slug')` + `useState` para `loading | tenant | notTenant`.
- `src/App.tsx`: trocar a rota `/:username` por `/:slug` apontando para o novo componente. Importar `TenantOrUsernameRoute`.

## Impacto

1. **Usuário final (UX):**
   - `vouti.co/solvenza` agora abre a tela de login do tenant. Se já tiver sessão válida, o `PublicRoute` do `/:tenant/auth` redireciona para `/:tenant/dashboard` automaticamente — então o efeito prático é "digita o slug e cai no dashboard se já estou logado".
   - Perfis Link-in-Bio com username diferente de qualquer slug de tenant continuam funcionando idênticos.
   - Pequeno flash de loading (~100–300 ms) em `/:slug` enquanto o RPC roda; sem tela em branco.

2. **Dados:** nenhum. Nenhuma migration, nenhuma alteração de RLS, nenhuma escrita. Apenas uma leitura extra via `get_tenant_by_slug` (RPC público já existente, leve).

3. **Riscos colaterais:**
   - **Colisão de namespace:** se algum dia for criado um username de Link-in-Bio idêntico a um slug de tenant, o tenant ganha prioridade e o perfil público fica inacessível por esse caminho. Hoje não há colisão conhecida; vale documentar.
   - Rotas reservadas já tratadas antes (`/super-admin`, `/votech`, `/spn`, `/crm`, `/install`, `/wa`, `/`) não são afetadas porque o React Router casa rotas estáticas antes de `/:slug`.
   - Subdomínio `crm.vouti.co` não muda (bloco `isCrmDomain` permanece igual).

4. **Quem é afetado:** todos os tenants do domínio principal `vouti.co` / preview Lovable. Super admin, advogado, financeiro etc. todos ganham o atalho. Tenants do `crm.vouti.co` não mudam. Donos de perfis Link-in-Bio só são afetados em caso de colisão de nome (ver risco acima).

## Validação

1. Logado em `solvenza`: abrir `vouti.co/solvenza` → deve cair em `/solvenza/dashboard`.
2. Deslogado: abrir `vouti.co/solvenza` → deve cair em `/solvenza/auth`.
3. Slug inexistente como tenant mas existente como Link-in-Bio (ex.: `vouti.co/joaosilva`) → deve renderizar `LinkPublicProfile` como antes.
4. Slug que não é nem tenant nem perfil → `LinkPublicProfile` cuida do "perfil não encontrado" como hoje.
5. `crm.vouti.co/solvenza` → continua entrando direto no `CrmApp` (sem alteração).
