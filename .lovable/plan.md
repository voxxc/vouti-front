

# Corrigir vinculação incorreta de Processo Judicial em prazos

## Problema

Quando um prazo é criado a partir de um Protocolo/Etapa (via `CreateDeadlineDialog`), o código faz:

```typescript
processo_oab_id: protocolo.processo_oab_id || (window as any).__currentProcessoOabId || null
```

O `__currentProcessoOabId` é um estado global de janela definido quando o drawer de detalhes de um Caso (OAB) está aberto. Se o protocolo não tem processo vinculado, mas o usuário navegou anteriormente por um Caso, o prazo herda esse processo **incorretamente**.

No caso reportado, o prazo "BONI GLASS - REVISIONAL SANTANDER" foi criado pela etapa PERÍCIA de um protocolo que **não tem** processo vinculado, mas herdou o processo `5000425-55.2026.4.04.9999` via `__currentProcessoOabId`.

## Solução

### 1. Corrigir o dado no banco (fix imediato)
- Remover o `processo_oab_id` do prazo `2d6520cc-06a8-431c-be31-45367aa186a3` que foi vinculado incorretamente.

### 2. Corrigir `CreateDeadlineDialog.tsx` (prevenção)
- Remover o fallback `(window as any).__currentProcessoOabId` da criação de prazos via protocolo. Se o protocolo não tem processo vinculado, o prazo não deve ter processo.
- O `__currentProcessoOabId` só faz sentido quando a criação é feita **diretamente** dentro do drawer de um Caso (aba Prazos do Caso), não via protocolo.

### 3. Ajustar a lógica de exibição no detalhe
- No `DeadlineDetailDialog.tsx` e `AgendaContent.tsx`, quando um prazo tem `protocolo_etapa_id` E `processo_oab_id`, mas o protocolo **não** tem esse processo vinculado, não exibir a seção "Processo Judicial" — pois o vínculo é espúrio.

### Arquivos
- `src/components/Project/CreateDeadlineDialog.tsx` — remover fallback `__currentProcessoOabId`
- `src/components/Agenda/DeadlineDetailDialog.tsx` — filtrar processos espúrios
- `src/components/Agenda/AgendaContent.tsx` — mesma filtragem
- Fix de dados via SQL: limpar o `processo_oab_id` do prazo afetado

