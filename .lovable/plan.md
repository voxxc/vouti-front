

## Corrigir Push-Docs: informativo e métricas para CPF, CNPJ e OAB

O card e as métricas da Controladoria tratam Push-Docs como se fosse apenas CNPJ. O sistema suporta CPF, CNPJ e OAB via `push_docs_cadastrados`. Preciso corrigir os labels e as queries.

### Mudanças

**1. `src/hooks/useControladoriaCache.ts`**

- Renomear campos da interface `ControladoriaMetrics`:
  - `totalCNPJs` → `totalPushDocs`
  - `cnpjsMonitorados` → `pushDocsMonitorados`
- Atualizar as queries (linhas 82-83): trocar `cnpjs_cadastrados` e `processos_cnpj` por `push_docs_cadastrados`, filtrando `tracking_status != 'deletado'` para total e `tracking_status = 'ativo'` para monitorados.
- Atualizar valores default e retorno.

**2. `src/components/Controladoria/ControladoriaContent.tsx`**

- Linha 85: `"Push-Docs (CNPJs)"` → `"Push-Docs (Documentos)"`
- Linha 86: Trocar ícone `Building2` por `FileStack` (mais genérico)
- Linha 92: `metrics.totalCNPJs` → `metrics.totalPushDocs`
- Linha 106: `metrics.cnpjsMonitorados` → `metrics.pushDocsMonitorados`

**3. `src/pages/Controladoria.tsx`**

- Linha 87: `"Push-Docs (CNPJs)"` → `"Push-Docs (Documentos)"`
- Linha 94: `metrics.totalCNPJs` → `metrics.totalPushDocs`
- Linha 108: `metrics.cnpjsMonitorados` → `metrics.pushDocsMonitorados`

**4. `src/hooks/usePrefetchPages.ts`**

- Atualizar referência `totalCNPJs` → `totalPushDocs` e a query correspondente.

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/hooks/useControladoriaCache.ts` | Renomear campos, corrigir queries para `push_docs_cadastrados` |
| `src/components/Controladoria/ControladoriaContent.tsx` | Label e ícone do card, referências de métricas |
| `src/pages/Controladoria.tsx` | Label do card, referências de métricas |
| `src/hooks/usePrefetchPages.ts` | Referência de métricas |

