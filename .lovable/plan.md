

## Plano: Corrigir Extração de Andamentos na Sincronização Manual

### Problema Identificado

A função `judit-sync-monitorados` (usada no botão "Sincronizar Agora" do Super Admin) tem lógica incompleta de extração de dados comparada à função `judit-buscar-detalhes-processo` que funciona corretamente.

Isso explica por que o processo `0012919-29.2025.8.16.0194` foi atualizado (API retornou dados no campo `steps`) mas o processo `0045144-39.2025.8.16.0021` não foi (API provavelmente retornou no campo `movements` ou `andamentos`).

---

### Comparação das Funções

```text
judit-buscar-detalhes-processo (FUNCIONA - Linha 211):
const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];

judit-sync-monitorados (BUGADO - Linha 293):
const steps = responseData.steps || [];
```

---

### Correções Necessárias

**Arquivo**: `supabase/functions/judit-sync-monitorados/index.ts`

#### Correção 1: Extração de lista de andamentos (Linha 293)

De:
```typescript
const steps = responseData.steps || [];
```

Para:
```typescript
const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];
```

#### Correção 2: Extração de data (Linha 296)

De:
```typescript
const stepDate = step.step_date || step.date || null;
```

Para:
```typescript
const stepDate = step.step_date || step.date || step.data || step.data_movimentacao || null;
```

#### Correção 3: Extração de conteúdo (Linha 297)

De:
```typescript
const stepContent = step.content || step.step_content || step.title || '';
```

Para:
```typescript
const stepContent = step.content || step.description || step.descricao || step.step_content || step.title || '';
```

---

### Detalhes Tecnicos

#### Por que isso acontece?

A API Judit retorna dados em formatos diferentes dependendo:
- Do tribunal de origem
- Do tipo de processo
- Da versão da resposta

Por isso, é necessário verificar múltiplos campos possíveis.

#### Por que uma função funcionou e outra não?

As duas funções foram escritas em momentos diferentes. A `judit-buscar-detalhes-processo` foi corrigida posteriormente, mas a correção não foi propagada para a `judit-sync-monitorados`.

---

### Fluxo Atual (Confirmado Gratuito)

```text
1. GET /tracking/{tracking_id}
   └─> Retorna request_id mais recente
   
2. GET /responses?request_id={request_id}
   └─> Retorna andamentos processados pelo monitoramento diário
   
3. Inserção com deduplicação
   └─> Apenas andamentos novos são inseridos
```

Todas as chamadas são GET (gratuitas). O custo já foi pago quando o monitoramento foi ativado.

---

### Resultado Esperado

Após a correção, ao rodar "Sincronizar Agora" no Super Admin:
- O processo `0045144-39.2025.8.16.0021` receberá os andamentos que estavam sendo ignorados
- Todos os processos com formatos alternativos de resposta serão processados corretamente

---

### Teste Recomendado

1. Aplicar a correção
2. Fazer deploy da edge function
3. Rodar sincronização manual no Super Admin
4. Verificar se o processo `0045144-39.2025.8.16.0021` foi atualizado

