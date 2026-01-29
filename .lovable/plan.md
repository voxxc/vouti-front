

## Atualização Manual de Processos Monitorados

### Problema Identificado

O webhook `judit-webhook-oab` foi corrigido, porém ele **nunca foi chamado pela Judit**:
- Monitoramento ativado desde 22/01/2026
- 20+ processos com `tracking_id` valido
- 0 chamadas recebidas no webhook
- Os andamentos existentes foram carregados manualmente

### Solucao Proposta

Criar uma **Edge Function de sincronizacao manual** que busca atualizacoes diretamente na API Judit para todos os processos com monitoramento ativo.

---

### Nova Edge Function: `judit-sync-monitorados`

**Funcionalidade:**
1. Lista todos os processos com `monitoramento_ativo = true`
2. Para cada processo, executa o fluxo correto:
   - GET `/tracking/{tracking_id}` para obter historico
   - GET `/responses?request_id=...` para obter dados completos
3. Insere novos andamentos (com deduplicacao)
4. Retorna relatorio de atualizacoes

**Fluxo:**
```text
+------------------------+
|  Super Admin clica em  |
|  "Sincronizar Agora"   |
+-----------+------------+
            |
            v
+------------------------+
| Edge Function busca    |
| processos monitorados  |
+-----------+------------+
            |
            v
+------------------------+
| Para cada processo:    |
| GET /tracking/{id}     |
+-----------+------------+
            |
            v
+------------------------+
| GET /responses         |
| ?request_id=...        |
+-----------+------------+
            |
            v
+------------------------+
| Insere novos           |
| andamentos (dedup)     |
+------------------------+
```

---

### Codigo da Edge Function

```typescript
// supabase/functions/judit-sync-monitorados/index.ts

// Fluxo:
// 1. Buscar processos com monitoramento_ativo = true
// 2. Para cada tracking_id:
//    - GET /tracking/{tracking_id} -> obter request_id
//    - GET /responses?request_id=... -> obter steps
// 3. Inserir novos andamentos com deduplicacao
// 4. Retornar relatorio
```

---

### Interface no Super Admin

Adicionar botao na aba de Auditoria ou criar nova aba "Monitoramento":

```tsx
<Button onClick={() => sincronizarMonitorados.mutate()}>
  <RefreshCw className="w-4 h-4 mr-2" />
  Sincronizar Processos Monitorados
</Button>
```

Exibir resultado:
```
Sincronizacao concluida:
- 20 processos verificados
- 15 novos andamentos encontrados
- 3 processos atualizados
```

---

### Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/judit-sync-monitorados/index.ts` | CRIAR - Nova Edge Function |
| `src/components/SuperAdmin/MonitoramentoAudit.tsx` | CRIAR - Interface de sincronizacao |
| `src/pages/SuperAdmin.tsx` | MODIFICAR - Adicionar aba/botao |

---

### Beneficios

1. **Atualizacao imediata** - Nao depende do webhook da Judit
2. **Debug** - Valida se o fluxo GET esta funcionando
3. **Backup** - Alternativa caso webhook falhe
4. **Visibilidade** - Super Admin pode forcar sincronizacao a qualquer momento

---

### Proximos Passos

1. Implementar Edge Function `judit-sync-monitorados`
2. Adicionar botao no Super Admin
3. Testar com um processo
4. Se funcionar, executar para todos os processos monitorados
5. Verificar com Judit por que o webhook nao esta sendo chamado

