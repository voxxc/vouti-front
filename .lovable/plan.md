
# Push-Docs: Sistema de Monitoramento de Documentos no SuperAdmin

## Resumo
Criar um novo dialog no TenantCard do SuperAdmin para gerenciar cadastros de monitoramento de documentos (CPF, CNPJ, OAB) via Judit Tracking API. Quando um novo processo e protocolado/distribuido para esses documentos, o sistema recebe via webhook e apresenta ao usuario.

---

## Arquitetura do Sistema

```text
TenantCard (SuperAdmin)
    |
    +-- Click icone "Push-Docs" (FileStack)
           |
           +-- Abre TenantPushDocsDialog
                   |
                   +-- Tabs visuais por tipo (CPF | CNPJ | OAB)
                   |       |
                   |       +-- Lista de documentos cadastrados (formato abas)
                   |       +-- Botao "+ Cadastrar"
                   |       +-- Toggle ativar/desativar monitoramento
                   |       +-- Status: ativo, pausado, erro
                   |
                   +-- Secao: Processos Recebidos via Webhook
                           |
                           +-- Lista de processos novos distribuidos
```

---

## Modelo de Dados (Supabase)

Nova tabela `push_docs_cadastrados`:

```sql
CREATE TABLE push_docs_cadastrados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Tipo de documento: 'cpf', 'cnpj', 'oab'
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('cpf', 'cnpj', 'oab')),
  
  -- Valor do documento (CPF limpo, CNPJ limpo, ou OAB no formato "92124PR")
  documento TEXT NOT NULL,
  
  -- Descricao opcional (nome da pessoa, razao social, nome advogado)
  descricao TEXT,
  
  -- Campos de tracking Judit
  tracking_id TEXT,
  tracking_status TEXT DEFAULT 'pendente' CHECK (tracking_status IN ('pendente', 'ativo', 'pausado', 'erro', 'deletado')),
  ultimo_request_id TEXT,
  
  -- Configuracoes de monitoramento
  recurrence INTEGER DEFAULT 1, -- Frequencia em dias
  notification_emails TEXT[], -- Emails para notificacao
  
  -- Estatisticas
  total_processos_recebidos INTEGER DEFAULT 0,
  ultima_notificacao TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, tipo_documento, documento)
);

-- Index para performance
CREATE INDEX idx_push_docs_tenant_id ON push_docs_cadastrados(tenant_id);
CREATE INDEX idx_push_docs_tracking_id ON push_docs_cadastrados(tracking_id);

-- RLS: Super Admins podem ver tudo, usuarios do tenant so veem seus proprios
ALTER TABLE push_docs_cadastrados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all push docs"
  ON push_docs_cadastrados FOR ALL
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can view their push docs"
  ON push_docs_cadastrados FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));
```

Nova tabela `push_docs_processos` (processos recebidos via webhook):

```sql
CREATE TABLE push_docs_processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  push_doc_id UUID NOT NULL REFERENCES push_docs_cadastrados(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Dados do processo
  numero_cnj TEXT NOT NULL,
  tribunal TEXT,
  tribunal_sigla TEXT,
  parte_ativa TEXT,
  parte_passiva TEXT,
  status_processual TEXT,
  data_distribuicao TEXT,
  valor_causa NUMERIC,
  
  -- Dados completos do webhook
  payload_completo JSONB,
  
  -- Request que trouxe o processo
  request_id TEXT,
  tracking_id TEXT,
  
  -- Status de visualizacao
  lido BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(push_doc_id, numero_cnj)
);

CREATE INDEX idx_push_docs_processos_push_doc ON push_docs_processos(push_doc_id);
CREATE INDEX idx_push_docs_processos_tenant ON push_docs_processos(tenant_id);

ALTER TABLE push_docs_processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all push docs processos"
  ON push_docs_processos FOR ALL
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/SuperAdmin/TenantPushDocsDialog.tsx` | Dialog principal com abas por tipo de documento |
| `src/hooks/useTenantPushDocs.ts` | Hook para CRUD de push-docs |
| `supabase/functions/judit-push-docs-cadastrar/index.ts` | Edge Function para criar tracking |
| `supabase/functions/judit-push-docs-toggle/index.ts` | Edge Function para pausar/reativar |
| `supabase/functions/judit-webhook-push-docs/index.ts` | Webhook para receber novos processos |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/SuperAdmin/TenantCard.tsx` | Adicionar botao Push-Docs e dialog |
| `supabase/config.toml` | Adicionar novas Edge Functions |

---

## Interface Visual

### TenantCard (novo botao)
```text
[Database] [Activity] [Key] [#] [FileStack] [CreditCard]
                              ^-- NOVO: Push-Docs
```

### TenantPushDocsDialog
```text
+----------------------------------------------------------------+
| Push-Docs - Solvenza Advocacia                                 |
+----------------------------------------------------------------+
| [CPF (3)] [CNPJ (1)] [OAB (2)]                                 |
+----------------------------------------------------------------+
| + Cadastrar CPF                                                |
+----------------------------------------------------------------+
|                                                                |
| ┌──────────────────────────────────────────────────────────┐   |
| │ 123.456.789-00                                           │   |
| │ Joao Silva                                               │   |
| │ Status: Ativo | Recorrencia: 1 dia                       │   |
| │ Processos recebidos: 5 | Ultimo: 06/02/2026              │   |
| │ [Toggle] [Pausar] [Deletar]                              │   |
| └──────────────────────────────────────────────────────────┘   |
|                                                                |
| ┌──────────────────────────────────────────────────────────┐   |
| │ 987.654.321-00                                           │   |
| │ Maria Santos                                             │   |
| │ Status: Pausado | Recorrencia: 1 dia                     │   |
| │ Processos recebidos: 2 | Ultimo: 05/02/2026              │   |
| │ [Toggle] [Reativar] [Deletar]                            │   |
| └──────────────────────────────────────────────────────────┘   |
|                                                                |
+----------------------------------------------------------------+
| Processos Recebidos (ultimos 30 dias)               Ver todos  |
+----------------------------------------------------------------+
| [Badge] 1234567-89.2026.8.16.0001 - Joao vs Maria   06/02/26  |
| [Badge] 9876543-21.2026.8.09.0002 - Pedro vs Ana    05/02/26  |
+----------------------------------------------------------------+
```

### Dialog Cadastrar CPF
```text
+----------------------------------------+
| Cadastrar CPF para Monitoramento       |
+----------------------------------------+
| CPF*                                   |
| [000.000.000-00                    ]   |
|                                        |
| Nome/Descricao                         |
| [Joao da Silva                     ]   |
|                                        |
| Recorrencia (dias)                     |
| [1                                 ]   |
|                                        |
| [Cancelar]              [Cadastrar]    |
+----------------------------------------+
```

---

## Fluxo de Integracao com Judit API

### 1. Cadastrar Novo Documento
```javascript
// POST https://tracking.prod.judit.io/tracking
{
  "recurrence": 1,
  "search": {
    "search_type": "cpf", // ou "cnpj", "oab"
    "search_key": "12345678900"
  },
  "webhook": {
    "url": "https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/judit-webhook-push-docs"
  }
}
```

### 2. Pausar Monitoramento
```javascript
// POST https://tracking.prod.judit.io/tracking/{tracking_id}/pause
```

### 3. Reativar Monitoramento
```javascript
// POST https://tracking.prod.judit.io/tracking/{tracking_id}/resume
```

### 4. Deletar Monitoramento
```javascript
// DELETE https://tracking.prod.judit.io/tracking/{tracking_id}
```

---

## Edge Function: judit-push-docs-cadastrar

```typescript
// Payload esperado
{
  tenantId: string,
  tipoDocumento: 'cpf' | 'cnpj' | 'oab',
  documento: string,
  descricao?: string,
  recurrence?: number
}

// Fluxo:
1. Validar documento (CPF/CNPJ/OAB)
2. Chamar POST /tracking na Judit
3. Salvar em push_docs_cadastrados com tracking_id
4. Registrar em tenant_banco_ids
```

---

## Edge Function: judit-webhook-push-docs

```typescript
// Recebe notificacao da Judit quando novo processo e distribuido
// Payload similar ao judit-webhook-oab

// Fluxo:
1. Extrair tracking_id do payload
2. Buscar push_doc correspondente
3. Inserir processo em push_docs_processos
4. Atualizar contador total_processos_recebidos
5. Atualizar ultima_notificacao
```

---

## Detalhes Tecnicos

### Hook useTenantPushDocs

```typescript
interface PushDoc {
  id: string;
  tipoDocumento: 'cpf' | 'cnpj' | 'oab';
  documento: string;
  descricao: string | null;
  trackingId: string | null;
  trackingStatus: 'pendente' | 'ativo' | 'pausado' | 'erro' | 'deletado';
  recurrence: number;
  totalProcessosRecebidos: number;
  ultimaNotificacao: string | null;
}

function useTenantPushDocs(tenantId: string) {
  return {
    pushDocs,
    processosRecebidos,
    isLoading,
    cadastrarPushDoc,
    pausarPushDoc,
    reativarPushDoc,
    deletarPushDoc,
    refetch
  }
}
```

---

## Registro no Banco de IDs

Cada push-doc cadastrado sera registrado automaticamente via trigger em `tenant_banco_ids`:

```sql
CREATE OR REPLACE FUNCTION registrar_banco_id_push_doc()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'push_doc',
      NEW.id,
      NEW.id::text,
      UPPER(NEW.tipo_documento) || ': ' || NEW.documento || COALESCE(' - ' || NEW.descricao, ''),
      jsonb_build_object('tipo_documento', NEW.tipo_documento, 'documento', NEW.documento)
    );
  END IF;
  
  IF TG_OP = 'UPDATE' AND NEW.tracking_id IS DISTINCT FROM OLD.tracking_id AND NEW.tracking_id IS NOT NULL THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'tracking_push_doc',
      NEW.id,
      NEW.tracking_id,
      'Tracking ' || UPPER(NEW.tipo_documento) || ': ' || NEW.documento,
      jsonb_build_object('tipo_documento', NEW.tipo_documento, 'documento', NEW.documento, 'status', NEW.tracking_status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Sequencia de Implementacao

1. **Criar tabelas** (push_docs_cadastrados, push_docs_processos)
2. **Criar triggers** para registro no Banco de IDs
3. **Criar hook** (useTenantPushDocs.ts)
4. **Criar Edge Functions** (cadastrar, toggle, webhook)
5. **Criar dialog** (TenantPushDocsDialog.tsx)
6. **Modificar TenantCard** (adicionar botao e state)
7. **Atualizar config.toml** (novas functions)
8. **Testar fluxo completo** (cadastro -> webhook -> visualizacao)

---

## Dependencias

Nenhuma nova dependencia necessaria. Utiliza:
- Supabase client (existente)
- Lucide icons (FileStack para o botao)
- Componentes UI existentes (Dialog, Tabs, Badge, etc.)

---

## Consideracoes de Seguranca

1. **Apenas SuperAdmins** podem gerenciar push-docs via TenantCard
2. **Webhook validado** por api-key da Judit
3. **RLS policies** garantem isolamento por tenant
4. **Tracking IDs** registrados no Banco de IDs para auditoria

---

## Formato Visual das Abas (inspirado em OABManager)

O dialog apresentara os documentos cadastrados em formato de abas horizontais, similar ao OABManager:

```text
[123.456.789-00 (5)] [987.654.321-00 (2)] [+ Cadastrar]
```

Onde:
- O numero entre parenteses indica quantidade de processos recebidos
- Click na aba mostra detalhes do documento e seus processos
- Botao "+ Cadastrar" abre modal para novo cadastro
