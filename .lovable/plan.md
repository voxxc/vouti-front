
# Reorganização do Monitoramento SuperAdmin + Armazenamento de Request IDs

## Situação Atual

### O Que Existe
1. **Edge Function `judit-sync-monitorados`**: Já faz o fluxo correto:
   - GET /tracking/{tracking_id} → obtém request_id
   - GET /responses?request_id={id} → obtém andamentos
   - Insere novos andamentos com deduplicação

2. **Tabela `processos_oab`**: Tem as colunas:
   - `tracking_id` → ID do monitoramento ativo
   - `detalhes_request_id` → Request ID de buscas avulsas (POST)
   - Falta: **`tracking_request_id`** → Request ID obtido via tracking (GET gratuito)

3. **UI `SuperAdminMonitoramento.tsx`**: Funcional mas pode ser melhorada

### O Problema
- O `request_id` obtido do tracking NÃO está sendo armazenado no banco
- Isso significa que não há rastreabilidade de qual request_id foi usado em cada sincronização
- A UI não mostra claramente os request_ids por tenant/processo

---

## Solução Proposta

### 1. Adicionar Coluna para Request ID do Tracking

```sql
ALTER TABLE processos_oab 
  ADD COLUMN tracking_request_id TEXT,
  ADD COLUMN tracking_request_data TIMESTAMPTZ;
```

Esta coluna armazenará o `request_id` mais recente obtido via GET /tracking.

### 2. Atualizar Edge Function `judit-sync-monitorados`

Após buscar o request_id do tracking, salvar no banco:

```typescript
// Após encontrar requestId...
await supabase
  .from('processos_oab')
  .update({
    tracking_request_id: requestId,
    tracking_request_data: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .eq('id', processo.id);
```

### 3. Reorganizar Interface SuperAdminMonitoramento

A nova interface terá:

```text
┌─────────────────────────────────────────────────────────────────┐
│ MONITORAMENTO DE PROCESSOS                     [Sincronizar]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────┬─────────────────┬─────────────────┬───────┐ │
│ │ Total Monitorando│ Com Request ID  │ Sem Request ID  │ Erro │ │
│ │      166         │      160        │        6        │  0   │ │
│ └─────────────────┴─────────────────┴─────────────────┴───────┘ │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Filtro: [Todos ▼]  [Apenas com Request ID] [Sem Request]   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ TABELA POR TENANT                                               │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ TENANT     │ CNJ           │ TRACKING_ID    │ REQUEST_ID   │  │
│ ├────────────┼───────────────┼────────────────┼──────────────┤  │
│ │ SOLVENZA   │ 0000097...    │ f641d036...    │ dd5ed103... │  │
│ │ SOLVENZA   │ 0000118...    │ c2f6a295...    │ 342c7ca8... │  │
│ │ Lucas H.   │ 0808890...    │ 83eb64c7...    │ (vazio)     │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│ AÇÕES POR PROCESSO:                                             │
│ [🔍 Consultar Tracking] [📥 Forçar GET Response] [📋 Copiar ID] │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Nova Funcionalidade: "Forçar GET Response"

Botão para processos individuais que:
1. Consulta GET /tracking/{id} → obtém request_id
2. Consulta GET /responses?request_id={id} → obtém andamentos
3. Insere no banco com deduplicação
4. Atualiza `tracking_request_id` e `tracking_request_data`

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Adicionar colunas `tracking_request_id` e `tracking_request_data` |
| `supabase/functions/judit-sync-monitorados/index.ts` | Salvar request_id obtido do tracking |
| `src/components/SuperAdmin/SuperAdminMonitoramento.tsx` | Reorganizar UI com tabela detalhada |

---

## Fluxo de Dados Atualizado

```text
[Processo Monitorado]
       │
       ▼
 tracking_id (armazenado ao ativar monitoramento)
       │
       ▼
 GET /tracking/{tracking_id}
       │
       ▼
 request_id (NOVO: armazenar em tracking_request_id)
       │
       ▼
 GET /responses?request_id={id}
       │
       ▼
 Andamentos → processos_oab_andamentos
```

---

## Detalhes Técnicos

### Migração SQL
```sql
-- Adicionar colunas para armazenar request_id do tracking
ALTER TABLE processos_oab 
  ADD COLUMN IF NOT EXISTS tracking_request_id TEXT,
  ADD COLUMN IF NOT EXISTS tracking_request_data TIMESTAMPTZ;

-- Comentário para documentação
COMMENT ON COLUMN processos_oab.tracking_request_id IS 
  'Request ID mais recente obtido via GET /tracking. Diferente de detalhes_request_id que vem de POST.';
```

### Atualização da Edge Function

Na função `processarProcesso`:
```typescript
// Após encontrar o requestId...
console.log(`[SYNC] Saving request_id ${requestId} to DB`);

await supabase
  .from('processos_oab')
  .update({
    tracking_request_id: requestId,
    tracking_request_data: new Date().toISOString(),
  })
  .eq('id', processo.id);

// Continuar com GET /responses...
```

### Nova Estrutura da UI

A tabela mostrará:
- **Tenant**: Nome do cliente
- **CNJ**: Número do processo
- **Tracking ID**: ID do monitoramento (copiável)
- **Request ID (Tracking)**: Último request_id obtido via tracking
- **Request ID (Detalhes)**: Request ID de buscas avulsas
- **Último Sync**: Data/hora da última sincronização
- **Ações**: Consultar tracking, Forçar sync, Copiar IDs

---

## Benefícios

1. **Rastreabilidade Completa**: Saber exatamente qual request_id foi usado
2. **Auditoria por Tenant**: Ver claramente quais processos de cada cliente têm dados
3. **Debug Facilitado**: Identificar processos sem request_id para investigar
4. **Reutilização de IDs**: Evitar chamadas desnecessárias usando request_id armazenado

---

## Dados Atuais (Contexto)

```text
| Tenant                | Monitorados | Com Request ID |
|-----------------------|-------------|----------------|
| SOLVENZA              | 166         | 192 (inclui detalhes) |
| Lucas Harles          | 1           | 3              |
| Maximillian Oliveira  | 1           | 3              |
| cordeiro              | 0           | 11             |
| Metal System          | 0           | 0              |
| Vouti                 | 0           | 0              |
```

Os processos que têm `tracking_id` mas não têm `tracking_request_id` passarão a ter após a próxima sincronização.
