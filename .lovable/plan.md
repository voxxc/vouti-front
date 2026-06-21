## Causa raiz

- O Escavador V2 retorna a capa aninhada em `proc.fontes[0].capa.*` (classe, assunto, area, valor_causa, data_distribuicao, orgao_julgador), com `proc.classe` etc. ficando `null` no nível raiz.
- A edge function `escavador-importar-processo` lê só `proc.classe`, `proc.assunto`, `proc.area`, `proc.tribunal`, `proc.valor_causa`, `proc.data_distribuicao`, então grava `NULL` em `processo_monitoramento_escavador` mesmo recebendo dados completos.
- A função também não atualiza `processos_oab` nem extrai `envolvidos` (partes/advogados) do payload, então a aba OAB segue mostrando o resumo vazio.

## Correção

1. Atualizar `escavador-importar-processo` para escolher a melhor `fonte` e ler a capa de lá:
   - Selecionar `melhorFonte = proc.fontes` priorizando: maior `grau`, presença de `capa`, `arquivado != true`, `instancias`/`audiencias`. Fallback: `fontes[0]`.
   - Resolver capa via fallback em cadeia: `proc.<campo> ?? melhorFonte?.capa?.<campo> ?? melhorFonte?.<campo>`.
   - Campos: `classe`, `assunto` (string completa), `area`, `tribunal` (de `melhorFonte.tribunal` ou `melhorFonte.sigla`), `valor_causa.valor`, `data_distribuicao`, `orgao_julgador` (= juizo), `situacao`/`fase`.
   - Extrair `parte_ativa`/`parte_passiva` de `melhorFonte.envolvidos` (`polo === 'ATIVO'` / `'PASSIVO'`), juntando nomes; salvar `partes_completas` (jsonb) com array bruto.
   - Extrair `advogados_partes` agrupando advogados de cada envolvido.
   - Aceitar tanto `proc.fontes` quanto `capa.fontes` (ambos os formatos).

2. Persistir capa em três tabelas, sem regredir dado existente:
   - `processo_monitoramento_escavador` (já é feito, mas com novos campos preenchidos).
   - `processos`: além de `tipo_acao_nome`, `tribunal_nome`, `valor_causa`, `data_distribuicao`, gravar `juizo`, `fase_processual`, `parte_ativa`, `parte_passiva`, `advogados_partes` quando vierem e os atuais estiverem vazios.
   - `processos_oab` (a tabela exibida na aba): atualizar via `numero_cnj = numeroProcesso AND tenant_id = tenantId` com `tribunal`, `tribunal_sigla`, `parte_ativa`, `parte_passiva`, `partes_completas`, `data_distribuicao`, `valor_causa`, `juizo`, `fase_processual`, `capa_completa` (objeto com a capa estruturada), `detalhes_carregados = true`, `ultima_atualizacao_detalhes = now()`. Sem `oab_id` no filtro porque a função não recebe esse parâmetro; o par `numero_cnj + tenant_id` é suficiente para o caso atual (1 OAB por tenant para esse CNJ); se houver múltiplas linhas, atualiza todas.

3. Resposta da função:
   - Incluir `capa` expandida (`classe`, `assunto`, `area`, `tribunal`, `tribunal_sigla`, `valor_causa`, `data_distribuicao`, `juizo`, `fase_processual`, `parte_ativa`, `parte_passiva`).
   - Manter `andamentosInseridos`, `creditosUtilizados`, `monitoramentoAtivado`.

4. `ImportarProcessoCNJDialog.tsx` (frontend): após sucesso, parar de fazer um `update` redundante; a edge function já atualiza `processos_oab`. Manter apenas `onSuccess()` para refetch.

5. Reprocessar o `0123417-95.2025.8.16.0000` sem nova cobrança:
   - Os dados já estão em `processo_monitoramento_escavador.escavador_data`. Criar um trecho no início da função que, se `proc` vier de cache (não vamos refazer fetch), refaça só o parse + persist. Estratégia mais simples: adicionar um modo `reparseSomente: true` que pula o fetch e usa o `escavador_data` existente. Útil para esse caso e para reprocessamentos futuros.
   - Disparar manualmente esse modo para o processo afetado, sem custo de API.

## Arquivos afetados

- `supabase/functions/escavador-importar-processo/index.ts` — extração da capa via `fontes`, partes, atualização de `processos_oab` e `processos`, modo `reparseSomente`.
- `src/components/Controladoria/ImportarProcessoCNJDialog.tsx` — remover `update` pós-import redundante e usar capa da resposta apenas para toast.
- Banco: sem migration, apenas reprocessamento pontual via edge function.

## Impacto

1. Usuário final
   - Resumo do processo na aba OAB passa a mostrar partes, advogados, classe, assunto, valor da causa, juízo e tribunal.
   - Funciona retroativamente para o `0123417-95...` via reparse, sem nova cobrança.
   - Próximos imports já preenchem tudo direto.

2. Dados
   - `processo_monitoramento_escavador`, `processos` e `processos_oab` ficam consistentes.
   - Sem migration, sem mudança de RLS, sem schema novo.
   - O `escavador_data` segue sendo a fonte de verdade bruta.

3. Riscos colaterais
   - Se a capa vier diferente em outros tribunais, o fallback em cadeia evita sobrescrever com `null`.
   - O update em `processos_oab` por `numero_cnj + tenant_id` pode atualizar múltiplas linhas (mais de uma OAB no mesmo tenant com mesmo CNJ); aceitável e desejado.
   - Reprocessamento idempotente: andamentos já existentes são deduplicados pela chave `data_evento|descricao` que já está implementada.

4. Quem é afetado
   - Todos os tenants que usam o import por CNJ via Escavador.
   - Admin/controladoria/advogado que abre o processo na aba OAB.

## Validação

- Reparse do `0123417-95.2025.8.16.0000` (sem custo) e conferir:
  - `processo_monitoramento_escavador`: `classe`, `assunto`, `area`, `tribunal`, `data_distribuicao`, `valor_causa` preenchidos.
  - `processos_oab`: `parte_ativa`, `parte_passiva`, `tribunal`, `valor_causa`, `data_distribuicao`, `juizo`, `detalhes_carregados=true`.
  - `processos`: `tipo_acao_nome`, `tribunal_nome`, `valor_causa`, `data_distribuicao`, `parte_ativa`, `parte_passiva` preenchidos.
- Importar um CNJ novo e confirmar que tudo é preenchido na primeira chamada.
- Reimportar o mesmo CNJ e confirmar que não duplica andamentos nem regride campos populados.
