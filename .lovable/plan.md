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
- Todos com datas de 2023-2026 que **já existiam**: cada data nova tem entre 3 e 13 cópias prévias no banco.

Conclusão: não há novidade real; é o mesmo histórico sendo replicado a cada callback.

## Correção (modo seguro — não apaga novidades)

### 1. Dedup robusto no webhook (prevenção)
Em `supabase/functions/judit-webhook-oab/index.ts` e `supabase/functions/reprocessar-andamentos-monitorados/index.ts`:
- Trocar a chave por `normalizeTimestamp(data) + "_" + md5(descricao_normalizada_completa)`.
- Normalizar descrição: lowercase, trim, colapsar whitespace, **ordenar alfabeticamente os blocos separados por `.`** antes de hashear — tolera reordenação da Judit.
- Manter `lida=false` apenas para o que de fato for inserido (que agora será só novidade real).

### 2. UNIQUE constraint (prevenção futura)
Migration:
- Adicionar coluna gerada `dedup_hash text` (md5 da descrição normalizada-ordenada).
- Criar `UNIQUE (processo_oab_id, data_movimentacao, dedup_hash)`.
- Webhook passa a usar `INSERT ... ON CONFLICT DO NOTHING`, então mesmo se o código falhar, o banco bloqueia duplicata.

### 3. Tratamento dos duplicados que já estão no banco (sem apagar nada)
Decisão importante: **não vou deletar andamentos existentes**. Em vez disso:

- Para cada grupo `(processo_oab_id, data_movimentacao, dedup_hash)` com mais de uma linha:
  - Mantenho **a mais antiga** (`MIN(created_at)`) como ela está (preserva `lida` original — se estava não lida, continua não lida).
  - As **cópias mais novas** ficam no banco, mas são marcadas `lida=true` (silencia o ruído sem perder dado).

Isso garante:
- Nada é apagado. Histórico continua íntegro.
- Se o andamento original ainda estava não lido, **continua aparecendo na aba Não Lidos** — você não perde nenhuma novidade real.
- Só some o ruído de cópias duplicadas que apareceram depois do original.

### 4. (Opcional) Limpeza futura por job
Se mais tarde você quiser de fato remover as cópias para liberar espaço, criamos um job manual separado. Não entra agora.

## Arquivos afetados

- `supabase/functions/judit-webhook-oab/index.ts` — nova `generateAndamentoKey` + `ON CONFLICT DO NOTHING`.
- `supabase/functions/reprocessar-andamentos-monitorados/index.ts` — mesma lógica.
- Nova migration:
  - coluna `dedup_hash`,
  - UPDATE silenciando cópias (`lida=true` só nas cópias mais novas de cada grupo),
  - UNIQUE constraint.

## Impacto

**Usuário final (UX, telas, fluxos)**
- Aba "Controladoria > Não Lidos" deixa de mostrar duplicatas. O contador cai para o número real de novidades pendentes.
- Andamentos verdadeiramente não lidos continuam aparecendo (a cópia original é preservada).
- Nenhuma novidade futura é perdida: o webhook continua inserindo o que for genuinamente novo.

**Dados (migrations, RLS, performance)**
- Coluna `dedup_hash` (~32 bytes/linha) + índice único na tabela `processos_oab_andamentos`.
- UPDATE em massa para silenciar cópias (apenas marca `lida=true`, sem DELETE).
- RLS inalterada.
- Leitura mais leve (menos linhas retornadas pela RPC de não lidos).

**Riscos colaterais**
- Se a Judit reformatar muito a descrição (não só reordenar blocos), o hash ainda pode divergir e gerar uma "cópia" — mas o pior caso é o de hoje, não pior.
- Como nada é deletado, zero risco de perda de histórico.
- UPDATE é grande, mas seguro: roda em transação e só toca cópias além da primeira.

**Quem é afetado**
- Todos os tenants com OABs monitoradas via Controladoria. Mais visível no Solvenza (alto volume).
- Sem efeito em CRM, Agenda, WhatsApp, Projetos, Financeiro.

## Validação

1. Após migration:
   ```sql
   SELECT count(*) FROM (
     SELECT processo_oab_id, data_movimentacao, dedup_hash, count(*)
     FROM processos_oab_andamentos GROUP BY 1,2,3 HAVING count(*) > 1
       AND bool_or(lida=false) AND bool_and(NOT lida)=false
   ) x;
   ```
   Esperado: 0 (cada grupo duplicado tem no máximo 1 cópia não lida — a original).
2. Conferir na aba "Não Lidos" da Controladoria que o total caiu e bate com a contagem real de novidades.
3. Forçar um reenvio da Judit (resetar um processo) e confirmar no log do webhook: `novosAndamentos=0`.
4. Aguardar próximo callback real da Judit com movimento novo → deve aparecer normalmente como não lido.
