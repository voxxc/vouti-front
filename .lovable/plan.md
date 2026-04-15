

## Plano: Soft delete para credenciais do cofre Judit

### Problema
Ao deletar uma credencial do cofre Judit, o registro é removido fisicamente da tabela `credenciais_judit` (`.delete()`), perdendo o histórico.

### Solução
Substituir o `DELETE` por um `UPDATE` que marca o registro como `removed`, preservando o histórico.

### Alterações

**1. Migration: adicionar coluna `removido_em`**
```sql
ALTER TABLE public.credenciais_judit 
ADD COLUMN removido_em timestamptz DEFAULT NULL;
```
- `NULL` = ativo, preenchido = removido do cofre

**2. `src/hooks/useTenantCredenciais.ts`**
- No `deletarCredencialJudit`: trocar `.delete()` por `.update({ status: 'removed', removido_em: new Date().toISOString() })`
- No query de `credenciaisJudit`: **não filtrar** removidos — manter todos no histórico

**3. UI (TenantCredenciaisDialog ou equivalente)**
- Na aba Histórico: mostrar badge "Removido" (cinza) quando `removido_em` estiver preenchido
- Desabilitar botão de deletar para registros já removidos

### Arquivos

| Ação | Arquivo |
|------|---------|
| Migration | Adicionar coluna `removido_em` em `credenciais_judit` |
| Editar | `src/hooks/useTenantCredenciais.ts` — soft delete |
| Editar | Componente de histórico — badge de removido |

