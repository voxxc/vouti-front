

# Nova aba "Subtarefas" na Central da Controladoria

## O que muda

Adicionar uma terceira aba **"Subtarefas"** na `CentralControladoria`, ao lado de "Prazos Concluídos". Essa aba mostra apenas os prazos concluídos que possuem subtarefas. A aba terá um badge com a contagem de subtarefas pendentes (não concluídas), similar ao badge de "Andamentos Não Lidos". **Visível apenas para o tenant Solvenza.**

## Implementação

### 1. Novo componente: `CentralSubtarefas.tsx`

- Reutilizar a lógica e interface de `CentralPrazosConcluidos`, mas filtrando apenas prazos que possuem `subtarefas.length > 0`.
- Exibir a mesma tabela com filtros (período, usuário, busca), mas focada nos prazos com subtarefas.
- Exportar a contagem total de subtarefas pendentes via callback/prop para uso no badge da aba.

### 2. Alterar `CentralControladoria.tsx`

- Importar `useTenantNavigation` para obter o `tenantSlug`.
- Adicionar tipo `'subtarefas'` ao `TabValue`.
- Condicionar exibição da aba: `tenantSlug === 'solvenza'`.
- Buscar contagem de subtarefas pendentes (query em `deadline_subtarefas` com `concluida = false` + join em `deadlines` com `completed = true` + `tenant_id`).
- Renderizar badge laranja na aba com a contagem.
- Renderizar `<CentralSubtarefas />` quando a aba estiver ativa.

### 3. Contagem do badge

```sql
-- Query para badge
SELECT COUNT(*) FROM deadline_subtarefas ds
JOIN deadlines d ON d.id = ds.deadline_id
WHERE d.tenant_id = :tenantId
  AND d.completed = true
  AND ds.concluida = false
```

No frontend, usar `supabase.from('deadline_subtarefas').select('id, deadlines!inner(tenant_id, completed)', { count: 'exact' }).eq('deadlines.tenant_id', tenantId).eq('deadlines.completed', true).eq('concluida', false)`.

### 4. Componente CentralSubtarefas

Basicamente será o `CentralPrazosConcluidos` com o filtro adicional de `subtarefas.length > 0` aplicado nos resultados. Pode ser implementado como um wrapper ou componente separado que reutiliza a mesma lógica de fetch mas filtra no final.

