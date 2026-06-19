# Estudo da API Escavador — preparação para futura migração da Judit

## Objetivo
Você não quer alterar nada agora. Quer que eu estude a documentação da Escavador e deixe o conhecimento salvo para uso futuro, com foco em **monitoramento de processos** (caso de uso que hoje é coberto pela Judit no projeto).

## O que vou fazer (sem mexer em código de produto)

### 1. Coletar a documentação completa
A página `https://api.escavador.com/v2/docs/` é uma SPA — o HTML estático só traz a introdução. Para extrair os endpoints, vou usar três fontes que funcionam sem JS:
- **README e código-fonte do SDK Python oficial** (`github.com/Escavador/escavador-python`) — enumera todos os módulos e métodos da V1 e V2.
- **Páginas individuais de cada módulo** da V1 (`/v1/docs/processos`, `/v1/docs/monitoramento-no-site-do-tribunal`, `/v1/docs/callback`, etc.) renderizadas via screenshot quando o markdown estático falhar.
- **Subpáginas conhecidas da V2** (`/v2/docs/consulta-de-processos`, `/v2/docs/tribunais`).

### 2. Salvar como referência permanente
Vou criar um arquivo único em `mem://integrations/escavador-api` (memória do projeto, sempre disponível em sessões futuras) cobrindo:

**Fundamentos** (já tenho)
- Endpoints base: V1 = `https://api.escavador.com/api/v1`, V2 = `https://api.escavador.com/api/v2`.
- Autenticação: PAT Bearer (`Authorization: Bearer <token>`), gerado no painel `api.escavador.com/tokens`, server-to-server only.
- Limite: 500 req/min global.
- Cobrança: header `Creditos-Utilizados` por requisição (em centavos).
- Paginação: numerada (`page`/`per_page`) ou cursor (`cursor`/`limit`), com bloco `meta` + `links`.
- Callbacks: configurados em `api.escavador.com/callbacks`, validados via token no header `Authorization`, devem ser idempotentes.
- SDK Python disponível; em Edge Functions usaríamos `fetch` direto.

**Módulos V1** (busca + monitoramento — coração da migração)
- `Busca` — busca textual de processos/pessoas/empresas.
- `Processo` — pesquisa síncrona e assíncrona no site do tribunal (`POST /processos/{cnj}/informacoes-no-tribunal`), retorna `id` para callback.
- `MonitoramentoTribunal` — criar/listar/remover monitoramento de um CNJ ou OAB num tribunal específico, com frequência (DIARIA/SEMANAL) e tipo (UNICO/POR_OAB).
- `MonitoramentoDiario` — monitoramento em Diários Oficiais (PROCESSO, NOME, OAB, VARIACAO).
- `Movimentacao` — listagem de movimentações por processo.
- `Tribunal` — `sistemas_disponiveis()` para descobrir cobertura.
- `Callback` — listagem/consulta em massa de callbacks recebidos.
- `DiarioOficial`, `Instituicao`, `Legislacao`, `Jurisprudencia`, `Pessoa`, `Saldo` — secundários para o caso de uso.

**Módulos V2** (dados estruturados ricos, sem monitoramento)
- `v2.Processo`:
  - `por_cnpj(cnpj)` / `por_cpf(cpf)` / `por_nome(nome)` → envolvido + lista paginada por cursor.
  - `por_oab(numero, estado, ordena_por, ordem)` → advogado + processos.
  - `por_numero(cnj)` → detalhes ricos (fontes, polos, valor, classe, assunto, tribunal, datas).
  - `movimentacoes(cnj)` → cursor-based.
- `v2.Tribunal` — referência de tribunais.

**Mapeamento Judit → Escavador** (rascunho conceitual, sem implementar)
| Função atual (Judit) | Equivalente Escavador |
|---|---|
| `judit-sync-*` (sync por CNJ) | V1 `Processo.informacoes_no_tribunal` (assíncrono + callback) |
| Tracking / `tracking_id` | V1 `MonitoramentoTribunal` (frequência DIARIA/SEMANAL) |
| `last_request_id` polling | Substituído por callback push |
| Sync por OAB | V1 `MonitoramentoTribunal` tipo `POR_OAB` ou V2 `Processo.por_oab` |
| Anexos (`processos_oab_anexos`) | V2 retorna estrutura de fontes; anexos completos exigem o sistema de "autos digitais" da V1 (a confirmar) |
| Credenciais customer (cofre) | Escavador não usa cofre por cliente — usa um único PAT da workspace |

**Diferenças operacionais críticas**
- Escavador usa **um único token global** (não há cofre de credenciais por cliente como na Judit). Isso simplifica `useTenantCredenciais`/`judit-deletar-credencial`/`useRebindCredencialJudit` mas exige replanejamento de billing por tenant.
- Cobrança por requisição via `Creditos-Utilizados` em vez de plano de tracking — precisa de telemetria de custo por chamada.
- Rate limit 500 rpm é mais generoso, mas global → todos os tenants compartilham.
- Callbacks vs polling: arquitetura push-first; precisaríamos de uma edge function `escavador-webhook` validando o token de callback.

## Arquivos afetados
Nenhum arquivo de código será alterado. Será criado **um único arquivo de memória**:
- `mem://integrations/escavador-api` — referência completa
- entrada correspondente em `mem://index.md` apontando para ela

## Impacto

**Usuário final**: nenhum. Nada muda na UI, dados ou fluxos hoje.

**Dados**: nenhuma migration, nenhuma alteração em RLS/tabelas. Apenas a memória do projeto cresce.

**Riscos colaterais**: nenhum técnico. Único risco é a memória ficar desatualizada se a Escavador alterar a API antes da migração — mitigável reconsultando antes de implementar.

**Quem é afetado**: só o agente Lovable em sessões futuras (terá contexto pronto). Nenhum tenant, advogado, admin ou usuário final é tocado.

## Validação
Após salvar, vou:
1. Reler `mem://integrations/escavador-api` para confirmar que cobre os 11 módulos V1 + 2 módulos V2 + autenticação + callbacks + paginação + cobrança.
2. Confirmar que `mem://index.md` referencia a nova memória com descrição específica o suficiente para retrieval futuro ("Escavador API reference for future Judit migration — monitoring focus").
3. Te mostrar um resumo de uma página do que ficou salvo, para você validar antes de eu encerrar.

Quando você pedir a migração no futuro, basta dizer "migra X da Judit pra Escavador" — eu vou consultar essa memória e propor o plano detalhado já com os endpoints corretos.