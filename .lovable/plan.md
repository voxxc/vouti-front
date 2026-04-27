## Frontend do Wizard + Cron de automação

Conclusão da Fase 2 da importação em massa: interface visual + agendamento automático do worker.

### O que vai ser construído

#### 1. Wizard de importação (3 passos)
**Arquivo**: `src/components/Controladoria/ImportarPlanilhaWizard.tsx`

```text
┌─ Passo 1: Upload ──────────────────────────────┐
│  • Drop zone para .xlsx / .xls / .csv          │
│  • Botão "Baixar modelo Excel"                 │
│  • Lê arquivo no browser com SheetJS (xlsx)    │
│  • Limite: 5MB / 500 linhas                    │
└────────────────────────────────────────────────┘
                       ▼
┌─ Passo 2: Preview + Validação ─────────────────┐
│  Chama processo-import-validar-planilha        │
│  Tabela com checkbox por linha:                │
│  [✓] CNJ            Status                     │
│  [✓] 0001-00...     ✅ Válido                  │
│  [✓] 0002-00...     ⚠️ Já cadastrado          │
│  [✗] 0003-XX...     ❌ CNJ inválido            │
│  Filtros: válidos / duplicados / erros         │
│  Resumo: "412 válidos, 8 duplicados, 3 erros"  │
└────────────────────────────────────────────────┘
                       ▼
┌─ Passo 3: Confirmar ───────────────────────────┐
│  • "Importar 412 processos"                    │
│  • Chama processo-import-criar-lote            │
│  • Toast de sucesso, fecha dialog              │
└────────────────────────────────────────────────┘
```

**Arquivos auxiliares**:
- `src/utils/parseProcessoExcel.ts` — usa lib `xlsx` (SheetJS) para ler planilhas no browser e gerar o template para download
- Dependência nova: `xlsx` (SheetJS) via `bun add xlsx`

#### 2. Aba "Importações" na Controladoria
**Arquivo**: `src/components/Controladoria/ImportacoesTab.tsx`

Lista de lotes (cards) ordenados por data:
```text
┌──────────────────────────────────────────────┐
│ Lote #4 • 27/04/2026 14:20 • por João        │
│ ████████████░░░░░░  287/412 (69%)            │
│ ✅ 270  ⚠️ 12 dup.  ❌ 5  ⏳ 125              │
│ [Ver detalhes] [Reprocessar falhas]          │
└──────────────────────────────────────────────┘
```

Drill-down ao clicar "Ver detalhes" → drawer com tabela job-a-job (CNJ, status, tentativas, erro, link para o processo criado).

**Hook**: `src/hooks/useImportLotes.ts` — query + Supabase Realtime para atualização em tempo real.

#### 3. Integração na OABManager
**Arquivo editado**: `src/components/Controladoria/OABManager.tsx`
- Adicionar botão **"Importar planilha"** ao lado do botão "Importar por CNJ" existente
- Adicionar nova aba interna "Importações" mostrando o `ImportacoesTab`

#### 4. Cron pg_cron (worker automático)
SQL via insert tool (porque contém URL e anon key):
```sql
SELECT cron.schedule(
  'processo-import-worker-1min',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/processo-import-worker',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

Pré-requisito: garantir extensões `pg_cron` e `pg_net` ativas (verificar via migration).

### Arquivos criados/editados

| Arquivo | Tipo |
|---|---|
| `src/components/Controladoria/ImportarPlanilhaWizard.tsx` | novo |
| `src/components/Controladoria/ImportacoesTab.tsx` | novo |
| `src/components/Controladoria/ImportLoteCard.tsx` | novo |
| `src/components/Controladoria/ImportJobsDrawer.tsx` | novo |
| `src/hooks/useImportLotes.ts` | novo |
| `src/utils/parseProcessoExcel.ts` | novo |
| `src/components/Controladoria/OABManager.tsx` | editado (botão + aba) |
| `package.json` | editado (`xlsx`) |
| Cron pg_cron | SQL via insert |

### Resultado final

1. Você baixa o modelo `.xlsx`, preenche com seus CNJs (e dados opcionais como cliente, parte, etiquetas).
2. Faz upload, revisa os erros/duplicados na tela, clica importar.
3. Fecha a aba se quiser — o worker no servidor processa tudo a cada minuto.
4. Acompanha o progresso em tempo real na aba "Importações".
5. Falhas ficam visíveis com botão "Reprocessar" de 1 clique.

Aprova para eu implementar?