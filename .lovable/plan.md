## Causa raiz

A função `escavador-importar-processo` consulta o V2 `GET /processos/numero_cnj/{cnj}` e aborta com erro quando recebe 404. Para o CNJ `5001038-07.2026.8.21.0093` (TJRS, distribuído em 2026), o processo simplesmente ainda não existe na base do Escavador — o V2 só responde quando o processo já foi coletado antes. Por isso o 404, mesmo sendo um CNJ válido.

Hoje, ao receber 404, retornamos "Não foi possível consultar o processo" e o usuário trava. Precisamos disparar a coleta no tribunal e, em seguida, ingerir o resultado.

## Correção

Adicionar fallback automático no 404 do V2:

1. Quando `capaResp.status === 404`, em vez de abortar, chamar `POST /api/v1/processos/{numero_cnj}/informacoes-no-tribunal` (modo assíncrono — gera callback no `escavador-webhook` quando termina). Esse endpoint força o Escavador a buscar o processo direto no tribunal.
2. Marcar o registro em `processos_oab` como "coleta solicitada" (campo `detalhes_carregados=false` + `ultima_atualizacao_detalhes=now`) e gravar um `processo_monitoramento_escavador` mínimo com `escavador_data: { status: 'coleta_solicitada', solicitado_em: now }` para preservar o vínculo.
3. Retornar `success: true` com mensagem clara: "Processo enviado para coleta nos tribunais. Em alguns minutos os andamentos aparecerão automaticamente." (sem citar Escavador).
4. Caso a chamada V1 também falhe (ex.: tribunal não suportado, 4xx do V1), aí sim retornar erro com mensagem amigável.
5. Garantir que o `escavador-webhook` (que já existe) trate o callback `item_tipo=busca_assincrona` e dispare uma reimportação automática chamando internamente a mesma função `escavador-importar-processo` em modo `rapido` quando a coleta concluir. Verificar se isso já existe; se não, adicionar o branch.

## Arquivos afetados

- `supabase/functions/escavador-importar-processo/index.ts` — adicionar fallback no 404 (chamada V1 + persistência mínima + resposta nova).
- `supabase/functions/escavador-webhook/index.ts` — confirmar/adicionar handler de `busca_assincrona` para reimportar quando o tribunal devolver os dados.
- Frontend (`ImportarProcessoCNJDialog.tsx` e similares) — não precisa mudar; já lida com `success: true`. Só ajustar o toast para mostrar a mensagem que vier no `message`.

## Impacto

- **Usuário final**: importações de processos novos (recém-distribuídos, ainda não indexados) deixam de falhar com erro 404. Em vez disso, o sistema avisa que a coleta foi disparada e os andamentos chegam minutos depois via webhook, sem nova ação do usuário.
- **Dados**: cria registro em `processo_monitoramento_escavador` desde o disparo (com flag `status=coleta_solicitada`), preservando rastreabilidade. Nenhuma migration nova.
- **Riscos colaterais**: cada disparo V1 consome créditos do Escavador (busca no tribunal é mais cara). Para mitigar, só acionamos o V1 quando o V2 retorna 404 — nunca em paralelo. Se o webhook não chegar (ex.: callback desconfigurado), o registro fica em `coleta_solicitada` indefinidamente — mitigado pelo botão de re-importar já existente.
- **Afetados**: qualquer usuário importando CNJs novos (especialmente 2025/2026). A Izabelita e quem usa Solvenza serão os principais beneficiados.

## Validação

1. Reimportar `5001038-07.2026.8.21.0093` e confirmar resposta `success: true` com mensagem de coleta solicitada (não 404).
2. Verificar nos logs `escavador-importar-processo` o ramo "fallback V1 disparado".
3. Após alguns minutos, conferir se o `escavador-webhook` recebeu o callback e se os andamentos apareceram no drawer do processo.
4. Reimportar um CNJ que já existe no V2 para garantir que o fluxo normal continua funcionando.
