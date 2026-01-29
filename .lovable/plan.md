
## Plano: Sistema Completo de Gerenciamento de Pagamentos Super Admin ↔ Tenant

### Objetivo
Renomear "Gerenciar Boletos" para "Gerenciar Pagamentos" e criar um fluxo completo onde:
1. Super Admin cria cobranças (boletos/vencimentos) para cada tenant
2. Tenant visualiza essas cobranças na aba "Vencimentos" com botões de data
3. Ao clicar, o tenant vê opções de Boleto ou PIX (QR Code já configurado no Super Admin)
4. Tenant pode confirmar pagamento com upload de comprovante
5. Super Admin pode visualizar e gerenciar confirmações de pagamento

---

## Mudanças Necessárias

### 1. Renomear no TenantCard
**Arquivo:** `src/components/SuperAdmin/TenantCard.tsx`

Alterar o ícone e título do botão:
- De: `FileText` + "Gerenciar boletos"
- Para: `CreditCard` + "Gerenciar Pagamentos"

---

### 2. Atualizar SuperAdminBoletosDialog
**Arquivo:** `src/components/SuperAdmin/SuperAdminBoletosDialog.tsx`

**Mudanças:**
- Renomear para `SuperAdminPagamentosDialog.tsx`
- Adicionar aba de "Confirmações Pendentes" para ver os pagamentos que tenants confirmaram
- Mostrar comprovantes enviados pelos tenants
- Permitir aprovar/rejeitar confirmações

**Interface atualizada:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  💳 Pagamentos - Nome do Cliente                           [X] │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┬──────────────────────┐                    │
│  │   📄 Cobranças   │  ✅ Confirmações     │   ← Duas abas      │
│  └──────────────────┴──────────────────────┘                    │
│                                                                 │
│  [Aba Cobranças - existente atualizada]                        │
│  - Lista de boletos/cobranças criadas                          │
│  - Botão "Adicionar Cobrança"                                  │
│  - Campos: Mês, Valor, Vencimento, PDF, Código Barras          │
│                                                                 │
│  [Aba Confirmações - NOVA]                                     │
│  - Lista de confirmações enviadas pelos tenants                │
│  - Cada confirmação mostra:                                    │
│    - Boleto referência (mês/valor)                             │
│    - Método usado (PIX/Boleto)                                 │
│    - Data da confirmação                                       │
│    - Comprovante (se enviado) → [Ver Comprovante]              │
│    - Status atual (pendente/aprovado/rejeitado)                │
│    - [Aprovar] [Rejeitar] botões                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Hook para Gerenciar Confirmações (Super Admin)
**Arquivo:** `src/hooks/useSuperAdminPaymentConfirmations.ts` (NOVO)

Funcionalidades:
- Buscar todas confirmações de um tenant
- Aprovar confirmação (muda status para 'aprovado' + atualiza boleto para 'pago')
- Rejeitar confirmação (muda status para 'rejeitado' com observação)
- Obter URL assinada do comprovante

---

### 4. Componente de Aba de Confirmações
**Arquivo:** `src/components/SuperAdmin/PaymentConfirmationsTab.tsx` (NOVO)

Componente que lista as confirmações pendentes e permite gestão:
```text
┌─────────────────────────────────────────────────────────────────┐
│  Confirmações Pendentes                                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📅 Janeiro/2026 - R$ 299,00                             │   │
│  │ 💳 Método: PIX                                          │   │
│  │ 📆 Confirmado em: 15/01/2026 às 14:32                   │   │
│  │ 📎 Comprovante: ✓ Enviado  [👁️ Ver]                     │   │
│  │                                                         │   │
│  │ [✓ Aprovar]  [✗ Rejeitar]                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📅 Dezembro/2025 - R$ 299,00                            │   │
│  │ 💳 Método: Boleto                                       │   │
│  │ 📆 Confirmado em: 10/12/2025 às 09:15                   │   │
│  │ 📎 Comprovante: Não enviado                             │   │
│  │                                                         │   │
│  │ [✓ Aprovar]  [✗ Rejeitar]                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo Completo

### Super Admin
1. Acessa "Config. PIX" e configura chave + QR Code da plataforma
2. No card de cada cliente, clica em "Gerenciar Pagamentos"
3. Aba "Cobranças": Adiciona novas cobranças (mês, valor, vencimento, PDF do boleto)
4. Aba "Confirmações": Vê confirmações enviadas pelos tenants e aprova/rejeita

### Tenant (Cliente)
1. Acessa "Minha Assinatura" → aba "Vencimentos"
2. Vê lista de cobranças com botões "[📅 Venc. DD/MM]"
3. Clica no botão → abre dialog de pagamento
4. Escolhe aba **Boleto** (código de barras, PDF) ou **PIX** (QR Code, chave)
5. Após pagar, clica em "Confirmar Pagamento"
6. Opcionalmente anexa comprovante
7. Envia confirmação → aguarda aprovação do Super Admin

### Após Aprovação
- Super Admin aprova confirmação
- Status do boleto muda para "pago"
- Tenant vê o boleto como "Pago" na lista

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useSuperAdminPaymentConfirmations.ts` | Hook para gerenciar confirmações no Super Admin |
| `src/components/SuperAdmin/PaymentConfirmationsTab.tsx` | Componente da aba de confirmações |

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/SuperAdmin/TenantCard.tsx` | Renomear botão para "Gerenciar Pagamentos" |
| `src/components/SuperAdmin/SuperAdminBoletosDialog.tsx` | Adicionar tabs e integrar aba de confirmações |

---

## Detalhes Técnicos

### Hook `useSuperAdminPaymentConfirmations`

```typescript
export function useSuperAdminPaymentConfirmations(tenantId: string | null) {
  // Buscar confirmações do tenant
  const fetchConfirmacoes = async () => {...}
  
  // Aprovar confirmação
  const aprovarConfirmacao = async (confirmacaoId: string, boletoId: string) => {
    // 1. Atualizar confirmação para 'aprovado'
    // 2. Atualizar boleto para status 'pago'
  }
  
  // Rejeitar confirmação
  const rejeitarConfirmacao = async (confirmacaoId: string, observacao: string) => {
    // Atualizar confirmação para 'rejeitado' com observação
  }
  
  // Obter URL do comprovante
  const getComprovanteUrl = async (path: string) => {...}
}
```

### RLS Policies Necessárias

Já existem as policies para Super Admin na tabela `tenant_pagamento_confirmacoes`:
```sql
CREATE POLICY "super_admin_all" ON tenant_pagamento_confirmacoes
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
```

### Storage Policies para Comprovantes

Precisamos adicionar policies ao bucket `tenant-comprovantes-pagamento` para:
- Super Admin poder visualizar todos os comprovantes
- Tenants só poderem fazer upload/ver seus próprios

---

## Benefícios

1. **Fluxo completo e integrado**: Super Admin cria cobranças → Tenant paga e confirma → Super Admin aprova
2. **Visibilidade de comprovantes**: Super Admin pode verificar comprovantes antes de aprovar
3. **Rastreabilidade**: Histórico de confirmações com status e datas
4. **Flexibilidade de pagamento**: Tenant escolhe entre Boleto ou PIX
5. **Nomenclatura clara**: "Gerenciar Pagamentos" é mais abrangente que "Gerenciar Boletos"
