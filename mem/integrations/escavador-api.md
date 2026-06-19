---
name: Escavador API Reference
description: Reference completa para futura migração Judit→Escavador. Foco em monitoramento de processos. Endpoints V1+V2, autenticação, callbacks, paginação, mapeamento Judit↔Escavador.
type: reference
---

# Escavador Business API — Referência para migração futura da Judit

**Status**: estudo prévio. Nenhum código foi alterado. Consultar antes de implementar a migração.

## Fundamentos

- **Endpoints base**:
  - V1: `https://api.escavador.com/api/v1` (busca + monitoramento + diários)
  - V2: `https://api.escavador.com/api/v2` (dados estruturados ricos por processo)
- **Autenticação**: Personal Access Token (PAT) Bearer, header `Authorization: Bearer <token>`. Gerado em `https://api.escavador.com/tokens`. Server-to-server only — nunca expor no frontend.
- **Rate limit**: 500 req/min global por token (compartilhado entre todos os tenants).
- **Cobrança**: header `Creditos-Utilizados` em centavos por requisição. Saldo via rota `Saldo` V1.
- **Painel**: `https://api.escavador.com/painel` (histórico, tokens, callbacks, recargas, faturas, monitoramentos).
- **SDK Python oficial**: `github.com/Escavador/escavador-python` — fonte usada para extrair os endpoints abaixo. Em Edge Functions usar `fetch` direto.

## Paginação

Dois formatos:
1. **Numerada** (`?page=2&per_page=25`) — comum na V1. Resposta: `meta.{current_page,total_pages,total,per_page}`, `links.{first,last,prev,next}`.
2. **Cursor** (`?cursor=HASH&limit=25`) — V2 para listas grandes (movimentações, processos por envolvido). `links.next` carrega cursor. Mais estável em bases dinâmicas.

SDK V2 expõe `.continuar_busca()` que segue `links.next`. Em fetch direto, ler `links.next` e refazer GET.

## Callbacks (push, recomendado vs polling)

- Configurados em `https://api.escavador.com/callbacks` (URL + token de validação).
- Escavador faz `POST` para a URL configurada em eventos: atualização de processo, resultado de busca assíncrona, monitoramento disparado.
- Token de validação vem no header `Authorization` do callback recebido — comparar antes de processar.
- **Implementação esperada**: edge function `escavador-webhook` (verify_jwt=false, validação de token em código), idempotente por `id` do callback.
- Eventos têm `item_tipo`: `busca_assincrona`, `monitoramento_tribunal`, `monitoramento_diario`.
- Listagem em massa: `GET /api/v1/callbacks` (útil para reconciliação).

## V1 — Endpoints (prefixo `/api/v1/`)

### Processo (busca/atualização no site do tribunal)
- `POST tribunal/{ORIGEM}/busca-por-nome/async` — busca por nome (assíncrona, gera callback). `ORIGEM` = sigla do sistema (ex: `TJSP`).
- `POST tribunal/{ORIGEM}/busca-por-documento/async` — por CPF/CNPJ.
- `POST tribunal/{ORIGEM}/busca-por-oab/async` — por OAB+UF.
- `POST processos/{numero_cnj}/informacoes-no-tribunal` — pesquisa síncrona ou assíncrona dado um CNJ. Retorna `id` para callback. Resposta: `status` ∈ {`SUCESSO`, `PENDENTE`, `ERRO`}.
- `GET oab/{UF}/{numero}/processos` — lista de processos por OAB em diários.
- `GET processos/{id}/envolvidos`.
- `GET processos/{id}/movimentacoes-diario`.
- Download de PDF de movimentação: GET no `link_pdf` retornado pelo objeto.

### MonitoramentoTribunal (chave para substituir tracking da Judit)
- `GET monitoramentos-tribunal` — lista todos.
- `GET monitoramentos-tribunal/{id}` — detalhe.
- `POST monitoramento-tribunal` — cria. Body: `tipo_monitoramento` ∈ {`UNICO`, `NUMDOC`, `NOME`}, `valor` (CNJ ou doc ou nome), `tribunal` (sigla), `frequencia` ∈ {`DIARIA`, `SEMANAL`}.
- `PUT monitoramentos-tribunal/{id}` — edita frequência.
- `DELETE monitoramentos-tribunal/{id}` — remove.
- ⚠️ Não existe `POR_OAB` na enum. Para OAB usar `MonitoramentoDiario` ou `processos_por_oab_no_tribunal/async`.

### MonitoramentoDiario (Diários Oficiais)
- `POST monitoramentos` — cria. Tipo: `processo` ou `termo`. Para processo: `processo_id` + `origens_ids` (lista de diários).
- `GET monitoramentos` / `GET monitoramentos/{id}` / `PUT monitoramentos/{id}` / `DELETE monitoramentos/{id}`.
- `GET monitoramentos/{id}/origens` — diários cobertos.
- `GET monitoramentos/{id}/aparicoes` — matches encontrados.
- `POST monitoramentos/testcallback` — testa entrega (`callback_url`, `tipo` ∈ {`movimentacao`, `diario`}).

### Callback
- `GET callbacks` — filtros: `data_minima`, `data_maxima`, `item_id`, `item_tipo`, `evento`, `status` ∈ {`sucesso`, `em_tentativa`, `erro`}.
- `POST callbacks/marcar-recebidos` — body `{ ids: [...] }`.
- `POST callbacks/{id}/reenviar`.

### Outros V1
- `Busca.busca_termo(termo, tipo)` — `tipo` ∈ {`t`, `p`, `i`, `pa`, `d`, `en`}.
- `Movimentacao.por_id(id)` — `GET movimentacoes/{id}`.
- `Tribunal.sistemas_disponiveis()` — `GET tribunais` (cobertura).
- `Tribunal.detalhes(sigla)`.
- `Saldo`, `DiarioOficial`, `Instituicao`, `Pessoa`, `Legislacao`, `Jurisprudencia` — secundários.

## V2 — Endpoints (prefixo `/api/v2/`)

### Processo (dados estruturados ricos)
- `GET processos/numero_cnj/{cnj}` — detalhe completo: `fontes`, polos (ativo/passivo), `valor_causa`, classe, assunto, tribunal, `data_inicio`, `data_ultima_movimentacao`, capa, informações complementares.
- `GET processos/numero_cnj/{cnj}/movimentacoes` — paginação por cursor. Cada movimentação: `data`, `tipo`, `conteudo`, `fonte`, `classificacao`.
- `GET envolvido/processos?cpf_cnpj=X` ou `?nome=X` — processos de pessoa/empresa. Filtros: `ordena_por` ∈ {`data_ultima_movimentacao`, `data_inicio`}, `ordem` ∈ {`asc`, `desc`}, `tribunais[]`, `status`, `data_minima`, `data_maxima`, `limit`. Cursor.
- `GET advogado/processos?oab_numero=X&oab_estado=UF` — processos por OAB. Mesmos filtros.
- `GET envolvido/resumo` / `GET advogado/resumo` — agregações estatísticas.
- `POST processos/numero_cnj/{cnj}/solicitar-atualizacao` — pede recoleta no tribunal. Body: `enviar_callback` (0/1), `documentos_publicos` (0/1). Retorna `SolicitacaoAtualizacao` com `id`, `criado_em`, `numero_cnj`, `concluido_em?`.
- `GET processos/numero_cnj/{cnj}/status-atualizacao` — status (`data_ultima_verificacao`, `tempo_desde_ultima_verificacao`, `ultima_verificacao`).

### Tribunal V2
- `GET tribunais` — referência.
- Enum `SiglaTribunal` cobre STF, STJ, CJF, CNJ, TST, CSJT, TRF1-6, TRT-1..TRT-24, TSE, TRE-{UF}, presumível TJ-{UF}.

## Mapeamento Judit → Escavador

| Judit (atual) | Escavador (futuro) |
|---|---|
| `judit-sync-*` (sync por CNJ) | V2 `POST /processos/numero_cnj/{cnj}/solicitar-atualizacao` com `enviar_callback=1` |
| `tracking_id` (monitoramento contínuo) | V1 `POST /monitoramento-tribunal` `frequencia=DIARIA` |
| `last_request_id` polling | Eliminado — substituir por callback push |
| `judit-consultar-tracking` | V2 `GET /processos/numero_cnj/{cnj}/status-atualizacao` |
| Sync por OAB | V1 `processos_por_oab_no_tribunal/async` ou V2 `GET /advogado/processos` |
| `judit-sync-ultimos-anexos` (anexos de steps) | V2 `fontes[].url` + `solicitar-atualizacao?documentos_publicos=1` |
| `judit-deletar-credencial`, `useTenantCredenciais`, cofre por cliente | **Sem equivalente** — Escavador usa um único PAT global. Eliminar todo o subsistema de cofre. |
| `useRebindCredencialJudit` | Não aplicável |
| `processo_monitoramento_escavador` / `processo_atualizacoes_escavador` | Já existem (`src/types/escavador.ts`); reaproveitar |

## Diferenças operacionais críticas

1. **Token único global**: simplifica auth (sem cofre por cliente) mas exige **telemetria de custo por tenant** medindo `Creditos-Utilizados` por chamada e atribuindo ao `tenant_id` que originou.
2. **Push-first via callbacks**: inverte o fluxo. Edge function `escavador-webhook` recebe e dispara processamento idempotente (chave: `id` do callback).
3. **Rate limit compartilhado** (500 rpm global). Adicionar fila/throttle se múltiplos tenants disparam simultaneamente.
4. **Síncrono vs assíncrono**: maioria dos endpoints "no tribunal" V1 é assíncrona. V2 `por_numero/movimentacoes/envolvido/advogado` é síncrona mas pode retornar cache — usar `solicitar-atualizacao` para forçar coleta fresca.
5. **Frequências de monitoramento**: só `DIARIA` ou `SEMANAL` (Judit oferece mais granularidade — possível perda de SLA).
6. **Cobertura**: validar `Tribunal.sistemas_disponiveis()` antes de migrar — checar se todos tribunais usados pelo CRM estão suportados.

## Já existe no projeto (reaproveitar)

- `src/types/escavador.ts` — tipos `ProcessoMonitoramentoEscavador`, `ProcessoAtualizacaoEscavador`.
- `supabase/functions/escavador-ativar-e-buscar/index.ts` — POC V1 (`/api/v1/busca?q=&qo=processos`). Salva em `processo_monitoramento_escavador` e `processo_atualizacoes_escavador`.
- Secret `ESCAVADOR_API_TOKEN` já configurada.
- ⚠️ POC atual usa V1 textual. Para migração real preferir V2 `/api/v2/processos/numero_cnj/{cnj}` (estrutura mais rica).

## Próximos passos quando o usuário pedir migração

1. Confirmar cobertura de tribunais (`GET /api/v1/tribunais`).
2. Configurar URL de callback no painel Escavador → criar edge function `escavador-webhook` validando token via header `Authorization`.
3. Migrar `judit-sync-*` → V2 `solicitar-atualizacao` + callback.
4. Migrar `tracking_id` → V1 `MonitoramentoTribunal`. Renomear coluna para `escavador_monitoramento_id`.
5. Eliminar tabelas/edge functions de cofre Judit.
6. Adicionar telemetria de custo por tenant via header `Creditos-Utilizados`.
7. Plano de paridade: rodar Judit + Escavador em paralelo por N dias antes do switchover.
