
# Plano: Desabilitar Agente IA por Conversa

## Objetivo
Permitir que um atendente humano assuma a conversa, desabilitando a IA para aquele lead específico.

## Como Vai Funcionar

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE ATENDIMENTO                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Lead envia mensagem                                                       │
│           │                                                                 │
│           ▼                                                                 │
│   whatsapp-webhook verifica:                                                │
│           │                                                                 │
│           ├─ IA desabilitada para este telefone? ──────┐                    │
│           │                                            │                    │
│           ▼ NÃO                                        ▼ SIM                │
│   IA responde automaticamente              Não faz nada (humano atende)     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Interface no Painel Lateral

O toggle "Habilitar Bot" que já existe vai ser transformado em "Desabilitar IA (Atendimento Humano)":

```text
┌─────────────────────────────────────────┐
│            João Silva                   │
│         +55 45 9999-9999                │
│      joaosilva@whatsapp.com             │
├─────────────────────────────────────────┤
│                                         │
│  🤖 Agente IA                           │
│  ┌───────────────────────────────────┐  │
│  │  Status: Respondendo               │  │ ← Badge verde
│  │                                   │  │
│  │  [  Assumir Atendimento  ]        │  │ ← Botão para humano assumir
│  └───────────────────────────────────┘  │
│                                         │
│  OU (quando desabilitado):              │
│                                         │
│  🤖 Agente IA                           │
│  ┌───────────────────────────────────┐  │
│  │  Status: Desabilitado (Humano)    │  │ ← Badge amarelo
│  │                                   │  │
│  │  [  Reativar Agente IA  ]         │  │ ← Botão para devolver à IA
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## Componentes a Criar/Modificar

### 1. Nova Tabela: `whatsapp_ai_disabled_contacts`

Armazena os contatos que tiveram a IA desabilitada:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | Tenant do contato (NULL para Super Admin) |
| phone_number | text | Número do telefone |
| disabled_by | uuid | Usuário que desabilitou |
| disabled_at | timestamp | Quando foi desabilitado |
| reason | text | Motivo (opcional) |

### 2. Modificar: `ContactInfoPanel.tsx`

- Adicionar lógica real para buscar/alterar status da IA por contato
- Mostrar status atual (IA respondendo ou Humano atendendo)
- Botões para alternar entre modos

### 3. Modificar: `whatsapp-webhook/index.ts`

Na função `handleAIResponse`, verificar ANTES se o contato tem IA desabilitada:

```typescript
// Verificar se IA está desabilitada para este número específico
const { data: disabledContact } = await supabase
  .from('whatsapp_ai_disabled_contacts')
  .select('id')
  .eq('phone_number', phone)
  .eq('tenant_id', tenant_id)
  .maybeSingle();

if (disabledContact) {
  console.log('⏭️ IA desabilitada para este contato (atendimento humano)');
  return false;
}
```

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useWhatsAppAIControl.ts` | Hook para gerenciar estado de IA por contato |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/WhatsApp/components/ContactInfoPanel.tsx` | UI funcional para controle de IA |
| `supabase/functions/whatsapp-webhook/index.ts` | Verificar se IA está desabilitada para o contato |

## Migração SQL

```sql
-- Tabela de contatos com IA desabilitada
CREATE TABLE public.whatsapp_ai_disabled_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  disabled_by uuid REFERENCES auth.users(id),
  disabled_at timestamptz DEFAULT now(),
  reason text,
  
  UNIQUE(tenant_id, phone_number)
);

-- RLS
ALTER TABLE whatsapp_ai_disabled_contacts ENABLE ROW LEVEL SECURITY;

-- Tenant pode gerenciar seus contatos
CREATE POLICY "tenant_manage_disabled_contacts"
ON whatsapp_ai_disabled_contacts FOR ALL
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- Super Admin (tenant NULL)
CREATE POLICY "superadmin_manage_disabled_contacts"
ON whatsapp_ai_disabled_contacts FOR ALL
USING (tenant_id IS NULL AND is_super_admin(auth.uid()))
WITH CHECK (tenant_id IS NULL AND is_super_admin(auth.uid()));
```

## Resultado Esperado

1. No painel lateral de cada conversa, aparece seção "Agente IA"
2. Mostra status: "Respondendo" (verde) ou "Desabilitado" (amarelo)
3. Botão "Assumir Atendimento" para humano assumir
4. Botão "Reativar Agente IA" para devolver à automação
5. Quando humano assume, a IA para de responder aquele contato específico
6. Funciona tanto para tenants quanto para Super Admin
