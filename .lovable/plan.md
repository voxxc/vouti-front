# Plano: Audiências a partir de andamentos

## Causa raiz
O drawer de Audiências hoje só mostra empty state. Já existem dados úteis em `processos_oab_andamentos` (729 registros no tenant Solvenza com a palavra "audiência"), com texto padronizado tipo:

- `AUDIÊNCIA DO ART. 334 CPC DESIGNADA (AGENDADA PARA: 24 DE SETEMBRO DE 2026 ÀS 13:34, EM CEJUSC CASCAVEL - PRO CART - CÍVEL, MODALIDADE: SEMIPRESENCIAL)`
- `AUDIÊNCIA DE CONCILIAÇÃO DESIGNADA (AGENDADA PARA: 13 DE AGOSTO DE 2026 ÀS 15:20, EM CEJUSC PALOTINA - PRO PAUTA, MODALIDADE: SEMIPRESENCIAL)`
- `EXPEDIÇÃO DE INTIMAÇÃO REFERENTE AO EVENTO (SEQ. 21) AUDIÊNCIA DE CONCILIAÇÃO DESIGNADA (01/06/2026).`

## Correção (front-end apenas, sem migration)

### 1. Hook `useAudienciasIdentificadas`
- Query em `processos_oab_andamentos` filtrando por `tenant_id` + `descricao ILIKE '%audiência%'` (usar `fetchAllPaginated`).
- Para cada andamento, rodar um parser que tenta extrair, nesta ordem:
  1. Regex longa: `AGENDADA PARA:\s*(\d+)\s+DE\s+([A-ZÇ]+)\s+DE\s+(\d{4})\s+ÀS\s+(\d{2}:\d{2}),\s*EM\s+([^,]+?)(?:,\s*MODALIDADE:\s*(\w+))?\)`
  2. Regex curta: `DESIGNADA\s*\((\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2})(?::\d{2})?)?\)`
  3. Se nada casar e a descrição não tem palavra-chave de agendamento (`DESIGNADA|REDESIGNADA|AGENDADA|MARCADA`), descartar.
- Para os matches, retornar: `{ id, processo_oab_id, numero_cnj, parte_ativa, parte_passiva, juizo, data_audiencia (Date), local, modalidade, tipo (Conciliação/Instrução/334 etc.), descricao_original, data_movimentacao }`.
- Deduplicar por (processo_oab_id + data_audiencia) — múltiplos andamentos costumam referenciar a mesma audiência.
- Join leve com `processos_oab` (select `id, numero_cnj, parte_ativa, parte_passiva, juizo`) com `.in('id', ids)`.

### 2. Reescrita do `AudienciasDrawer.tsx`
Layout proposto (mantém o cabeçalho com ícone Gavel já existente):

```text
┌─ Audiências ──────────────────────────────── [busca] ─┐
│ Tabs: [Próximas (n)] [Realizadas (n)] [Todas]         │
│                                                        │
│ ── Setembro 2026 ────────────────────────────────────  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 24 set · 13:34   [Conciliação] [Semipresencial]  │  │
│ │ 0001234-56.2026.8.16.0001                         │  │
│ │ João da Silva × Banco XYZ                         │  │
│ │ CEJUSC Cascavel – Pro Cart Cível                  │  │
│ │ [Abrir processo]                                  │  │
│ └──────────────────────────────────────────────────┘  │
│ ── Agosto 2026 ────────────────────────────────────    │
│ ...                                                    │
└────────────────────────────────────────────────────────┘
```

- Card por audiência, agrupado por mês.
- Badge para tipo (`Conciliação`, `Instrução`, `Art. 334`, `Outras`) e modalidade (`Presencial / Virtual / Semipresencial`).
- Tab default `Próximas` (audiência ≥ hoje), ordenadas crescente. `Realizadas` em ordem decrescente.
- Busca local por número CNJ / parte / local.
- Empty state preservado quando lista vazia.
- Botão "Abrir processo" navega para a página do processo OAB (mesmo padrão usado em outros lugares — vou reaproveitar o link existente, sem criar nova rota).

### 3. Sem mudanças no Sidebar / gate
Continua restrito ao Daniel via `useIsDaniel` já corrigido.

## Arquivos afetados
- `src/hooks/useAudienciasIdentificadas.ts` (novo)
- `src/components/Audiencias/AudienciasDrawer.tsx` (reescrito)
- `src/components/Audiencias/AudienciaCard.tsx` (novo, opcional para manter o drawer enxuto)

## Impacto
- **Usuário final (Daniel/Solvenza):** abre o botão "Audiências" e vê lista real de audiências já designadas, com data, hora, local, modalidade e processo. Tabs Próximas/Realizadas + busca.
- **Dados:** somente leitura em `processos_oab_andamentos` + `processos_oab` (com filtro `tenant_id` e paginação). Sem migration, sem RLS nova, sem trigger. Performance: ~729 linhas no tenant, parser roda em memória — leve.
- **Riscos colaterais:** parser pode não cobrir 100% dos formatos (regex fallback descarta o que não casar). Audiências canceladas/redesignadas aparecerão duplicadas até implementarmos lógica de "última designação vence" — fica como melhoria futura.
- **Quem é afetado:** apenas Daniel (gate `useIsDaniel`). Outros usuários não veem o botão.

## Validação
1. Abrir drawer no tenant Solvenza logado como Daniel → conferir se aparecem os ~10 andamentos de exemplo da query (24/09/2026, 13/08/2026, etc.).
2. Conferir agrupamento por mês e ordenação.
3. Conferir tabs Próximas vs Realizadas com base na data atual (11/06/2026).
4. Conferir que outro usuário continua sem ver o botão.
