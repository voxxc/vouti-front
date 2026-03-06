

## Exibir prazos de Protocolos/Etapas vinculados ao Caso na aba Prazos

### Contexto

Atualmente, `PrazosCasoTab` busca apenas deadlines com `processo_oab_id` direto. Porém, um Caso pode ter Protocolos vinculados (via `project_protocolos.processo_oab_id`), e esses protocolos têm etapas (`project_protocolo_etapas`) que podem ter prazos (`deadlines.protocolo_etapa_id`). Esses prazos não aparecem na aba.

### Lógica

```text
Caso (processos_oab)
  ├── deadlines WHERE processo_oab_id = caso.id          ← JÁ FUNCIONA
  └── project_protocolos WHERE processo_oab_id = caso.id  ← NOVO
        └── project_protocolo_etapas
              └── deadlines WHERE protocolo_etapa_id = etapa.id
```

### Alterações

**`src/components/Controladoria/PrazosCasoTab.tsx`**

1. **Busca em 2 etapas** no `fetchPrazos`:
   - Query 1 (existente): `deadlines` com `processo_oab_id = processoOabId`
   - Query 2 (nova): Buscar IDs das etapas dos protocolos vinculados ao caso, depois buscar deadlines com `protocolo_etapa_id` IN esses IDs
   
2. **Merge e deduplica** os resultados (por `id`) para evitar duplicatas caso um deadline tenha tanto `processo_oab_id` quanto `protocolo_etapa_id`

3. **Indicar origem** visualmente: adicionar um badge sutil mostrando se o prazo vem do "Caso" diretamente ou de um "Protocolo/Etapa" vinculado, com o nome da etapa/protocolo

4. **Expandir a interface `PrazoCaso`** para incluir campos opcionais de origem (nome do protocolo/etapa)

### Fluxo da busca nova

```typescript
// 1. Buscar etapas de protocolos vinculados ao caso
const { data: etapas } = await supabase
  .from('project_protocolo_etapas')
  .select('id, nome, protocolo:project_protocolos!inner(id, nome, processo_oab_id)')
  .eq('protocolo.processo_oab_id', processoOabId);

// 2. Se houver etapas, buscar deadlines vinculados
const etapaIds = etapas?.map(e => e.id) || [];
if (etapaIds.length > 0) {
  const { data: prazosProtocolo } = await supabase
    .from('deadlines')
    .select(`...mesmo select...`)
    .in('protocolo_etapa_id', etapaIds)
    .order('date', { ascending: true });
}

// 3. Merge + deduplica por id
```

### Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `src/components/Controladoria/PrazosCasoTab.tsx` | Buscar prazos de protocolos vinculados ao caso, merge, badge de origem |

