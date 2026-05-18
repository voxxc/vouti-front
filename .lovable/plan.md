# Acesso global do suporte@vouti.co a qualquer tenant

## Causa raiz

O backend já tem o conceito de "conta de suporte global":
- `profiles.is_support = true` para `suporte@vouti.co` (já está marcado no banco).
- `AuthContext.tsx` (linhas 142-156) reconhece `is_support` e assume o tenant da URL com role `admin`, chamando o RPC `support_assume_tenant`.

O problema é o **gate de login** em `src/pages/Auth.tsx` (linhas 66-108): após o `signInWithPassword`, ele bloqueia qualquer usuário que não seja `super_admin` **e** não tenha linha em `user_roles` para aquele tenant. A conta de suporte não está em `super_admins` nem em `user_roles` dos outros tenants → cai no `signOut` + toast vermelho "Acesso negado" que aparece na captura.

Resumo: o suporte tem permissão no resto do sistema, mas é deslogado antes que o `AuthContext` execute o branch de suporte.

## Correção

Estender o gate de `Auth.tsx` para também liberar contas de suporte global, ao lado do super admin:

```text
login OK
  ├── é super_admin?  → libera
  ├── profiles.is_support = true?  → libera (novo)
  └── tem user_roles no tenant?    → libera, senão signOut + "Acesso negado"
```

A consulta extra é uma única leitura em `profiles` (`is_support`) feita logo após o login, antes da checagem de `user_roles`. Nenhuma mudança no `AuthContext` (ele já trata o caso).

Opcional (cosmético): aplicar o mesmo gate em `src/pages/CrmLogin.tsx` que tem checagem equivalente para o CRM standalone, para o suporte conseguir abrir o CRM de qualquer tenant também.

## Arquivos afetados

- `src/pages/Auth.tsx` — adicionar leitura de `profiles.is_support` no bloco de validação pós-login e fazer bypass quando `true`.
- `src/pages/CrmLogin.tsx` — mesmo tratamento no gate do CRM (opcional, mas recomendado para o suporte poder entrar no CRM de qualquer tenant).

Nada de migration, nada de tabela nova, nada de mudança de RLS — toda a infraestrutura (`support_assume_tenant`, branch no `AuthContext`, flag no profile) já existe.

## Impacto

1. **UX/usuário final**
   - `suporte@vouti.co` passa a conseguir logar em `/{slug}/auth` (e `/{slug}/crm/login`) de **qualquer** tenant existente ou futuro, automaticamente, sem precisar ser cadastrado em `user_roles` de cada um.
   - Dentro do tenant, o suporte é tratado como `admin` (já é o comportamento do `AuthContext` quando `is_support` está ativo).
   - Tenants novos criados depois ganham acesso do suporte sem nenhuma ação adicional.
   - Os demais usuários continuam vendo "Acesso negado" se tentarem logar no tenant errado — o gate só relaxa para `super_admin` ou `is_support`.

2. **Dados**
   - Zero migrations. Zero alteração de RLS.
   - `suporte@vouti.co` continua **não** aparecendo em `user_roles` de outros tenants, exatamente como você pediu (não vira "usuário registrado" do tenant).
   - O RPC `support_assume_tenant` já existente é quem garante o acesso runtime; nenhuma linha nova é criada.

3. **Riscos colaterais**
   - Qualquer profile com `is_support=true` passa a ter acesso `admin` em todos os tenants — hoje só `suporte@vouti.co` tem essa flag. Conceder essa flag a outros usuários precisa ser feito com cuidado (apenas via SQL/super admin).
   - Logs de auditoria por usuário continuam registrando o `user_id` do suporte (não impersona outro usuário), então fica rastreável quem fez cada ação.
   - Sem efeito sobre tenants em que o suporte já é admin "real" (ex.: `cordeiro`): comportamento idêntico ao atual.

4. **Quem é afetado**
   - Conta `suporte@vouti.co` (ganha acesso amplo).
   - Super admin (`danieldemorais@vouti.co`): inalterado.
   - Admins, advogados e demais usuários dos tenants: inalterados.

## Validação

1. Logar com `suporte@vouti.co` em `/{slug-de-outro-tenant}/auth` → deve entrar no dashboard sem ver toast vermelho.
2. Repetir o login em um terceiro tenant qualquer → mesmo resultado.
3. Logar com um email **não** cadastrado em `user_roles` e **sem** `is_support` no mesmo tenant → deve continuar mostrando "Acesso negado" (gate preservado).
4. `suporte@vouti.co` no tenant `cordeiro` (onde já é admin real) → continua funcionando.
5. Conferir que `user_roles` **não** ganhou linhas novas para o suporte após o login.
