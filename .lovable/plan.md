## Causa raiz

A função foi até o Escavador (cobrou crédito) mas voltou com `classe`, `tribunal` e movimentações **vazios**. Isso porque estamos usando os endpoints **V1** (`/api/v1/busca` + `/api/v1/processos/{id}`), que retornam apenas metadados básicos do índice de busca. Os dados ricos (capa estruturada + andamentos) só vêm na **API V2**:

- `GET /api/v2/processos/numero_cnj/{cnj}` → capa completa (classe, assunto, tribunal, fontes, polos, valor causa, datas).
- `GET /api/v2/processos/numero_cnj/{cnj}/movimentacoes` → andamentos paginados por cursor.

Log da última execução comprova: `id: 6156439, classe: undefined, tribunal: undefined, totalMovimentacoes: 0` — ou seja, V1 entregou só o id.

## Correção

Reescrever `escavador-importar-processo` para usar V2:

1. Remover busca em `/api/v1/busca` e `/api/v1/processos/{id}`.
2. Chamar `GET /api/v2/processos/numero_cnj/{cnj}` (1 requisição → capa completa).
3. Chamar `GET /api/v2/processos/numero_cnj/{cnj}/movimentacoes?limit=100` e seguir `links.next` até esgotar (ou cap em 500 movimentações para evitar timeout em processos antigos).
4. Mapear V2 → schema atual:
   - `classe.nome` → `processo_monitoramento_escavador.classe` e `processos.tipo_acao_nome`
   - `assunto.nome` (ou primeiro de `assuntos[]`) → `assunto`
   - `tribunal.sigla` ou `tribunal.nome` → `tribunal` / `processos.tribunal_nome`
   - `valor_causa.valor` → `valor_causa`
   - `data_inicio` → `data_distribuicao`
   - `area.nome` → `area`
5. Para cada movimentação V2 (`{ data, tipo, conteudo, fonte, classificacao }`), inserir em `processo_atualizacoes_escavador`:
   - `descricao` = `conteudo` (fallback: `tipo`)
   - `data_evento` = `data`
   - `dados_completos` = objeto inteiro
   - `tipo_atualizacao` = `'importacao_inicial'`
6. Preservar idempotência: deduplicar movimentações por hash (`data + conteudo`) antes de inserir, para o caso de o usuário re-importar.
7. Logar `Creditos-Utilizados` (header da resposta V2) para rastreabilidade do custo.

## Arquivos afetados

- `supabase/functions/escavador-importar-processo/index.ts` — reescrita completa do fluxo de fetch e parsing.

Sem mudanças em frontend, banco, RLS ou tipos.

## Impacto

- **Usuário final (UX):** após importar, a capa do processo passa a aparecer preenchida (classe, tribunal, valor, data) e a aba de andamentos mostra a lista real de movimentações vindas do Escavador. Toast continua mostrando a contagem correta.
- **Dados:** mais linhas reais em `processo_atualizacoes_escavador` (uma por movimentação V2). `processo_monitoramento_escavador.escavador_data` passa a guardar o JSON V2 (mais rico). Sem migrations, sem mudança de RLS.
- **Riscos colaterais:**
  - V2 cobra por chamada; cada importação consome ~2 requisições (capa + 1ª página de movimentações). Processos com muita movimentação podem fazer 2-5 chamadas extras pela paginação. Cap de 500 movs evita custo descontrolado.
  - V2 às vezes retorna *cache* — se o usuário precisar de dados frescos, há `POST /api/v2/processos/numero_cnj/{cnj}/solicitar-atualizacao` (não incluído neste plano; pode ser adicionado depois como botão "Atualizar agora").
  - Rate limit global de 500 req/min; dentro do esperado.
- **Quem é afetado:** apenas usuários do tenant atual ao importar processos via `ImportarProcessoDialog` ou `ImportarProcessoCNJDialog`. Demais fluxos (Judit, OAB) seguem intactos.

## Validação

1. Importar de novo o mesmo CNJ (`0123417-95.2025.8.16.0000`) com checkbox desmarcado.
2. Conferir logs da função: deve aparecer `classe: <nome>`, `tribunal: TJPR`, `Movs: N (>0)`.
3. Abrir o processo no Vouti → capa deve mostrar classe, tribunal, valor.
4. Aba de andamentos → lista de movimentações com data e descrição.
5. Conferir `processo_atualizacoes_escavador` via `read_query`: rows com `data_evento` e `descricao` populados.
6. Reimportar (caso exista trigger manual) → não duplicar andamentos.
