## Causa raiz

A edge function `escavador-importar-processo` foi criada em `supabase/functions/escavador-importar-processo/index.ts`, mas **não foi registrada em `supabase/config.toml`**. Sem essa entrada, a função não é deployada — por isso não há logs nem efeito ao clicar em "Importar". A chamada `supabase.functions.invoke('escavador-importar-processo', ...)` provavelmente retorna 404, mas como ela roda em background `.then(...)`, o erro só aparece no toast de "Andamentos não carregados" (ou nem chega a aparecer claramente).

Além disso, vale revisar o payload que enviamos ao Escavador: o endpoint `GET /api/v1/busca?qo=processos` retorna apenas a *capa* básica do processo — para obter as **movimentações** geralmente é preciso uma segunda chamada em `GET /api/v1/processos/{id}` ou `GET /api/v1/processo-tribunal/{numero}`. Hoje o código lê `processoEncontrado.movimentacoes`, que normalmente vem vazio nesse endpoint, então mesmo se a função rodasse, salvaria 0 andamentos.

## Correção

1. **Registrar a função em `supabase/config.toml`**:
   ```
   [functions.escavador-importar-processo]
   verify_jwt = true
   ```
   Isso dispara o deploy automático.

2. **Ajustar a edge function `escavador-importar-processo/index.ts`** para de fato trazer andamentos:
   - Após `GET /api/v1/busca` obter o `processoEncontrado.id`, chamar `GET /api/v1/processos/{id}` para pegar a capa completa + movimentações.
   - Se o Escavador retornar movimentações paginadas, ler ao menos a primeira página (limit=100).
   - Manter o upsert em `processo_monitoramento_escavador` com os dados da capa.
   - Inserir as movimentações em `processo_atualizacoes_escavador` com `tipo_atualizacao = 'importacao_inicial'`.
   - Logar `andamentosInseridos` claramente.

3. **Melhorar feedback no `ImportarProcessoDialog.tsx`**:
   - No `.then`, se `error` (rede/404) for não-nulo, mostrar mensagem específica (`error.message`) em vez do toast genérico.
   - Manter o resto do fluxo intacto.

## Arquivos afetados

- `supabase/config.toml` — adicionar bloco da nova função
- `supabase/functions/escavador-importar-processo/index.ts` — segunda chamada para `/processos/{id}` e tratamento de movimentações
- `src/components/Controladoria/ImportarProcessoDialog.tsx` — toast de erro mais claro

## Impacto

- **Usuário final (UX):** importação de processo passará a efetivamente carregar capa + andamentos via Escavador. O toast "📋 Andamentos carregados" mostrará a contagem real (>0). Se algo falhar, o usuário vê o motivo.
- **Dados:** registros em `processo_monitoramento_escavador` (1 por processo) e `processo_atualizacoes_escavador` (N andamentos). Sem migrations, sem mudanças de RLS.
- **Riscos colaterais:** cada importação consome 1 chamada ao endpoint de busca + 1 ao de processo no Escavador (≈ R$ 0,10 a R$ 0,20 por processo, conforme tabela). Sem monitoramento ativo (default), não há custo recorrente.
- **Quem é afetado:** apenas usuários do tenant atual que importam processos pela tela `Controladoria > Importar Processo`. Outros fluxos (Judit, OAB, drawer) seguem intactos.

## Validação

1. Após deploy, abrir Controladoria → Importar Processo → CNJ válido com checkbox desmarcado.
2. Conferir toast "📋 Andamentos carregados: N andamentos registrados".
3. Verificar logs da função no Supabase: deve mostrar "Processo encontrado" e "N movimentações salvas".
4. Conferir tabela `processo_atualizacoes_escavador` com novos rows (`tipo_atualizacao = 'importacao_inicial'`).
5. Conferir `processo_monitoramento_escavador.monitoramento_ativo = false` (checkbox desmarcado).
6. Repetir com checkbox marcado → `monitoramento_ativo = true`.
