## Causa raiz

A rota `/super-admin` em `src/App.tsx` **não está envolvida** por `<AuthProvider>` (diferente das rotas de tenant). Quando o `SuperAdminMigracaoAnexos` abre o `RebindCredencialJuditDialog`, este chama:

- `useTenantId()` → internamente faz `useAuth()` → lança `useAuth must be used within an AuthProvider`.
- `useRebindCredencialJudit()` → também chama `useTenantId()` → mesmo erro.

Como o super-admin já passa `tenantIdOverride` por linha de tenant, não há motivo para o dialog/hook dependerem do `AuthContext` quando o tenant vem por prop.

## Correção

1. **`RebindCredencialJuditDialog.tsx`** — remover a chamada a `useTenantId()`. Usar apenas `tenantIdOverride` (prop). Para o uso atual em Controladoria (`MigracaoAnexosTab`), passar `tenantIdOverride` a partir do `useTenantId()` do componente pai (que está dentro do AuthProvider).

2. **`useRebindCredencialJudit.ts`** — remover `useTenantId()` do hook. Exigir `tenantId` em `RebindParams` (já existe como opcional; tornar obrigatório no uso interno: usar `params.tenantId` direto).

3. **`MigracaoAnexosTab.tsx`** — onde renderiza o dialog, ler `useTenantId()` localmente e repassar como `tenantIdOverride={tenantId}` para manter compatibilidade com o uso tenant-scoped.

Nenhuma mudança em Edge Function, schema, RLS ou no `SuperAdminMigracaoAnexos` (que já passa `tenantIdOverride`).

## Arquivos afetados

- `src/components/Controladoria/RebindCredencialJuditDialog.tsx` (remover useTenantId)
- `src/hooks/useRebindCredencialJudit.ts` (remover useTenantId)
- `src/components/Controladoria/MigracaoAnexosTab.tsx` (passar tenantIdOverride explicitamente)

## Impacto

- **Usuário final:** o botão "Recriar c/ credencial" volta a abrir normalmente em `/super-admin` (hoje quebra a página). Em Controladoria de tenant continua funcionando idêntico.
- **Dados:** nenhum. Sem migration, sem alteração de RLS, sem mudança de payload da Edge Function.
- **Riscos colaterais:** baixos. O dialog e o hook deixam de ler `AuthContext`; ambos só são chamados em telas que já têm o `tenantId` disponível (super-admin via override; controladoria via `useTenantId` no pai).
- **Quem é afetado:** super-admins (correção do crash) e advogados/admin usando Controladoria (sem mudança perceptível).

## Validação

1. Acessar `/super-admin` → aba Judit → clicar **"Recriar c/ credencial"** em uma linha de tenant → dialog abre sem erro.
2. **Contar** retorna número de CNJs elegíveis para aquele tenant.
3. Em uma conta de tenant, abrir **Controladoria → Migração de Anexos → "Recriar com credencial"** → continua abrindo e contando normalmente.
4. Conferir console: sem `useAuth must be used within an AuthProvider`.
