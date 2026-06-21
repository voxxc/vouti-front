# Importar processo no Escavador trazendo movimentações na mesma operação

## Causa raiz
A edge `escavador-importar-processo` chama hoje só `GET /api/v2/processos/numero_cnj/{cnj}` (capa). Esse endpoint **não retorna o array de movimentações** — só o contador `quantidade_movimentacoes`. Para popular `processos_oab_andamentos` é preciso uma segunda chamada (`GET /api/v2/processos/{cnj}/movimentacoes`), que hoje só roda no fluxo "Reimportar tudo" pós-importação.

## Correção

### 1. Encadear capa + movimentações na própria importação
Dentro de `supabase/functions/escavador-importar-processo/index.ts`, após gravar a capa, disparar a chamada de movimentações na mesma execução:

```ts
// 1) GET capa  → grava processo_oab + processo_oab_monitoramento_escavador
// 2) GET /api/v2/processos/{cnj}/movimentacoes?limit=100
//    → guarda array em escavador_data._movimentacoes_cache
//    → espelha (upsert por external_id) em processos_oab_andamentos
```

Detalhes:
- **Limite:** `limit=100` na 1ª página cobre 95% dos processos (mediana ~30 mov.). Se `meta.has_next` e o usuário pediu modo completo, paginar até teto (ex.: 500). Para "importação rápida", parar na 1ª página.
- **Idempotência:** upsert em `processos_oab_andamentos` por `(processo_oab_id, external_id)` — já existe constraint nesse formato (validar antes).
- **Tolerância a falha parcial:** se a 2ª chamada falhar (timeout, 402 saldo, 5xx), commit da capa permanece e marca `escavador_data._movimentacoes_status = 'pending'` para o usuário poder reprocessar sem reimportar a capa.
- **Logs:** registrar em `auditoria_andamentos` quantidade inserida/atualizada.

### 2. Flag opcional de modo
Aceitar `body.modo: 'rapido' | 'completo'`:
- `rapido` (default da UI de importação): só capa + 1 página de movimentações.
- `completo`: capa + paginação até esgotar (ou 500). Reusado pelo botão "Reimportar tudo".

Isso mantém um único caminho para os dois fluxos e evita duplicação de código.

### 3. UI de importação
Em `ProcessoOABDetalhes.tsx` (e nas telas de busca OAB que disparam importação), adicionar toast com contagem: "Capa + 18 andamentos importados".

## Arquivos afetados
- `supabase/functions/escavador-importar-processo/index.ts` — encadear chamada de movimentações, parsear, gravar, suportar `modo`.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — passar `modo: 'completo'` no botão "Reimportar tudo"; ajustar mensagem de sucesso.
- (Eventual) hook que dispara importação na busca OAB — passar `modo: 'rapido'` explicitamente.
- Sem migrations: tabelas `processo_oab_monitoramento_escavador` e `processos_oab_andamentos` já existem com as colunas necessárias.

## Impacto
1. **UX:** Ao importar um processo via OAB, o usuário já vê na ficha capa + andamentos preenchidos sem precisar clicar em "Reimportar tudo". Reduz uma etapa manual.
2. **Dados:** Cada importação passa a fazer 2 requisições ao Escavador (capa ~R$ 0,05 + movimentações ~R$ 0,05–0,10) em vez de 1. Tabela `processos_oab_andamentos` cresce no momento da importação. Sem mudança de schema, RLS ou índice.
3. **Riscos colaterais:**
   - **Custo Escavador dobra por importação** — todo processo importado, mesmo que o usuário só queira a capa, vai consumir movimentações. Mitigação: o modo `rapido` limita a 1 página.
   - Importação fica ~1–2 s mais lenta (chamada extra).
   - Se houver importação em massa (lote), o consumo escala linearmente — sugiro um aviso de saldo antes de lotes grandes.
4. **Quem é afetado:** Todos os tenants que importam processos via OAB (Controladoria/Busca OAB). Admin e advogado veem o mesmo comportamento. Processos já importados antes da mudança continuam sem movimentações até clicarem em "Reimportar tudo".

## Validação
- Importar um processo novo via Busca OAB → ficha abre com Resumo + Andamentos preenchidos em uma única ação.
- Conferir no painel Escavador 2 cobranças seguidas (capa + movimentações).
- Reimportar o mesmo processo → não duplica linhas em `processos_oab_andamentos` (upsert por external_id).
- Simular falha na chamada de movimentações (token inválido) → capa fica gravada, `_movimentacoes_status='pending'`, botão "Reprocessar" funciona.
- Para o caso atual (`0123417-95.2025.8.16.0000`): rodar em modo `completo` traz os 18 andamentos.

## Decisões abertas
1. Modo default da importação: **`rapido` (1 página, ~100 mov.)** ou **`completo` (até 500)**? Recomendo `rapido` para conter custo.
2. Importação em lote (múltiplas OABs/CNJs): também buscar movimentações ou só capa, com botão "Buscar andamentos" depois?
