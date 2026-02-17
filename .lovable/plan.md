

## Isolar projetos CRM do Vouti Legal

### Problema

Projetos criados no Vouti CRM (com `module = 'crm'`) estao aparecendo em contagens e buscas do Vouti Legal. Isso acontece porque varias queries nao filtram pelo campo `module`.

O hook `useProjectsOptimized` ja filtra corretamente com `.eq('module', 'legal')`, mas outros pontos do sistema nao fazem essa filtragem.

---

### Arquivos a modificar

| Arquivo | O que falta |
|---|---|
| `src/components/Search/ProjectQuickSearch.tsx` | Query de projetos nao filtra por module -- CRM aparece na busca rapida |
| `src/components/Dashboard/Metrics/AdminMetrics.tsx` | Contagem de projetos no dashboard inclui CRM |
| `src/components/Dashboard/Metrics/FinanceiroMetrics.tsx` | Contagem de projetos no dashboard inclui CRM |
| `src/hooks/usePrefetchPages.ts` | Prefetch de contagem de projetos inclui CRM |

---

### Detalhes tecnicos

Em cada arquivo, adicionar `.eq('module', 'legal')` na query de projetos:

**1. ProjectQuickSearch.tsx** -- nas duas queries (admin e usuario normal):

```text
// Antes:
supabase.from('projects').select('id, name, client').eq('tenant_id', tenantId)

// Depois:
supabase.from('projects').select('id, name, client').eq('tenant_id', tenantId).eq('module', 'legal')
```

Isso se aplica tanto na query do admin (linha ~55) quanto na query do usuario normal (linha ~74).

**2. AdminMetrics.tsx** (linha ~34):

```text
// Antes:
supabase.from('projects').select('id', { count: 'exact', head: true })

// Depois:
supabase.from('projects').select('id', { count: 'exact', head: true }).eq('module', 'legal')
```

**3. FinanceiroMetrics.tsx** (linha ~56):

```text
// Antes:
supabase.from('projects').select('id', { count: 'exact', head: true })

// Depois:
supabase.from('projects').select('id', { count: 'exact', head: true }).eq('module', 'legal')
```

**4. usePrefetchPages.ts** (linha ~41):

```text
// Antes:
supabase.from('projects').select('id', { count: 'exact', head: true })

// Depois:
supabase.from('projects').select('id', { count: 'exact', head: true }).eq('module', 'legal')
```

---

### Resultado

- Projetos CRM ficam invisiveis em todo o Vouti Legal (dashboard, busca rapida, contagens)
- Projetos legais continuam funcionando normalmente
- O CRM continua acessando apenas seus proprios projetos (`module = 'crm'`) como ja faz hoje

