
# Otimização do Botão "Carregar/Atualizar Andamentos"

## Objetivo

Transformar o botão de carregar andamentos em um "atualizador inteligente" que prioriza chamadas gratuitas (GET) quando o processo já tem `tracking_id` de monitoramento ativo, evitando custos desnecessários.

---

## Situação Atual vs Proposta

| Cenário | Hoje | Proposta |
|---------|------|----------|
| Tem `detalhes_request_id` | GET gratuito ✓ | GET gratuito ✓ |
| Tem `tracking_id` (sem request_id) | POST pago ✗ | GET tracking → GET responses (gratuito!) ✓ |
| Não tem nenhum ID | POST pago | POST pago |

---

## Fluxo Otimizado

```text
┌─────────────────────────────────────────────────────────────┐
│              ATUALIZAR ANDAMENTOS - SMART                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Verificar detalhes_request_id salvo?                    │
│        │                                                    │
│    ┌───┴───┐                                                │
│   SIM     NÃO                                               │
│    │       │                                                │
│    │       ▼                                                │
│    │   2. Verificar tracking_id (monitoramento)?            │
│    │       │                                                │
│    │   ┌───┴───┐                                            │
│    │  SIM     NÃO                                           │
│    │   │       │                                            │
│    │   ▼       ▼                                            │
│    │  GET /tracking/{id}    POST /requests (PAGO)           │
│    │  → Extrair request_id        │                         │
│    │       │                      │                         │
│    ▼       ▼                      ▼                         │
│  GET /responses?request_id={id}  (GRATUITO)                 │
│        │                                                    │
│        ▼                                                    │
│   Inserir novos andamentos                                  │
│   Salvar request_id no processo                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Alterações no Sistema

### 1. Modificar Edge Function: `judit-buscar-detalhes-processo`

Adicionar verificação de `tracking_id` antes de fazer POST pago:

```typescript
// NOVA LÓGICA (após verificar detalhes_request_id):

// Se não tem request_id, verificar se tem tracking_id
if (!requestId) {
  const { data: processoComTracking } = await supabase
    .from('processos_oab')
    .select('tracking_id')
    .eq('id', processoOabId)
    .single();

  if (processoComTracking?.tracking_id) {
    // GET gratuito no tracking para obter request_id
    const trackingResponse = await fetch(
      `https://tracking.prod.judit.io/tracking/${processoComTracking.tracking_id}`,
      { headers: { 'api-key': juditApiKey } }
    );
    
    const trackingData = await trackingResponse.json();
    const latestRequestId = trackingData.last_request_id || 
                            trackingData.page_data?.[0]?.request_id;
    
    if (latestRequestId) {
      requestId = latestRequestId;
      usedExistingRequest = true; // GET gratuito!
    }
  }
}
```

### 2. Modificar UI: `ProcessoOABDetalhes.tsx`

**Unificar botão** e mostrar badge indicando se é gratuito ou pago:

```text
┌─────────────────────────────────────────────────────────────┐
│  Cenário: Processo com tracking_id (monitoramento ativo)    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚡ Andamentos não carregados                               │
│                                                             │
│  [ 🔄 Atualizar Andamentos ] [Badge: Gratuito]              │
│                                                             │
│  ℹ️ Monitoramento ativo - atualização via tracking          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Cenário: Processo SEM tracking e SEM request_id            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚡ Andamentos não carregados                               │
│                                                             │
│  [ 🔄 Carregar Andamentos ] [Badge: Custo]                  │
│                                                             │
│  ⚠️ Esta consulta pode gerar custo                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Lógica de Badge no Frontend

```typescript
// Determinar se operação será gratuita
const isGratuito = !!processo.detalhes_request_id || !!processo.tracking_id;

// Remover confirmação dupla se for gratuito
// Se isGratuito, chamar diretamente sem modal de confirmação
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/judit-buscar-detalhes-processo/index.ts` | Adicionar verificação de `tracking_id` |
| `src/components/Controladoria/ProcessoOABDetalhes.tsx` | Unificar botão + badge + lógica condicional |

---

## Benefícios

1. **Economia de custos**: Processos com monitoramento ativo usarão GET gratuito
2. **UX simples**: Usuário só vê um botão "Atualizar" - não precisa saber o que é GET/POST
3. **Transparência**: Badge indica se haverá custo ou não
4. **Menos confirmações**: Se gratuito, não precisa da dupla confirmação

---

## Cenários de Uso

| Usuário | Situação | Comportamento |
|---------|----------|---------------|
| Advogado | Abre processo com monitoramento ativo | Vê badge "Gratuito", clica e atualiza sem modal |
| Advogado | Abre processo SEM monitoramento | Vê badge "Custo", clica e vê dupla confirmação |
| Advogado | Processo já tem andamentos carregados | Botão de refresh no header, sempre gratuito |
