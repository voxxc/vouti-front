

## Correção do Nome da Coluna - judit-sync-monitorados

### Problema Identificado

A sincronização está **falhando completamente** porque há um erro no nome da coluna:

```
Error: Could not find the 'lido' column of 'processos_oab_andamentos' in the schema cache
```

**Causa raiz:** Na Edge Function `judit-sync-monitorados`, linha 247, está sendo usado `lido: false`, mas a coluna no banco se chama `lida` (feminino).

**Impacto:** Todos os 45 processos monitorados estão tendo seus andamentos **ignorados** porque o INSERT falha em cada tentativa.

---

### Evidências

**Logs mostram:**
```
[SYNC] Sync completed: {
  total_processos: 45,
  processos_verificados: 45,
  processos_atualizados: 0,        // ← Nenhum atualizado!
  novos_andamentos: 0,             // ← Nenhum inserido!
  erros: []
}
```

**Múltiplos erros de INSERT:**
```
[SYNC] Insert error: {
  code: "PGRST204",
  message: "Could not find the 'lido' column of 'processos_oab_andamentos'"
}
```

**Schema real da tabela:**
```
column_name: lida       // ← Coluna correta é "lida"
data_type: boolean
```

---

### Solução

Corrigir a Edge Function `judit-sync-monitorados/index.ts`:

**Linha 247 - Antes:**
```typescript
lido: false,
```

**Linha 247 - Depois:**
```typescript
lida: false,
```

---

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/judit-sync-monitorados/index.ts` | Linha 247: trocar `lido` por `lida` |

---

### Resultado Esperado

Após a correção:
1. Deploy automático da Edge Function
2. Super Admin clica em "Sincronizar Agora"
3. Os novos andamentos (incluindo o do dia 26 para o processo 0012919-29.2025.8.16.0194) serão inseridos corretamente
4. Usuário verá os andamentos no resumo do processo

