
# Plano: Banco de IDs no SuperAdmin

## Objetivo
Criar um espaço dentro do card de cada cliente no SuperAdmin que armazene e exiba todos os IDs relevantes gerados pelo sistema Judit, servindo como um log de auditoria e referência rápida.

---

## IDs a Serem Rastreados

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tabela/Fonte        │ Campos de ID                                         │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ oabs_cadastradas    │ id, ultimo_request_id (busca OAB)                    │
│ processos_oab       │ id, tracking_id (monitoramento), detalhes_request_id │
│ oab_request_hist.   │ request_id (histórico de buscas pagas)               │
│ judit_api_logs      │ request_id (todos os requests)                       │
└─────────────────────┴──────────────────────────────────────────────────────┘
```

---

## Implementação

### 1. Nova Tabela: `tenant_banco_ids`
Armazenar todos os IDs de forma centralizada para consulta rápida.

**Estrutura:**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK para tenants |
| tipo | text | Tipo do ID: 'oab', 'processo', 'tracking', 'request_busca', 'request_detalhes', 'request_monitoramento' |
| referencia_id | uuid | ID do registro original (oab_id ou processo_id) |
| external_id | text | ID externo da Judit (tracking_id, request_id) |
| descricao | text | Descrição legível (OAB 12345/PR, CNJ xxxx-xx) |
| metadata | jsonb | Dados adicionais (data, status, etc) |
| created_at | timestamptz | Data de criação |

### 2. Novo Componente: `TenantBancoIdsDialog.tsx`
Dialog modal acessível via botão no TenantCard.

**Funcionalidades:**
- Abas por tipo de ID (OABs, Processos, Tracking, Requests)
- Busca/filtro por ID ou descrição
- Botão de copiar ID
- Exibição da data de registro
- Link para detalhe quando aplicável

### 3. Atualização do `TenantCard.tsx`
- Adicionar novo botão com ícone de banco de dados/hash
- Estado para controlar abertura do dialog

### 4. Trigger de Banco de Dados (Retroativo + Futuro)
Criar triggers para popular automaticamente a tabela:

**a) Trigger em `oabs_cadastradas`:**
- INSERT → registra ID da OAB
- UPDATE (ultimo_request_id) → registra novo request_id

**b) Trigger em `processos_oab`:**
- INSERT → registra ID do processo
- UPDATE (tracking_id) → registra ativação de monitoramento
- UPDATE (detalhes_request_id) → registra busca de detalhes

**c) Trigger em `judit_api_logs`:**
- INSERT → registra request_id quando presente

### 5. Script de Migração para Dados Existentes
Migração que popula a tabela com todos os IDs já existentes no sistema.

---

## Layout Visual do Dialog

```text
┌────────────────────────────────────────────────────────────────────┐
│ 🗃️ Banco de IDs - [Nome do Cliente]                                │
├────────────────────────────────────────────────────────────────────┤
│ [🔍 Buscar por ID ou descrição...]                                 │
├────────────────────────────────────────────────────────────────────┤
│ [OABs] [Processos] [Tracking] [Requests]                           │
├────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ 📋 OAB 118131/PR - Dr. Rodrigo Cordeiro                     │    │
│ │    ID: a671bef7-c263-4e01-ad9f-90c1e0cc4793          [📋]   │    │
│ │    Request Busca: b97d2ee1-faef-4804-8882-61ee09b... [📋]   │    │
│ │    Data: 15/12/2025 16:39                                   │    │
│ ├─────────────────────────────────────────────────────────────┤    │
│ │ 📋 OAB 13350/AM - Dr. Lucas Harles                          │    │
│ │    ID: d508ee9a-da52-465b-b9fb-ddd919455b7a          [📋]   │    │
│ │    Request Busca: b9046b6b-bf32-4109-98ca-e0d17...   [📋]   │    │
│ │    Data: 14/01/2026 20:39                                   │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                    │
│ Processos com Monitoramento Ativo:                                 │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ ⚖️ 1052085-77.2023.8.26.0506                                 │    │
│ │    ID: 8ca0842a-a9d7-46d9-ae16-68ca0b1c3319          [📋]   │    │
│ │    Tracking: 5f49c201-f043-4856-b5bd-8414bc51fedc    [📋]   │    │
│ │    Request Det.: 559f6333-8754-4e9a-8bf6-75b5ed...   [📋]   │    │
│ │    🟢 Monitoramento Ativo                                   │    │
│ └─────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/SuperAdmin/TenantBancoIdsDialog.tsx` | Criar |
| `src/components/SuperAdmin/TenantCard.tsx` | Modificar |
| Migration SQL | Criar tabela + triggers + migração dados |

---

## Detalhes Técnicos

### Migração SQL (Dados Existentes)
```sql
-- 1. Criar tabela
CREATE TABLE tenant_banco_ids (...);

-- 2. Migrar OABs existentes
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
SELECT 
  tenant_id,
  'oab',
  id,
  id::text,
  'OAB ' || oab_numero || '/' || oab_uf || COALESCE(' - ' || nome_advogado, ''),
  jsonb_build_object('oab_numero', oab_numero, 'oab_uf', oab_uf)
FROM oabs_cadastradas WHERE tenant_id IS NOT NULL;

-- 3. Migrar request_ids de busca OAB
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
SELECT 
  tenant_id,
  'request_busca',
  id,
  ultimo_request_id,
  'Busca OAB ' || oab_numero || '/' || oab_uf,
  jsonb_build_object('data_request', request_id_data)
FROM oabs_cadastradas 
WHERE tenant_id IS NOT NULL AND ultimo_request_id IS NOT NULL;

-- 4. Migrar processos
-- 5. Migrar tracking_ids
-- 6. Migrar detalhes_request_ids
-- 7. Criar triggers para novos registros
```

### Query do Dialog (Exemplo)
```typescript
const { data } = await supabase
  .from('tenant_banco_ids')
  .select('*')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });
```

---

## Alternativa Simplificada (Sem Nova Tabela)

Se preferir não criar uma nova tabela, o dialog pode consultar diretamente as tabelas existentes:

```typescript
// Buscar OABs com seus IDs
const oabs = await supabase.from('oabs_cadastradas')
  .select('id, oab_numero, oab_uf, nome_advogado, ultimo_request_id, request_id_data')
  .eq('tenant_id', tenantId);

// Buscar processos com IDs
const processos = await supabase.from('processos_oab')
  .select('id, numero_cnj, tracking_id, detalhes_request_id, monitoramento_ativo')
  .eq('tenant_id', tenantId);

// Buscar histórico de requests
const historico = await supabase.from('oab_request_historico')
  .select('id, request_id, tipo_busca, created_at')
  .eq('tenant_id', tenantId);
```

Esta alternativa é mais simples e não requer migração de dados, mas a consulta é mais lenta.

---

## Resultado Esperado

1. Novo botão no TenantCard com ícone 🗃️ (Hash/Database)
2. Dialog abre mostrando todos os IDs do tenant organizados por categoria
3. Cada ID tem botão de copiar
4. Dados históricos (já existentes) aparecem imediatamente
5. Novos IDs são registrados automaticamente via triggers
