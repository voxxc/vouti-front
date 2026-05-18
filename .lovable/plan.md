# Andamentos OAB duplicados gerando "Não lidos" sem sincronização

## Causa raiz

O webhook `judit-webhook-oab` está **reinserindo andamentos antigos como novos** sempre que a Judit reenvia os dados do processo (callback automático do tracking, sem ação do usuário). Cada reinserção entra com `lida=false`, inflando a aba "Não Lidos" na Controladoria.

O motivo é a função de dedup `generateAndamentoKey`:

```ts
key = normalizeTimestamp(data) + "_" + descricao.substring(0,100).toLowerCase().trim()
```

Falhas:
1. **Descrição truncada a 100 chars**: a Judit concatena vários trechos (`"DISPONIBILIZADO NO DJ..."` + `"PUBLICADO INTIMAÇÃO..."` + `"EXPEDIÇÃO DE OUTROS..."`) em ordem variável. Quando a ordem dos blocos muda no payload, os primeiros 100 chars mudam → key diferente → insere de novo.
2. **Sem UNIQUE constraint no banco**: nada impede a duplicação física, mesmo que o dedup do código falhe.

### Evidência

Processo `7002603-26.2023.8.22.0003` (tenant Solvenza):
- Tinha 546 andamentos antes.
- Em 18/05 às 00:53, foram inseridos +21 andamentos com `lida=false`.
- Todos com datas de 2023-2026 que **já existiam**: cada data nova tem entre 3 e 13 duplicatas anteriores no banco.

Conclusão: não há novidade real; é o mesmo histórico sendo replicado a cada callback.

## Correção

### 1. Dedup robusto no webhook
Em `supabase/functions/judit-webhook-oab/index.ts` (e mesma função em `reprocessar-andamentos-monitorados/index.ts`):
- Trocar a chave por `normalizeTimestamp(data) + "_" + sha256(descricao_normalizada_completa)`.
- Normalizar descrição: lowercase, trim, colapsar whitespace, **ordenar alfabeticamente os "blocos"** (split por `.`) antes de hashear, para tolerar reordenação da Judit.

### 2. UNIQUE constraint + limpeza
Migration:
- Adicionar coluna gerada `dedup_hash` (md5 da descrição normalizada-ordenada).
- Deduplicar registros existentes mantendo o mais antigo (`MIN(created_at)`) e preservando `lida=true` quando qualquer cópia já estava lida.
- Criar `UNIQUE (processo_oab_id, data_movimentacao, dedup_hash)`.
- Webhook passa a usar `upsert` com `onConflict` (ou `INSERT ... ON CONFLICT DO NOTHING`).

### 3. Marcar como lidos os duplicados criados pelo bug
Para o tenant afetado (ou globalmente, conforme escolha): UPDATE em andamentos cuja data_movimentacao tenha duplicata mais antiga já existente, setando `lida=true`. Não apaga histórico, só zera o ruído na aba.

## Arquivos afetados

- `supabase/functions/judit-webhook-oab/index.ts` — nova `generateAndamentoKey` + insert com `ON CONFLICT DO NOTHING`.
- `supabase/functions/reprocessar-andamentos-monitorados/index.ts` — mesma mudança.
- Nova migration: coluna `dedup_hash`, dedupe de existentes, UNIQUE constraint.
- (Opcional) script de UPDATE para marcar duplicatas atuais como lidas.

## Impacto

**Usuário final (UX, telas, fluxos)**
- Aba "Controladoria > Não Lidos" volta a refletir apenas movimentações realmente novas.
- Contadores de não lidos no badge global, OABTab e CentralAndamentosNaoLidos caem para os números reais (estimativa: redução drástica para tenants com tracking ativo há meses).
- Nenhuma mudança em telas ou fluxos; só corrige o ruído.

**Dados (migrations, RLS, performance)**
- Migration cria coluna `dedup_hash` (md5, ~32 bytes) + índice único. Tabela `processos_oab_andamentos` ganha overhead pequeno por linha.
- Dedupe de existentes é DELETE em massa (potencialmente milhares de linhas no Solvenza). Roda uma vez, em janela controlada.
- RLS inalterada.
- Performance de leitura melhora (menos linhas + índice).

**Riscos colaterais**
- Se a Judit eventualmente reformatar muito a descrição (não só reordenar blocos), o novo hash ainda pode divergir → ainda melhor que hoje, mas dedup nunca é 100%.
- O DELETE de duplicatas é destrutivo; precisa de backup/transação. Vou colocar dentro de uma transação com `SELECT count(*)` antes/depois logado para auditoria.
- Marcar duplicatas antigas como lidas perde a chance do usuário rever um andamento que já chegou — mas como é cópia idêntica do que ele já viu, é benigno.

**Quem é afetado**
- Todos os tenants que usam OABs monitoradas (Controladoria). Mais visível em tenants com volume alto e tempo longo de tracking (ex.: Solvenza).
- Nenhum impacto em CRM, Agenda, WhatsApp ou Projetos.

## Validação

1. Após migration, rodar:
   ```sql
   SELECT processo_oab_id, count(*), count(DISTINCT (data_movimentacao, dedup_hash))
   FROM processos_oab_andamentos GROUP BY 1 HAVING count(*) <> count(DISTINCT (data_movimentacao, dedup_hash));
   ```
   Esperado: 0 linhas (sem duplicatas remanescentes).
2. Forçar um reenvio da Judit (resetar processo) e confirmar que `novosAndamentos=0` no log do webhook.
3. Conferir na aba "Não Lidos" da Controladoria que o total caiu para o esperado e que não cresce sem novas movimentações reais.
