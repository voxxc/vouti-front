

## Ajustar rotas do Vouti.CRM: `/crm/:tenant/auth` para login

### Problema atual

As rotas do CRM estao assim:
- `/crm/:tenant` → Login (CrmLogin)
- `/crm/:tenant/app` → App (CrmApp)

O padrao correto (espelhando o sistema principal `/:tenant/auth`) deve ser:
- `/crm/:tenant/auth` → Login (CrmLogin)
- `/crm/:tenant` → App (CrmApp) - redireciona para `/crm/:tenant/auth` se nao logado

Alem disso, o tenant "Volkov" nao carrega porque a busca no banco e case-sensitive (ja corrigido com `.ilike` na ultima edicao).

### O que sera feito

**1. Trocar as rotas no `App.tsx`**

| Rota atual | Nova rota | Componente |
|---|---|---|
| `/crm/:tenant` | `/crm/:tenant/auth` | CrmLogin |
| `/crm/:tenant/app` | `/crm/:tenant` | CrmApp |

**2. Atualizar navegacoes no `CrmLogin.tsx`**

- Apos login bem-sucedido: `navigate(/crm/${tenant}/app)` vira `navigate(/crm/${tenant})`
- Redirect de usuario ja logado: mesma mudanca

**3. Atualizar navegacao no `CrmApp.tsx`**

- Redirect quando nao logado: `navigate(/crm/${tenant})` vira `navigate(/crm/${tenant}/auth)`

**4. Atualizar URL de acesso no `CreateCrmTenantDialog.tsx`**

- Texto de preview: `vouti.co/crm/{slug}` (sem mudanca, ja esta correto -- o usuario acessa a raiz e o app carrega)

### Secao tecnica

**Arquivos modificados:**

| Arquivo | Mudanca |
|---|---|
| `src/App.tsx` | Trocar ordem: `/crm/:tenant/auth` → CrmLogin, `/crm/:tenant` → CrmApp |
| `src/pages/CrmLogin.tsx` | Mudar redirects de `/crm/${tenant}/app` para `/crm/${tenant}` |
| `src/pages/CrmApp.tsx` | Mudar redirect de `/crm/${tenant}` para `/crm/${tenant}/auth` |

**Ordem das rotas** (importante no React Router):
```text
/crm                    → Redirect para /
/crm/:tenant/auth       → CrmLogin
/crm/:tenant            → CrmApp
```

A rota mais especifica (`/crm/:tenant/auth`) deve vir antes da mais generica (`/crm/:tenant`).

