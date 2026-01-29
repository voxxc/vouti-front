

## Plano: Sistema de Pagamento PIX com Gestão no Super Admin

### Objetivo
Implementar uma experiência de pagamento completa na aba "Vencimentos" com opções de Boleto e PIX (QR Code), incluindo painel de gestão no Super Admin para configurar a chave PIX e fazer upload do QR Code.

---

## Visão Geral

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                ARQUITETURA                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  SUPER ADMIN                          │     TENANT (Cliente)                  │
│  ─────────────                        │     ────────────────                  │
│                                       │                                       │
│  [Config. PIX]                        │     [Vencimentos]                     │
│    - Chave PIX                        │       │                               │
│    - Tipo (email/cpf/cnpj)            │       ├─► [📅 Venc. 15/01] ──►┐       │
│    - Nome beneficiário                │       ├─► [📅 Venc. 15/02]    │       │
│    - Upload QR Code                   │       └─► [📅 Venc. 15/03]    │       │
│    - Ativar/Desativar                 │                               │       │
│                                       │                               ▼       │
│                                       │     ┌─────────────────────────────┐   │
│                                       │     │   Dialog de Pagamento       │   │
│                                       │     │   ┌───────┬───────┐         │   │
│                                       │     │   │BOLETO │  PIX  │         │   │
│                                       │     │   └───────┴───────┘         │   │
│                                       │     │   QR Code + Chave           │   │
│                                       │     │   [Confirmar Pagamento]     │   │
│                                       │     └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Parte 1: Super Admin - Gestão de PIX

### 1.1 Nova Tabela: `platform_pix_config`

Tabela global da plataforma (não é por tenant):

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| chave_pix | text | Chave PIX (email, CPF, CNPJ, celular, aleatória) |
| tipo_chave | text | 'email', 'cpf', 'cnpj', 'celular', 'aleatoria' |
| nome_beneficiario | text | Nome do recebedor (VOUTI) |
| qr_code_url | text | Path da imagem no storage |
| ativo | boolean | Se o PIX está ativo para pagamentos |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Última atualização |

```sql
CREATE TABLE platform_pix_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_pix TEXT NOT NULL,
  tipo_chave TEXT NOT NULL CHECK (tipo_chave IN ('email', 'cpf', 'cnpj', 'celular', 'aleatoria')),
  nome_beneficiario TEXT NOT NULL,
  qr_code_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Apenas Super Admins podem gerenciar
ALTER TABLE platform_pix_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all" ON platform_pix_config
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Tenants podem apenas ler config ativa
CREATE POLICY "tenants_read_active" ON platform_pix_config
  FOR SELECT TO authenticated
  USING (ativo = true AND get_user_tenant_id() IS NOT NULL);
```

### 1.2 Storage Bucket para QR Code

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-pix-qrcode', 'platform-pix-qrcode', true);

-- Público porque os tenants precisam ver o QR Code
```

### 1.3 Componente Super Admin: `SuperAdminPixConfig.tsx`

Interface no painel Super Admin para gerenciar PIX:

```text
┌───────────────────────────────────────────────────────────────┐
│  ⚙️ Configuração PIX da Plataforma                            │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Status: [✓] Ativo                                            │
│                                                               │
│  Tipo de Chave: [Email ▼]                                     │
│                                                               │
│  Chave PIX: [financeiro@vouti.com.br___________]              │
│                                                               │
│  Nome Beneficiário: [VOUTI SISTEMAS LTDA________]             │
│                                                               │
│  QR Code:                                                     │
│  ┌───────────────────┐                                        │
│  │   ███████████     │  [📤 Fazer Upload]                     │
│  │   ██ QR CODE ██   │                                        │
│  │   ███████████     │  [🗑️ Remover]                          │
│  └───────────────────┘                                        │
│                                                               │
│  [💾 Salvar Configuração]                                     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 1.4 Integração no Super Admin

Adicionar nova seção/aba "Config. Pagamentos" no SuperAdmin.tsx, ou um botão no header que abre um Dialog.

---

## Parte 2: Tenant - Experiência de Pagamento

### 2.1 Nova Tabela: `tenant_pagamento_confirmacoes`

Para registrar quando o tenant confirma um pagamento:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| boleto_id | uuid | FK para tenant_boletos |
| tenant_id | uuid | FK para tenants |
| metodo | text | 'pix' ou 'boleto' |
| data_confirmacao | timestamp | Quando confirmou |
| comprovante_path | text | Caminho no storage (opcional) |
| status | text | 'pendente', 'aprovado', 'rejeitado' |
| observacao_admin | text | Resposta do admin |
| created_at | timestamp | Data de criação |

```sql
CREATE TABLE tenant_pagamento_confirmacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boleto_id UUID NOT NULL REFERENCES tenant_boletos(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metodo TEXT NOT NULL CHECK (metodo IN ('pix', 'boleto')),
  data_confirmacao TIMESTAMPTZ DEFAULT now(),
  comprovante_path TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  observacao_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE tenant_pagamento_confirmacoes ENABLE ROW LEVEL SECURITY;

-- Tenant pode ver/criar suas próprias confirmações
CREATE POLICY "tenant_select" ON tenant_pagamento_confirmacoes
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert" ON tenant_pagamento_confirmacoes
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Super Admin pode ver/gerenciar todas
CREATE POLICY "super_admin_all" ON tenant_pagamento_confirmacoes
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
```

### 2.2 Storage Bucket para Comprovantes

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-comprovantes-pagamento', 'tenant-comprovantes-pagamento', false);
```

### 2.3 Novo Dialog: `BoletoPaymentDialog.tsx`

Abre ao clicar no botão de vencimento:

```text
┌─────────────────────────────────────────────────────────────────┐
│  💳 Pagamento - Janeiro/2026                              [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Valor: R$ 299,00           Vencimento: 15/01/2026             │
│                                                                 │
│  ┌─────────────────────────┬─────────────────────────┐          │
│  │      📄 BOLETO          │       📱 PIX           │          │
│  └─────────────────────────┴─────────────────────────┘          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Aba BOLETO]                                                   │
│                                                                 │
│  📄 Linha Digitável:                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 23793.38128 60000.000035 25000.063305 8 85160000029900  │    │
│  │                                            [📋 Copiar]  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [📥 Baixar Boleto PDF]                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Aba PIX]                                                      │
│                                                                 │
│       ┌─────────────────────┐                                   │
│       │   ███████████████   │                                   │
│       │   ███  QR CODE  ███ │                                   │
│       │   ███████████████   │                                   │
│       └─────────────────────┘                                   │
│                                                                 │
│  Chave PIX: financeiro@vouti.com.br                             │
│  Beneficiário: VOUTI SISTEMAS LTDA                              │
│                                                      [📋 Copiar]│
│                                                                 │
│  ⚡ Dica: Você pode configurar uma transferência recorrente     │
│     no seu banco para evitar atrasos de pagamento!              │
│                                                                 │
│  ────────────────────────────────────────────────────────────   │
│                                                                 │
│  [✅ Confirmar Pagamento]                                       │
│                                                                 │
│  ↓ (Ao clicar, expande)                                         │
│                                                                 │
│  📎 Comprovante (opcional):                                     │
│  [ Selecionar arquivo... ] documento.pdf                        │
│                                                                 │
│  [Enviar Confirmação]                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Parte 3: Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/components/SuperAdmin/SuperAdminPixConfig.tsx` | Gestão de PIX no Super Admin |
| `src/components/Support/BoletoPaymentDialog.tsx` | Dialog de pagamento com tabs |
| `src/hooks/usePlatformPixConfig.ts` | Hook para buscar config PIX |
| `src/hooks/usePaymentConfirmation.ts` | Hook para confirmações de pagamento |

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/SuperAdmin.tsx` | Adicionar seção/botão "Config. PIX" |
| `src/components/Support/SubscriptionDrawer.tsx` | Trocar lista por botões com data, integrar Dialog |
| `src/hooks/useSubscription.ts` | Adicionar busca de confirmações |

---

## Parte 4: Fluxo Completo

### Super Admin
1. Acessa Super Admin
2. Vai em "Config. Pagamentos" ou "Config. PIX"
3. Preenche: tipo de chave, chave PIX, nome beneficiário
4. Faz upload do QR Code (imagem PNG/JPG)
5. Ativa/desativa opção PIX
6. Salva

### Tenant (Cliente)
1. Acessa "Minha Assinatura" → aba "Vencimentos"
2. Vê lista de boletos com botão "📅 Venc. DD/MM"
3. Clica no botão → abre BoletoPaymentDialog
4. Escolhe aba **Boleto** ou **PIX**:
   - **Boleto**: Copia código de barras ou baixa PDF
   - **PIX**: Vê QR Code, copia chave, lê dica de agendamento
5. Após pagar, clica em "Confirmar Pagamento"
6. Opcionalmente anexa comprovante
7. Envia confirmação → registro salvo no banco

### Super Admin (após confirmação)
1. Pode ver confirmações pendentes (futura feature)
2. Aprova/rejeita confirmação
3. Atualiza status do boleto para "pago"

---

## Migrations SQL Resumidas

```sql
-- 1. Tabela de config PIX (global)
CREATE TABLE platform_pix_config (...);

-- 2. Tabela de confirmações (por tenant)
CREATE TABLE tenant_pagamento_confirmacoes (...);

-- 3. Storage bucket para QR Code
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-pix-qrcode', 'platform-pix-qrcode', true);

-- 4. Storage bucket para comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-comprovantes-pagamento', 'tenant-comprovantes-pagamento', false);

-- 5. RLS policies para ambas as tabelas
```

---

## Benefícios

1. **Gestão centralizada**: Super Admin controla a chave PIX e QR Code
2. **UX melhorada**: Tenants têm opções claras de pagamento
3. **Dica de agendamento**: Incentiva recorrência no banco
4. **Comprovante opcional**: Permite validação manual
5. **Rastreabilidade**: Histórico de confirmações

