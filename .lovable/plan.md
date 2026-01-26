

## Pagamento Parcial com Saldo em Aberto

### Contexto

Atualmente, ao dar baixa em uma parcela, o sistema sempre define o status como "pago", mesmo quando o valor pago e menor que o valor da parcela. O usuario deseja:
1. Uma caixa de selecao para indicar "Pagamento Parcial"
2. O saldo restante deve permanecer em aberto e sinalizado

### Solucao Proposta

**Adicionar novo status "parcial"** na parcela para indicar claramente que houve pagamento mas ainda ha saldo pendente.

```text
Status Possiveis:
┌─────────────┬────────────────────────────────────────┐
│ pendente    │ Aguardando pagamento                   │
│ atrasado    │ Vencida e nao paga                     │
│ parcial     │ NOVO - Pagamento parcial realizado     │
│ pago        │ Quitada integralmente                  │
└─────────────┴────────────────────────────────────────┘
```

---

### 1. Alteracoes no Banco de Dados

**Migration SQL:**
```sql
-- O tipo ENUM do status precisa ser alterado para incluir 'parcial'
-- Como cliente_parcelas usa TEXT para status, basta garantir que a aplicacao aceite

-- Adicionar coluna para rastrear saldo restante (opcional mas util)
ALTER TABLE cliente_parcelas 
ADD COLUMN IF NOT EXISTS saldo_restante NUMERIC DEFAULT 0;
```

---

### 2. Atualizar Types

**`src/types/financeiro.ts`:**
```typescript
export interface ClienteParcela {
  // ... campos existentes
  status: 'pendente' | 'pago' | 'atrasado' | 'parcial'; // Adicionar 'parcial'
  saldo_restante?: number; // Novo campo
}

export interface DadosBaixaPagamento {
  // ... campos existentes
  pagamento_parcial?: boolean; // Novo campo
}
```

---

### 3. Modificar BaixaPagamentoDialog

**`src/components/Financial/BaixaPagamentoDialog.tsx`:**

Adicionar checkbox "Pagamento Parcial":
```typescript
const [isPagamentoParcial, setIsPagamentoParcial] = useState(false);
const valorParcela = parcela?.valor_parcela || 0;
const valorPagoNum = parseFloat(valorPago) || 0;
const saldoRestante = valorParcela - valorPagoNum;

// Mostrar alerta se valor pago < valor parcela e checkbox nao marcado
const showPartialWarning = valorPagoNum < valorParcela && !isPagamentoParcial;
```

**UI:**
```text
┌────────────────────────────────────────────────┐
│ Registrar Pagamento                            │
├────────────────────────────────────────────────┤
│ Parcela #3                                     │
│ Valor: R$ 1.500,00                             │
│ Vencimento: 10/02/2026                         │
│                                                │
│ Data do Pagamento: [___________]               │
│ Metodo:            [Selecione ▼]               │
│ Valor Pago:        [1.000,00___]               │
│                                                │
│ ☑ Pagamento Parcial                           │
│ ┌────────────────────────────────────────┐    │
│ │ ⚠ Saldo restante: R$ 500,00            │    │
│ │   A parcela permanecera em aberto.     │    │
│ └────────────────────────────────────────┘    │
│                                                │
│ Comprovante: [Selecionar arquivo]              │
│ Observacoes: [______________________]          │
│                                                │
│              [Cancelar] [Registrar Pagamento]  │
└────────────────────────────────────────────────┘
```

---

### 4. Atualizar Hook useClienteParcelas

**`src/hooks/useClienteParcelas.ts`:**

Modificar funcao `darBaixaParcela`:
```typescript
const darBaixaParcela = async (parcelaId: string, dados: DadosBaixaPagamento) => {
  // ... codigo existente de upload ...
  
  const parcela = parcelas.find(p => p.id === parcelaId);
  const valorParcela = parcela?.valor_parcela || 0;
  const saldoRestante = valorParcela - dados.valor_pago;
  
  // Determinar status baseado no pagamento
  let novoStatus: string;
  if (dados.pagamento_parcial && saldoRestante > 0) {
    novoStatus = 'parcial';
  } else {
    novoStatus = 'pago';
  }
  
  const { error: updateError } = await supabase
    .from('cliente_parcelas')
    .update({
      status: novoStatus,
      data_pagamento: dados.data_pagamento,
      metodo_pagamento: dados.metodo_pagamento,
      valor_pago: dados.valor_pago,
      saldo_restante: saldoRestante > 0 ? saldoRestante : 0,
      comprovante_url: comprovanteUrl,
      observacoes: dados.observacoes,
    })
    .eq('id', parcelaId);
    
  // Comentario automatico com detalhes
  const comentario = novoStatus === 'parcial' 
    ? `Pagamento parcial de R$ ${dados.valor_pago.toFixed(2)} via ${dados.metodo_pagamento}. Saldo restante: R$ ${saldoRestante.toFixed(2)}`
    : `Pagamento registrado via ${dados.metodo_pagamento}`;
};
```

---

### 5. Atualizar Exibicao na Lista de Parcelas

**`src/components/Financial/ClienteFinanceiroDialog.tsx`:**

Adicionar badge e indicador visual para status "parcial":
```typescript
const getStatusBadge = (status: string) => {
  const variants = {
    pago: { variant: 'default', icon: CheckCircle2, label: 'Pago', className: '' },
    pendente: { variant: 'secondary', icon: Clock, label: 'Pendente', className: '' },
    atrasado: { variant: 'destructive', icon: AlertCircle, label: 'Atrasado', className: '' },
    parcial: { variant: 'warning', icon: AlertTriangle, label: 'Parcial', className: 'bg-amber-500' },
  };
  // ...
};

// Na renderizacao da parcela, mostrar saldo restante se status = 'parcial'
{parcela.status === 'parcial' && parcela.saldo_restante && (
  <div className="text-sm text-amber-600 font-medium">
    Saldo em aberto: {formatCurrency(parcela.saldo_restante)}
  </div>
)}
```

**Visualizacao da parcela com pagamento parcial:**
```text
┌──────────────────────────────────────────────────────────┐
│ Parcela #3        [Parcial ⚠]              [Dar Baixa]  │
│                                                          │
│ Valor: R$ 1.500,00   Vencimento: 10/02/2026             │
│ Pago: R$ 1.000,00    Em: 05/02/2026                     │
│                                                          │
│ ⚠ Saldo em aberto: R$ 500,00                            │
└──────────────────────────────────────────────────────────┘
```

---

### 6. Atualizar Calculos do Dashboard

**`src/pages/Financial.tsx` e `ClienteFinanceiroDialog.tsx`:**

Incluir parcelas parciais nos calculos:
```typescript
// Parcelas parciais contam como "em aberto" pelo saldo restante
const totalPago = parcelas
  .filter(p => p.status === 'pago' || p.status === 'parcial')
  .reduce((acc, p) => acc + Number(p.valor_pago ?? 0), 0);

const totalPendente = parcelas
  .filter(p => p.status !== 'pago')
  .reduce((acc, p) => {
    if (p.status === 'parcial') {
      return acc + Number(p.saldo_restante ?? 0);
    }
    return acc + Number(p.valor_parcela);
  }, 0);
```

---

### 7. Permitir Completar Pagamento Parcial

Quando uma parcela esta com status "parcial", o botao "Dar Baixa" ainda deve aparecer para permitir completar o pagamento do saldo restante.

```typescript
// Mostrar botao "Completar Pagamento" para parcelas parciais
{(parcela.status === 'pendente' || parcela.status === 'atrasado' || parcela.status === 'parcial') && (
  <Button
    size="sm"
    onClick={() => handleDarBaixa(parcela)}
    variant={parcela.status === 'atrasado' ? 'destructive' : 'default'}
  >
    {parcela.status === 'parcial' ? 'Completar Pagamento' : 'Dar Baixa'}
  </Button>
)}
```

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/migrations/xxx.sql` | Adicionar coluna `saldo_restante` |
| `src/types/financeiro.ts` | Adicionar status 'parcial' e campo `saldo_restante` |
| `src/components/Financial/BaixaPagamentoDialog.tsx` | Adicionar checkbox e logica de pagamento parcial |
| `src/hooks/useClienteParcelas.ts` | Atualizar `darBaixaParcela` com logica de status parcial |
| `src/components/Financial/ClienteFinanceiroDialog.tsx` | Exibir badge parcial e saldo restante |
| `src/pages/Financial.tsx` | Atualizar calculos do dashboard |

---

### Fluxo do Usuario

```text
1. Usuario clica "Dar Baixa" na parcela
         │
         ▼
2. Dialog abre com valor da parcela pre-preenchido
         │
         ▼
3. Usuario altera valor para menor (ex: R$ 1.000 de R$ 1.500)
         │
         ▼
4. Sistema detecta e mostra: "Valor menor que a parcela"
         │
         ▼
5. Usuario marca checkbox "Pagamento Parcial"
         │
         ▼
6. Sistema mostra: "Saldo restante: R$ 500,00"
         │
         ▼
7. Usuario confirma → Parcela fica com status "parcial"
         │
         ▼
8. Na lista, parcela aparece com badge amarelo e saldo em aberto
         │
         ▼
9. Usuario pode clicar "Completar Pagamento" para quitar o saldo
```

