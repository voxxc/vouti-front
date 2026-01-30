

## Plano: Tokens TOTP Compartilhados entre Admin/Controller

### Regra de Negocio

Todos os usuarios com role `admin` ou `controller` do mesmo tenant compartilham:
- As mesmas carteiras (wallets)
- Os mesmos tokens

Se Daniel criar um token, Willian, Jose e Alan (se forem admin/controller do mesmo tenant) verao automaticamente.

---

### Arquitetura

```text
Tenant AMSADV
├── Daniel (admin) ──┐
├── Alan (admin) ────┼──► Mesmas carteiras e tokens
├── Willian (controller) ─┤
└── Jose (controller) ───┘

Tenant Solvenza
├── Maria (admin) ───┐
└── Joao (controller)┴──► Carteiras/tokens separados
```

---

### Estrutura do Banco de Dados

#### Tabela: totp_wallets

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| tenant_id | uuid | FK para tenants (isolamento) |
| name | text | Nome do advogado |
| oab_numero | text | Numero OAB (opcional) |
| oab_uf | text | UF da OAB (opcional) |
| created_at | timestamptz | Data criacao |
| created_by | uuid | Quem criou |

#### Tabela: totp_tokens

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| tenant_id | uuid | FK para tenants (isolamento) |
| wallet_id | uuid | FK para totp_wallets |
| name | text | Nome do servico (Gmail, Projudi...) |
| secret | text | Secret Base32 |
| created_at | timestamptz | Data criacao |
| created_by | uuid | Quem criou |

---

### Controle de Acesso (RLS)

Funcao helper para verificar se usuario e admin ou controller:

```sql
CREATE OR REPLACE FUNCTION public.is_admin_or_controller_in_tenant()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = get_user_tenant_id()
      AND role IN ('admin', 'controller')
  )
$$;
```

Politicas aplicadas:
- **SELECT**: tenant_id = get_user_tenant_id() AND is_admin_or_controller_in_tenant()
- **INSERT**: tenant_id = get_user_tenant_id() AND is_admin_or_controller_in_tenant()
- **UPDATE**: tenant_id = get_user_tenant_id() AND is_admin_or_controller_in_tenant()
- **DELETE**: tenant_id = get_user_tenant_id() AND is_admin_or_controller_in_tenant()

---

### Componentes a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| Migration SQL | CRIAR | Tabelas + RLS + funcao helper |
| `src/hooks/useTOTPData.ts` | CRIAR | Hook para CRUD via Supabase |
| `src/types/totp.ts` | MODIFICAR | Adicionar campos tenant_id, created_by |
| `src/components/Dashboard/TOTPSheet.tsx` | MODIFICAR | Usar hook em vez de localStorage |
| `src/components/Dashboard/TOTP/AddWalletDialog.tsx` | MODIFICAR | Passar tenantId |
| `src/components/Dashboard/TOTP/AddTokenDialog.tsx` | MODIFICAR | Passar tenantId |
| `src/components/Dashboard/TOTP/WalletCard.tsx` | VERIFICAR | Compatibilidade com novos tipos |

---

### Hook useTOTPData

```typescript
export function useTOTPData(tenantId: string | null) {
  // Queries
  const { data: wallets } = useQuery({
    queryKey: ['totp-wallets', tenantId],
    queryFn: () => supabase.from('totp_wallets').select('*').eq('tenant_id', tenantId),
    enabled: !!tenantId
  });

  const { data: tokens } = useQuery({
    queryKey: ['totp-tokens', tenantId],
    queryFn: () => supabase.from('totp_tokens').select('*').eq('tenant_id', tenantId),
    enabled: !!tenantId
  });

  // Mutations para add/delete wallet e token
  
  return { wallets, tokens, addWallet, addToken, deleteWallet, deleteToken, isLoading };
}
```

---

### Migracao de Dados Locais

Ao abrir TOTPSheet:
1. Verificar se ha dados no localStorage (`vouti_totp_tokens`)
2. Se houver e usuario for admin/controller, mostrar botao "Migrar para sistema"
3. Inserir no banco com tenant_id do usuario
4. Limpar localStorage
5. Toast de sucesso

---

### Fluxo de Uso

```text
1. Daniel abre o TOTPSheet
2. Hook busca wallets/tokens do tenant_id dele
3. Daniel cria nova carteira "Alan Maran"
4. INSERT no banco com tenant_id
5. Alan abre o TOTPSheet (mesmo tenant)
6. Hook busca os mesmos dados (tenant_id igual)
7. Alan ve a carteira "Alan Maran" criada por Daniel
```

---

### Resultado Esperado

- Todos os admin/controller do mesmo tenant veem os mesmos tokens
- Isolamento total entre tenants diferentes
- Dados persistidos no banco (nao mais localStorage)
- Migracao automatica de tokens antigos

