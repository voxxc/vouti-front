## Causa raiz

O fluxo `escavador-importar-processo` foi escrito para o caminho "Processos" (tabela `processos`), mas é chamado pelo `ImportarProcessoCNJDialog` no contexto OAB. Resultado:

1. **Capa parcial** — a função grava em `processos_oab.capa_completa`, mas o reparse só lê `escavador_data` da tabela `processo_monitoramento_escavador` (vinculada por `processos.id`, não por `processos_oab.id`). Se o monitoramento foi criado num import anterior com payload incompleto (ex.: `fontes` vazio), o reparse só repete o cache pobre.
2. **Andamentos sumidos** — a função insere movimentações em `processo_atualizacoes_escavador`, mas a aba "Andamentos" do OAB (`useAndamentosOAB`) lê `processos_oab_andamentos`. As movs ficam órfãs.
3. **Reparse não traz andamentos** — `reparseSomente: true` retorna em `andamentosInseridos: 0` porque não chama a API de movimentações nem replica do cache.

## Correção

### A) Tornar a edge function consciente do contexto OAB

Em `supabase/functions/escavador-importar-processo/index.ts`:

1. **Localizar o(s) `processos_oab`** correspondentes a `numero_cnj` + `tenant_id` no início (uma vez).
2. **Após upsert em `processo_monitoramento_escavador`**, também fazer upsert em `processo_oab_monitoramento_escavador` (escavador_id, escavador_data, monitoramento_ativo, ultima_consulta) por `processo_oab_id`.
3. **Persistir movs no cache** — salvar o array bruto de movimentações dentro de `escavador_data._movimentacoes_cache` no upsert (tanto OAB quanto padrão), para que o reparse possa replicá-las sem nova cobrança.
4. **Espelhar movs em `processos_oab_andamentos`** para cada OAB encontrado, usando o mesmo `dedup_hash` do webhook (`esc_<hash>` baseado em `processo_oab_id|descricao|data`). Schema:
   - `processo_oab_id`, `tenant_id`, `data_movimentacao`, `tipo_movimentacao`, `descricao`, `dados_completos: { ...mov, _origem: 'escavador' }`, `lida: false`, `dedup_hash`.
   - Atualizar `processo_oab_monitoramento_escavador.total_atualizacoes` e `ultima_atualizacao`.
5. **Modo `reparseSomente`**:
   - Repopula a capa em `processos`/`processos_oab` (já faz).
   - Se `escavador_data._movimentacoes_cache` existir, **reinsere** as movs em ambas as tabelas (idempotente via `dedup_hash` e dedup por `data_evento|descricao`).
   - Retornar `andamentosInseridos` real e `temCacheMovs: boolean`.

### B) Botão "Reprocessar resumo" mais útil

Em `src/components/Controladoria/ProcessoOABDetalhes.tsx`:

1. Após reparse bem-sucedido, mostrar `andamentosInseridos` no toast.
2. Se a resposta vier com `temCacheMovs: false`, mostrar toast secundário avisando "Cache não contém movimentações — use 'Atualizar andamentos' para buscar no tribunal (consulta paga)".
3. Refetch também de `andamentos` via `fetchAndamentos()` do hook após reparse.

### C) Recuperação do caso atual do usuário

O processo já importado provavelmente tem `escavador_data` sem o cache de movs (campo novo). Para esse caso pontual, oferecer no mesmo botão um menu com 2 opções:

- **Reprocessar do cache** (grátis) — usa `reparseSomente: true`.
- **Reimportar tudo** (com cobrança) — chama sem `reparseSomente`, agora já com a lógica OAB corrigida, populando capa + andamentos corretamente.

## Arquivos afetados

- `supabase/functions/escavador-importar-processo/index.ts` — lógica OAB, cache de movs, reparse com replay.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — toast detalhado, refetch andamentos, menu com 2 opções no botão de reparse.

Sem migrations, sem mudança de RLS (campos já existem; o cache vai dentro do JSONB `escavador_data`).

## Impacto

1. **Para o usuário final (UX, telas, fluxos):**
   - Aba "Resumo" passa a refletir a capa completa após o import inicial (parte ativa/passiva, juízo, fase, valor da causa, tribunal).
   - Aba "Andamentos" do OAB passa a mostrar movs vindas do Escavador no fluxo de import (antes só vinham via webhook).
   - Botão "Reprocessar resumo" agora oferece 2 ações claras (cache grátis / reimport pago) e informa quantos andamentos foram reinseridos.

2. **Para os dados:**
   - `processo_oab_monitoramento_escavador` passa a ter linhas para todo OAB importado pela edge function (antes só via webhook).
   - `processos_oab_andamentos` recebe registros com `dedup_hash` `esc_*`, idempotentes com o webhook (sem duplicar).
   - `escavador_data` (JSONB) cresce com `_movimentacoes_cache` (~até 500 movs). Sem migration nem alteração de schema.
   - Sem alteração em RLS, grants, ou índices.

3. **Riscos colaterais:**
   - O `dedup_hash` precisa ser idêntico ao do webhook para evitar duplicação. Vou reaproveitar a mesma fórmula.
   - Se o mesmo CNJ existir em múltiplos `processos_oab` do tenant (apartados), todos recebem espelho — comportamento desejado, mas vale validar com o usuário. Caso queira só o "principal", filtrar por `apartado = false` ou pelo OAB que originou o import.
   - Cache JSON cresce; processos com >500 movs já têm corte (`MAX_MOVS = 500`).

4. **Quem é afetado:**
   - Apenas usuários do módulo Controladoria/OAB que usam o import via Escavador. Sem impacto em CRM, agenda, financeiro, ou outros tenants que usem Judit.

## Validação

1. Reabrir o caso atual → clicar "Reprocessar resumo" → escolher "Reimportar tudo" → conferir que capa preenche e andamentos aparecem.
2. Conferir nos logs da edge function `[Escavador Importar V2] espelhando N movs em processos_oab_andamentos`.
3. Disparar webhook manualmente (ou aguardar) e confirmar que não duplica (mesmo `dedup_hash`).
4. Em outro processo novo, importar pela primeira vez e validar que capa + andamentos aparecem sem precisar de reparse.