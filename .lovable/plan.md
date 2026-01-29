

## Plano: Notificação de Pagamentos Pendentes no Super Admin

### Situação Atual
Quando um cliente confirma um pagamento, **nada aparece automaticamente** no painel do Super Admin. As confirmações pendentes só são visíveis ao abrir "Gerenciar Pagamentos" de um cliente específico, na aba "Confirmações".

### Proposta de Solução
Criar um sistema de notificação similar ao que já existe para "Credenciais Pendentes":

```text
┌─────────────────────────────────────────────────────────────────┐
│  VOUTI.    Painel de Controle                                   │
│                                                                 │
│                     [Credenciais (3)] [💳 Pagamentos (5)] [Sair]│
│                           ↑                    ↑                │
│                    Badge vermelho       NOVO! Badge vermelho    │
└─────────────────────────────────────────────────────────────────┘
```

Além disso, adicionar badge no botão de pagamentos de cada TenantCard:

```text
┌──────────────────────────────────────┐
│  Cliente ABC              [Ativo]   │
│  ────────────────────────────────── │
│  [Config] [📊] [📈] [🔑] [💳 2] [🔗]│
│                             ↑       │
│                       Badge vermelho│
│                       "2 pendentes" │
└──────────────────────────────────────┘
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useAllPaymentConfirmations.ts` | Hook para buscar todas confirmações pendentes de todos os tenants |

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/SuperAdmin.tsx` | Adicionar botão "Pagamentos" no header com badge de pendentes |
| `src/components/SuperAdmin/TenantCard.tsx` | Adicionar badge no botão de pagamentos mostrando pendentes do tenant |

---

## Detalhes Técnicos

### 1. Hook `useAllPaymentConfirmations`

```typescript
// src/hooks/useAllPaymentConfirmations.ts
export function useAllPaymentConfirmations() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['all-payment-confirmations-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_pagamento_confirmacoes')
        .select('id, tenant_id, boleto_id, metodo, status, created_at')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Agrupar por tenant_id para contar por cliente
  const porTenant = (data || []).reduce((acc, item) => {
    acc[item.tenant_id] = (acc[item.tenant_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    confirmacoes: data || [],
    totalPendentes: data?.length || 0,
    porTenant,
    isLoading,
    refetch,
  };
}
```

### 2. Botão no Header do SuperAdmin

No `src/pages/SuperAdmin.tsx`, adicionar junto ao botão de Credenciais:

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => setPagamentosDialogOpen(true)}
  className="relative"
>
  <CreditCard className="h-4 w-4 mr-2" />
  Pagamentos
  {totalPagamentosPendentes > 0 && (
    <Badge 
      variant="destructive" 
      className="absolute -top-2 -right-2 h-5 min-w-5 p-0 flex items-center justify-center text-xs"
    >
      {totalPagamentosPendentes}
    </Badge>
  )}
</Button>
```

### 3. Badge no TenantCard

No `src/components/SuperAdmin/TenantCard.tsx`, modificar o botão de pagamentos:

```typescript
// Receber props do hook de pagamentos
interface TenantCardProps {
  // ... existentes
  pendingPayments?: number;
}

// Botão com badge
<Button 
  variant="ghost" 
  size="sm" 
  className="gap-2 relative"
  onClick={() => setShowBoletos(true)}
  title="Gerenciar pagamentos"
>
  <CreditCard className="h-4 w-4" />
  {pendingPayments > 0 && (
    <Badge 
      variant="destructive" 
      className="absolute -top-1 -right-1 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]"
    >
      {pendingPayments}
    </Badge>
  )}
</Button>
```

---

## Fluxo Visual

```text
Cliente confirma pagamento
         ↓
Registro salvo em tenant_pagamento_confirmacoes (status: pendente)
         ↓
Hook useAllPaymentConfirmations detecta (refetch a cada 30s)
         ↓
Badge aparece no header: [💳 Pagamentos (1)]
         ↓
Badge aparece no card do cliente: [💳 1]
         ↓
Super Admin clica → abre dialog → aprova/rejeita
         ↓
Badge desaparece após aprovação
```

---

## Benefícios

1. **Visibilidade imediata**: Super Admin vê notificação sem precisar abrir cada cliente
2. **Contagem global**: Badge no header mostra total de todos os clientes
3. **Contagem individual**: Badge no card mostra quantos de cada cliente
4. **Atualização automática**: Refresh a cada 30 segundos
5. **Consistência visual**: Segue o mesmo padrão do badge de Credenciais

