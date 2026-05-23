## Causa raiz

Hoje o flag `with_attachments: true` está nas Edge Functions corretas (`judit-ativar-monitoramento`, `judit-ativar-monitoramento-oab`, `judit-ativar-monitoramento-cnpj`). O cadastro de OAB (`judit-buscar-por-oab`) e a sincronização (`judit-sincronizar-oab`) não enviam esse flag — usam apenas `/requests` (snapshot pontual).

Porém, há um ponto cinzento: quando o usuário cadastra uma OAB e logo em seguida clica em "Ativar" num processo descoberto, o tracking nasce com anexos. Você quer reforçar que **nenhum fluxo automático de cadastro** dispare anexos — apenas a ação explícita "Ativar monitoramento" feita pelo usuário.

## Correção

1. **Auditoria das chamadas Judit** — varrer todas as Edge Functions e confirmar que `with_attachments: true` aparece **apenas** dentro de `judit-ativar-monitoramento*` e da função de migração em lote. Qualquer outro lugar (inclusive helpers de import inicial) será removido.
2. **Cadastro de OAB (`judit-buscar-por-oab`)** — confirmar que não há criação de tracking automático após o cadastro. Hoje não há, mas vou adicionar comentário explícito no topo do arquivo deixando claro que esse fluxo é "snapshot only, sem attachments".
3. **Sincronização periódica (`judit-sincronizar-oab`)** — mesma garantia: apenas `/requests` sem anexos.
4. **`judit-ativar-monitoramento-oab`** — manter `with_attachments: true` (é o ponto de entrada manual via botão "Ativar").
5. **Reset/Atualizar manual (`judit-resetar-processo`)** — checar se também envia anexos. Se não envia, deixar como está (é um snapshot puro, sem criar tracking).

## Arquivos afetados

- `supabase/functions/judit-buscar-por-oab/index.ts` — comentário de garantia, nenhum mudança funcional esperada.
- `supabase/functions/judit-sincronizar-oab/index.ts` — idem.
- `supabase/functions/judit-resetar-processo/index.ts` — verificar e remover `with_attachments` se existir.
- Demais funções de ativação manual permanecem com `with_attachments: true`.

## Impacto

- **Usuário final**: nada muda visualmente. Continua existindo o botão "Ativar monitoramento" como única forma de habilitar anexos.
- **Dados**: nenhum impacto em registros existentes. Não há migration nem alteração de RLS.
- **Custos/Judit**: garante que cadastros em massa de OAB não inflem o consumo de anexos na Judit — anexos só são contabilizados quando o usuário decide ativar o monitoramento de um caso específico.
- **Riscos colaterais**: nenhum. Auditoria de segurança — confirma o princípio "anexo é opt-in por monitoramento".
- **Quem é afetado**: todos os tenants, mas sem mudança comportamental observável; somente reforço de invariante.

## Validação

1. `rg "with_attachments" supabase/functions/` deve listar apenas as 3 funções `judit-ativar-monitoramento*` e `judit-migrar-trackings-attachments`.
2. Cadastrar uma OAB nova de teste no tenant Demorais e verificar nos logs da Judit que nenhum tracking foi criado automaticamente.
3. Ativar manualmente um processo da OAB recém-cadastrada e confirmar que o tracking nasce com `with_attachments: true` e o webhook recebe anexos.

## Pergunta antes de implementar

Você quer que eu inclua também o **fluxo de cadastro por CNPJ** (`judit-buscar-por-cnpj`, se existir) na mesma auditoria, ou só OAB por enquanto?
