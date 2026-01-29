
## Plano: Sistema de Métodos de Pagamento Configuráveis por Cobrança

### Objetivo
Permitir que o Super Admin, ao criar uma cobrança, selecione quais métodos de pagamento estarão disponíveis (Boleto, PIX, Cartão). Quando "Cartão" for selecionado, um campo para inserir o link de pagamento será exibido. O tenant visualizará apenas os métodos disponíveis e, ao escolher Cartão, terá um botão "PAGAR" que abre o link em nova janela.

---

## Mudanças Necessárias

### 1. Migration - Novas Colunas na Tabela `tenant_boletos`

Adicionar campos para controlar quais métodos estão disponíveis e o link do cartão:

```sql
ALTER TABLE public.tenant_boletos 
ADD COLUMN metodos_disponiveis TEXT[] DEFAULT ARRAY['boleto', 'pix'],
ADD COLUMN link_cartao TEXT DEFAULT NULL;
```

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| metodos_disponiveis | TEXT[] | Array com métodos ativos: 'boleto', 'pix', 'cartao' |
| link_cartao | TEXT | URL do link de pagamento (quando cartão está ativo) |

---

### 2. Atualização do Super Admin - Formulário de Cobrança

**Arquivo:** `src/components/SuperAdmin/SuperAdminBoletosDialog.tsx`

Adicionar ao formulário de criação de cobrança:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Métodos de Pagamento Disponíveis:                              │
│                                                                 │
│  [✓] Boleto      [✓] PIX      [○] Cartão                       │
│                                                                 │
│  ↓ (Se Cartão marcado, aparece:)                               │
│                                                                 │
│  Link de Pagamento (Cartão): *                                 │
│  [ https://pay.exemplo.com/link-xyz_________________ ]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Lógica:**
- Checkboxes para Boleto, PIX e Cartão
- Quando Cartão é marcado, campo de link se torna visível e obrigatório
- Ao salvar, armazena `metodos_disponiveis` e `link_cartao`

---

### 3. Atualização do Hook `useTenantBoletos`

**Arquivo:** `src/hooks/useTenantBoletos.ts`

- Adicionar `metodos_disponiveis` e `link_cartao` no tipo `TenantBoleto`
- Incluir no `CreateBoletoData`
- Atualizar `createBoleto` para salvar os novos campos

---

### 4. Atualização do Dialog de Pagamento do Tenant

**Arquivo:** `src/components/Support/BoletoPaymentDialog.tsx`

**Mudanças:**
- Mostrar tabs apenas para métodos disponíveis em `boleto.metodos_disponiveis`
- Adicionar nova aba "Cartão" quando disponível
- Na aba Cartão: botão "PAGAR" que abre `link_cartao` em nova janela

```text
┌─────────────────────────────────────────────────────────────────┐
│  💳 Pagamento - Janeiro/2026                              [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Valor: R$ 299,00           Vencimento: 15/01/2026             │
│                                                                 │
│  ┌───────────┬───────────┬───────────┐                         │
│  │  BOLETO   │    PIX    │  CARTÃO   │  ← Tabs dinâmicas       │
│  └───────────┴───────────┴───────────┘                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Aba CARTÃO selecionada]                                      │
│                                                                 │
│  💳 Pagamento com Cartão de Crédito                            │
│                                                                 │
│  Clique no botão abaixo para ser redirecionado                 │
│  para a página de pagamento seguro.                            │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │          💳  PAGAR AGORA                │  ← Abre nova aba  │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [✅ Confirmar Pagamento]                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Atualização do Hook `useSubscription`

**Arquivo:** `src/hooks/useSubscription.ts`

Incluir os novos campos no tipo `TenantBoleto` usado pelo tenant.

---

### 6. Atualização da Tabela `tenant_pagamento_confirmacoes`

**Arquivo:** Migration SQL

Atualizar o CHECK constraint para aceitar 'cartao':

```sql
ALTER TABLE tenant_pagamento_confirmacoes 
DROP CONSTRAINT tenant_pagamento_confirmacoes_metodo_check;

ALTER TABLE tenant_pagamento_confirmacoes 
ADD CONSTRAINT tenant_pagamento_confirmacoes_metodo_check 
CHECK (metodo IN ('pix', 'boleto', 'cartao'));
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| Migration SQL | Adicionar colunas `metodos_disponiveis` e `link_cartao` em `tenant_boletos` |
| `src/hooks/useTenantBoletos.ts` | Atualizar tipos e `createBoleto` |
| `src/hooks/useSubscription.ts` | Atualizar tipo `TenantBoleto` |
| `src/components/SuperAdmin/SuperAdminBoletosDialog.tsx` | Adicionar checkboxes de métodos e campo de link |
| `src/components/Support/BoletoPaymentDialog.tsx` | Tabs dinâmicas + aba Cartão com botão PAGAR |
| `src/hooks/usePaymentConfirmation.ts` | Aceitar método 'cartao' |

---

## Fluxo Completo

### Super Admin
1. Acessa "Gerenciar Pagamentos" de um cliente
2. Clica em "Adicionar Cobrança"
3. Preenche: Mês, Valor, Vencimento
4. **Marca os métodos disponíveis**: Boleto ✓, PIX ✓, Cartão ✓
5. Se Cartão marcado: insere o link de pagamento
6. Salva a cobrança

### Tenant (Cliente)
1. Acessa "Vencimentos"
2. Clica no botão "Venc. DD/MM"
3. Vê apenas as tabs dos métodos habilitados:
   - Se só Boleto: apenas aba Boleto
   - Se Boleto + PIX: abas Boleto e PIX
   - Se todos: abas Boleto, PIX e Cartão
4. Ao clicar em **Cartão**:
   - Vê instruções de pagamento
   - Clica em **"PAGAR AGORA"** → abre link em nova janela
5. Após pagar, clica em "Confirmar Pagamento"
6. Opcionalmente anexa comprovante
7. Confirmação enviada para aprovação do Super Admin

---

## Detalhes Técnicos

### Interface do Formulário no Super Admin

```typescript
interface CreateBoletoData {
  mes_referencia: string;
  valor: number;
  data_vencimento: string;
  codigo_barras?: string;
  observacao?: string;
  // Novos campos
  metodos_disponiveis: ('boleto' | 'pix' | 'cartao')[];
  link_cartao?: string;
}
```

### Lógica de Tabs Dinâmicas

```typescript
// BoletoPaymentDialog.tsx
const metodosDisponiveis = boleto.metodos_disponiveis || ['boleto', 'pix'];

const hasBoleto = metodosDisponiveis.includes('boleto');
const hasPix = metodosDisponiveis.includes('pix');
const hasCartao = metodosDisponiveis.includes('cartao');

// Definir tab inicial baseado no primeiro método disponível
const defaultTab = hasBoleto ? 'boleto' : hasPix ? 'pix' : 'cartao';
```

---

## Benefícios

1. **Flexibilidade**: Super Admin escolhe quais métodos oferecer por cobrança
2. **Integração com gateways**: Link de cartão pode apontar para qualquer gateway (PagSeguro, Mercado Pago, Stripe, etc.)
3. **UX limpa**: Tenant vê apenas opções disponíveis
4. **Rastreabilidade**: Confirmação registra o método usado (boleto, pix ou cartao)
5. **Escalável**: Fácil adicionar novos métodos no futuro
