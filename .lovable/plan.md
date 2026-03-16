

# Corrigir datas com 1 dia a menos no Dashboard + Auditoria de prazos

## Problema raiz

`PrazosAbertosPanel.tsx` usa `new Date("2026-03-17")` para parsear datas `YYYY-MM-DD`. JavaScript interpreta isso como UTC meia-noite, que no fuso do Brasil (UTC-3) vira `2026-03-16 21:00` — exibindo o dia anterior. O projeto já tem `parseLocalDate` em `src/lib/dateUtils.ts` que resolve isso, mas não está sendo usado no dashboard.

A Agenda (`useAgendaData.ts`) já usa `parseISO(dateString + 'T12:00:00')` que evita o problema — por isso lá mostra dia 17 correto.

## Alterações

### 1. `src/components/Dashboard/PrazosAbertosPanel.tsx`

Importar `parseLocalDate` de `@/lib/dateUtils` e substituir **todas** as ocorrências de `new Date(dateStr)` / `new Date(prazo.date)` / `new Date(tarefa.dataExecucao)` por `parseLocalDate(...)`:

- **Linha 280**: `new Date(dateStr)` → `parseLocalDate(dateStr)`
- **Linha 400** (2x): `new Date(prazo.date)` → `parseLocalDate(prazo.date)`
- **Linha 424**: `new Date(prazo.date)` → `parseLocalDate(prazo.date)`
- **Linha 490** (2x): `new Date(tarefa.dataExecucao)` → `parseLocalDate(tarefa.dataExecucao)`
- **Linha ~512**: `new Date(tarefa.dataExecucao)` → `parseLocalDate(tarefa.dataExecucao)` (format call)

Total: ~8 substituições de `new Date(string)` por `parseLocalDate(string)`.

### 2. Auditoria global de timezone em prazos

Buscar e corrigir o mesmo padrão (`new Date` com string de data `YYYY-MM-DD`) nos demais componentes que exibem datas de prazos:

- `src/components/Controladoria/` — tabelas de prazos concluídos/abertos
- `src/components/Agenda/` — componentes de exibição
- `src/components/Project/` — abas de prazos em projetos

Qualquer componente que receba `date: string` do Supabase (formato `YYYY-MM-DD`) e faça `new Date(date)` será corrigido para `parseLocalDate(date)`.

### Arquivos
- `src/components/Dashboard/PrazosAbertosPanel.tsx` (principal — fix imediato)
- Outros arquivos identificados na auditoria (mesma correção padrão)

