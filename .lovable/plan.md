

## Plano: Proteger senhas na tabela `credenciais_cliente`

### Problema
A política RLS de SELECT usa apenas `tenant_id = get_user_tenant_id()`, permitindo que **qualquer membro** do tenant leia senhas e secrets de credenciais criadas por outros usuários.

### Contexto do uso atual
- **Clientes** criam credenciais via `SubscriptionDrawer.tsx` (formulário)
- **Super Admin** lê e envia para Judit via `TenantCredenciaisDialog.tsx`
- As senhas precisam ser recuperáveis (enviadas à API Judit), então não podem ser hasheadas

### Solução: Restringir acesso + mascarar dados sensíveis

**1. Migration: adicionar `created_by` e restringir RLS**
- Adicionar coluna `created_by UUID REFERENCES auth.users(id)` na `credenciais_cliente`
- Preencher registros existentes com `enviado_por` onde disponível
- Substituir a política SELECT por:
  - O **criador** (`created_by = auth.uid()`) pode ver tudo
  - **Admin/controller** do tenant pode ver tudo (precisam enviar para Judit)
  - Demais membros do tenant **não veem** as credenciais de outros
- Adicionar política para super_admins (`is_super_admin(auth.uid())`)

**2. Atualizar `useCredenciaisCliente.ts`**
- Gravar `created_by: user.id` ao inserir nova credencial

**3. Atualizar `SubscriptionDrawer.tsx`**
- Sem mudança visual, apenas garantir que o `created_by` é preenchido

### RLS proposta
```sql
-- SELECT: criador, admin/controller do tenant, ou super admin
CREATE POLICY "credenciais_select_restrito" ON credenciais_cliente
FOR SELECT USING (
  tenant_id = get_user_tenant_id() AND (
    created_by = auth.uid()
    OR is_admin_or_controller_in_tenant()
  )
  OR is_super_admin(auth.uid())
);
```

### Arquivos
| Acao | Arquivo |
|------|---------|
| Migration | Nova coluna `created_by` + RLS restrita |
| Editar | `src/hooks/useCredenciaisCliente.ts` (gravar `created_by`) |

### Resultado
- Estagiários e advogados comuns só veem as credenciais que eles mesmos criaram
- Admins e controllers continuam vendo tudo do tenant (necessário para gestão)
- Super admins mantêm acesso total
- Senhas continuam recuperáveis para envio à API Judit

