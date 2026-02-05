
# Correção: Andamentos Existem no JSON mas Edge Function não os Encontra

## Problema Identificado

O processo `0011205-10.2021.8.16.0021` tem:
- **201 steps** salvos no campo `detalhes_completos` (JSONB)
- **0 registros** na tabela `processos_oab_andamentos`

Quando o usuário clica em "Atualizar andamentos", a Edge Function `judit-consultar-detalhes-request`:
1. Faz GET na API Judit usando o `request_id` salvo
2. A API retorna `page_data: 2` items, mas **nenhum contém steps**
3. A Edge Function reporta "0 andamentos encontrados"
4. Nenhum andamento é inserido

## Causa Raiz

O `request_id: fa2889c3-a410-4fae-b2c9-f86716040030` está associado a uma resposta da API que não contém os andamentos originais. Isso pode ocorrer porque:
- O request expirou na API Judit
- É um request_id de capa/summary, não de detalhes completos
- A estrutura do response mudou

## Solução

Adicionar **fallback** na Edge Function para usar os dados do campo `detalhes_completos` quando a API não retorna steps. Isso garante que os andamentos existentes no banco sejam migrados para a tabela relacional.

## Alterações na Edge Function

### supabase/functions/judit-consultar-detalhes-request/index.ts

```typescript
// ATUAL (linhas 48-57):
// Buscar dados do processo para obter CNJ e tenant_id
const { data: processoData } = await supabase
  .from('processos_oab')
  .select('numero_cnj, tenant_id')
  .eq('id', processoOabId)
  .single();

// NOVO: Também buscar detalhes_completos como fallback
const { data: processoData } = await supabase
  .from('processos_oab')
  .select('numero_cnj, tenant_id, detalhes_completos')
  .eq('id', processoOabId)
  .single();
```

```typescript
// ATUAL (linhas 105-109):
const responseData = lawsuitData || {};
const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];
const aiSummary = summaryData?.summary || summaryData?.content || null;

console.log('[Judit Consultar Request] Andamentos encontrados:', steps.length);

// NOVO: Fallback para detalhes_completos se API não retornar steps
let steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];

// Se a API não retornou steps, usar os dados salvos no banco
if (steps.length === 0 && processoData.detalhes_completos?.steps) {
  console.log('[Judit Consultar Request] API sem steps, usando fallback do banco');
  steps = processoData.detalhes_completos.steps || [];
}

console.log('[Judit Consultar Request] Andamentos encontrados:', steps.length);
```

## Resumo Visual

```text
FLUXO ATUAL (quebrado):
┌─ Usuário clica "Atualizar" ────────────────────────────┐
│                                                        │
│  GET API Judit (request_id)                           │
│        │                                               │
│        ▼                                               │
│  Resposta: { page_data: 2, steps: [] } ← Sem dados!   │
│        │                                               │
│        ▼                                               │
│  "0 andamentos inseridos" ← Falha silenciosa          │
└────────────────────────────────────────────────────────┘

FLUXO COM FALLBACK (corrigido):
┌─ Usuário clica "Atualizar" ────────────────────────────┐
│                                                        │
│  GET API Judit (request_id)                           │
│        │                                               │
│        ▼                                               │
│  Resposta: { page_data: 2, steps: [] }                │
│        │                                               │
│        ▼                                               │
│  steps.length === 0?                                   │
│        │ SIM                                           │
│        ▼                                               │
│  Fallback: usar detalhes_completos.steps do banco     │
│  (201 andamentos)                                      │
│        │                                               │
│        ▼                                               │
│  "201 andamentos inseridos" ← Sucesso!                │
└────────────────────────────────────────────────────────┘
```

## Arquivo a Editar

1. `supabase/functions/judit-consultar-detalhes-request/index.ts`

## Benefícios

- Resolve o processo `0011205-10.2021.8.16.0021` imediatamente
- Corrige qualquer outro processo na mesma situação
- Não depende de nova chamada POST (paga) à API Judit
- Usa dados que já existem no banco
