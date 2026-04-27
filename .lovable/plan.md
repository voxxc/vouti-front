## Importação em massa de processos via Excel/CSV (com preview e fila resiliente)

### Contexto / o que já existe hoje

Hoje o `ImportarProcessoCNJDialog` já tem **dois modos**:
- **Único**: 1 CNJ por vez.
- **Em massa**: você cola CNJs um por um num input, vira uma lista, e ao clicar "Importar" ele chama `judit-buscar-processo-cnj` em loop (`for` no front).

Limitações atuais que causam o "bug de processos sem andamentos":
1. O loop roda no **navegador** — se você fechar a aba/perder conexão, para tudo no meio.
2. Não há **retry** quando a Judit retorna timeout/erro intermitente.
3. Não há **estado persistente** da fila — não dá para retomar nem auditar o que falhou.
4. Não há **preview/validação** antes de importar (só checa se tem 20 dígitos).
5. Não há **importação por arquivo** (Excel/CSV).
6. Andamentos são buscados *junto* do cadastro do processo na mesma chamada — se a parte de andamentos der timeout, o processo entra "vazio" e não é reprocessado.

---

### Resposta direta à sua pergunta

**Sim, Excel é a melhor forma**, mas com 3 reforços importantes:
1. **Preview obrigatório antes de importar** (você revisa, marca/desmarca linha por linha, edite o que estiver errado).
2. **Fila no banco (persistente)** + worker no servidor — não depende do navegador ficar aberto.
3. **Cadastro e busca de andamentos em etapas separadas com retry automático** — o processo só é considerado "OK" depois que os andamentos chegaram.

---

### O que será construído

#### 1. Botão "Importar planilha" na aba OAB da Controladoria

Ao lado do botão atual "Importar por CNJ", um novo botão **"Importar planilha"** abre um wizard de 3 passos.

#### 2. Wizard de importação (3 passos)

```text
┌─ Passo 1: Upload ───────────────────────────────┐
│  • Arrastar/soltar .xlsx, .xls ou .csv          │
│  • Botão "Baixar modelo Excel"                  │
│  • Tamanho máx: 5MB / 500 linhas por upload     │
└─────────────────────────────────────────────────┘
                       ▼
┌─ Passo 2: Mapeamento + Preview ─────────────────┐
│  • Auto-detecta colunas (CNJ, parte, etc.)      │
│  • Tabela com TODAS as linhas mostrando:        │
│    [✓] CNJ            Status validação          │
│    [✓] 0001-00...     ✅ Válido (novo)          │
│    [✓] 0002-00...     ⚠️ Já cadastrado (pula)   │
│    [✗] 0003-XX...     ❌ CNJ inválido           │
│    [✓] 0004-00...     ✅ Válido (novo)          │
│  • Filtros: só válidos / só erros / todos       │
│  • Editor inline para corrigir CNJs ruins       │
│  • Resumo: "412 válidos, 8 duplicados, 3 erros" │
└─────────────────────────────────────────────────┘
                       ▼
┌─ Passo 3: Confirmar e enfileirar ───────────────┐
│  • "Importar 412 processos"                     │
│  • Avisa se ultrapassa limite do plano          │
│  • Cria 1 job por linha em processo_import_jobs │
│  • Fecha o dialog imediatamente                 │
└─────────────────────────────────────────────────┘
```

#### 3. Painel "Importações" (acompanhamento)

Card/aba na Controladoria mostrando:

```text
Lote #4 — 23/04/2026 14:20  •  iniciado por João
████████████░░░░░░  287/412 (69%)
✅ 270 importados   ⚠️ 12 duplicados   ❌ 5 falhas   ⏳ 125 na fila

[Ver detalhes]  [Reprocessar falhas]  [Cancelar lote]
```

Tabela detalhada por linha com status individual: `pendente → buscando_processo → buscando_andamentos → concluido` (ou `falha_processo` / `falha_andamentos`).

Atualização em tempo real via Supabase Realtime.

#### 4. Fila resiliente (a parte que **garante que nenhum processo fique sem andamentos**)

Cada job passa por **2 etapas obrigatórias** no servidor:

```text
Etapa A (buscar processo)         Etapa B (buscar andamentos)
─────────────────                  ──────────────────────────
judit-buscar-processo-cnj    →    judit-buscar-detalhes-processo
                                          │
                              ┌───────────┴──────────┐
                          0 andamentos           ≥1 andamento
                              │                       │
                          retry x3 (5min,           ✅ concluido
                          15min, 1h)
                              │
                       ainda 0? → falha_andamentos
                       (visível no painel para
                        reprocessar manualmente)
```

Pontos-chave:
- Etapa B só roda **depois** que A confirma que o processo foi criado com `id` válido.
- Se a Judit devolve 0 andamentos, o job **não fica concluído** — ele volta para fila com backoff (5 min, 15 min, 1h).
- Após 3 tentativas, marca como `falha_andamentos` e fica visível no painel para reprocessamento manual com 1 clique.
- Worker chamado por **Cron Job a cada minuto** (extensão `pg_cron` do Supabase) — independe de o usuário estar logado.

---

### Plano de execução (técnico, podem pular se quiser)

#### Migrations
- `processo_import_lotes` (id, tenant_id, oab_id, criado_por, total_linhas, status, criado_em)
- `processo_import_jobs` (id, lote_id, tenant_id, linha_planilha, numero_cnj, dados_planilha jsonb, status, tentativas_processo int, tentativas_andamentos int, processo_id, erro_mensagem, proximo_retry_em, atualizado_em)
- RLS por tenant_id; pg_cron schedule a cada 1 min chamando edge function worker.

#### Edge functions
- `processo-import-worker` (cron) — pega N jobs prontos (`status IN ('pendente','aguardando_andamentos')` AND `proximo_retry_em <= now()`), processa em paralelo limitado (5 por vez) respeitando rate limit da Judit.
- `processo-import-validar-planilha` — recebe o arquivo, valida CNJs, checa duplicados no tenant, devolve preview JSON sem persistir nada.
- `processo-import-criar-lote` — recebe linhas confirmadas, cria lote + N jobs.
- `processo-import-reprocessar` — reseta tentativas de jobs em `falha_*` selecionados.

#### Frontend
- `src/components/Controladoria/ImportarPlanilhaWizard.tsx` — 3 passos.
- `src/components/Controladoria/ImportLoteCard.tsx` — card de progresso.
- `src/components/Controladoria/ImportacoesTab.tsx` — listagem de lotes + drill-down em jobs.
- `src/hooks/useImportLotes.ts` — query + realtime.
- `src/utils/parseProcessoExcel.ts` — usa `xlsx` (SheetJS) para ler .xlsx/.csv no browser.

#### Modelo de planilha (colunas reconhecidas)
Obrigatórias: `CNJ` (ou `Numero do Processo`).
Opcionais: `Parte Ativa`, `Parte Passiva`, `Cliente`, `Tribunal`, `Comarca`, `Tipo de Ação`, `Etiquetas` (separadas por `;`), `Observações`.

Os campos opcionais são **mesclados** com os dados que a Judit retorna — se a Judit trouxer parte ativa, prevalece a da Judit; se não trouxer, usa o da planilha. Isso resolve casos de processos em sigilo.

---

### Por que isso resolve o "bug sem andamentos"

| Problema atual | Como o novo fluxo resolve |
|----------------|---------------------------|
| Loop no front para se fechar a aba | Worker no servidor via cron |
| Timeout da Judit deixa processo vazio | Etapa B com retry 3x e backoff |
| Sem visibilidade do que falhou | Painel mostra job-a-job com motivo |
| Sem como reprocessar | Botão "Reprocessar falhas" |
| Sem duplicar checagem antes | Preview valida duplicados no tenant |
| Sem auditoria | Lotes ficam registrados com `criado_por` e timestamp |

---

### Alternativas que descartei

- **CSV puro sem wizard**: rápido de implementar mas perde a etapa de preview/edição, que é onde você corrige CNJs digitados errado.
- **Importação direta sem fila persistente**: continua dependendo do navegador, mesmo problema de hoje.
- **Webhook da Judit em vez de polling**: a Judit já manda webhook de andamentos, mas para a *primeira carga* o pull explícito é mais confiável — webhook fica para o monitoramento contínuo (que já existe).

---

### Entrega

- Wizard funcional com modelo `.xlsx` baixável.
- Painel de acompanhamento em tempo real.
- Fila resiliente com retry garantindo que processo só é marcado "OK" após andamentos chegarem.
- Botão de reprocessar falhas com 1 clique.

Aprova para eu implementar?