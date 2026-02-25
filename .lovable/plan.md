

## Mostrar Caso vinculado nos detalhes do Prazo (e vice-versa)

### Situação atual

Nos detalhes de um prazo, já existem duas seções de "origem":
- **Processo Judicial (Caso)**: quando o prazo tem `processo_oab_id` direto
- **Processo de Origem (Protocolo/Etapa)**: quando o prazo tem `protocolo_etapa_id`

Mas faltam os **cruzamentos**:
1. Prazo vem de um **Processo** (protocolo) → não mostra o **Caso** vinculado a esse protocolo
2. Prazo vem de um **Caso** → não mostra o **Processo** vinculado a esse caso

### O que mudar

**Dois locais de detalhe de prazo:**
- `AgendaContent.tsx` (Agenda geral, linhas 952-1097)
- `ProjectProtocoloContent.tsx` (dentro do protocolo, linhas 665-753)

---

**1. `AgendaContent.tsx` — Fetch e mapeamento (linhas 170-233)**

Na query, o join `protocolo_etapa → project_protocolos` já existe. Preciso expandir para trazer o `processo_oab_id` do protocolo:

```
protocolo_etapa:project_protocolo_etapas (
  id, nome,
  protocolo:project_protocolos (nome, project_id, processo_oab_id)
)
```

E buscar separadamente os dados do caso vinculado ao protocolo (ou vice-versa). Para simplificar, farei um segundo fetch lazy: quando o usuário abre os detalhes de um prazo que tem `protocoloOrigem` mas não tem `processoOrigem`, busco o caso via `project_protocolos.processo_oab_id`. E quando tem `processoOrigem` mas não `protocoloOrigem`, busco o protocolo via `project_protocolos.processo_oab_id`.

Na prática:
- Expandir o join do protocolo para incluir `processo_oab_id` no select
- No mapeamento, se `protocolo_etapa.protocolo.processo_oab_id` existe e o deadline NÃO tem `processo_oab_id` direto, buscar os dados do caso (pode ser feito no mesmo batch usando os IDs coletados)
- Se o deadline tem `processo_oab_id` mas NÃO tem `protocolo_etapa_id`, buscar se existe algum `project_protocolos` com esse `processo_oab_id` para mostrar o protocolo vinculado

**Abordagem eficiente**: após o fetch principal dos deadlines, coletar todos os `processo_oab_id` extras (vindos dos protocolos) e todos os `processo_oab_id` dos deadlines sem protocolo, e fazer 1-2 queries adicionais para resolver os cruzamentos.

---

**2. Tipos (`src/types/agenda.ts`)**

Adicionar ao `Deadline`:
```typescript
// Caso vinculado (quando o prazo vem de um Processo que está vinculado a um Caso)
casoVinculado?: ProcessoOrigem;

// Processo vinculado (quando o prazo vem de um Caso que está vinculado a um Processo)
protocoloVinculado?: ProtocoloOrigem & { protocoloId?: string };
```

---

**3. UI nos detalhes — `AgendaContent.tsx` (após linha 1097)**

Adicionar duas novas seções:

- Se o prazo tem `protocoloOrigem` e `casoVinculado`: mostrar card "Caso Vinculado" com CNJ, partes, tribunal e botão "Ver Caso"
- Se o prazo tem `processoOrigem` e `protocoloVinculado`: mostrar card "Processo Vinculado" com nome do protocolo e botão "Ver Projeto"

---

**4. `ProjectProtocoloContent.tsx` (linhas 665-753)**

Neste dialog de detalhe, o protocolo já é conhecido e pode ter `processoOabId`. Quando abrir os detalhes:
- Se o protocolo tem `processoOabId`, buscar dados do caso (CNJ, partes, tribunal) e exibir seção "Caso Vinculado" no dialog de detalhe do prazo
- Essa busca pode ser feita no `openDeadlineDetails` ou como um estado pré-carregado

---

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/types/agenda.ts` | Adicionar `casoVinculado` e `protocoloVinculado` ao tipo `Deadline` |
| `src/components/Agenda/AgendaContent.tsx` | Expandir query, resolver cruzamentos, adicionar seções de UI |
| `src/components/Project/ProjectProtocoloContent.tsx` | Carregar caso vinculado e exibir no dialog de detalhe |

### Nenhuma mudanca de banco necessaria

As tabelas `deadlines`, `project_protocolos` e `processos_oab` já têm todos os campos e FKs necessárias para esses cruzamentos.

