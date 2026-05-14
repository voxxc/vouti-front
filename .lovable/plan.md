
# Codilo como alternativa à Judit (multi-provider de monitoramento processual)

## Contexto

A operação atual depende 100% da Judit para consulta e monitoramento processual. Quando a Judit falha (ex.: `LAWSUIT_NOT_FOUND` no caso recente do `0043162-19.2026.8.16.0000`), não há fallback. A Codilo (https://docs.codilo.com.br) oferece um catálogo equivalente:

- **Consulta Única / Automática** — equivalentes ao `lawsuit_cnj` da Judit.
- **Monitoramento Push** — `POST /v1/processo/novo` em `api.push.codilo.com.br`, callbacks por webhook (suporta múltiplas URLs e headers customizados).
- **Vantagem real**: tem `pending-push` + `confirm-callback` (fila de eventos pendentes), o que protege contra perda de webhooks — coisa que a Judit não tem.

## Estratégia

**Não substituir, abstrair.** Codilo entra como **provedor alternativo**, escolhido por tenant pelo super-admin no `TenantCard`. Internamente, todas as gravações continuam nas mesmas tabelas (`processos_oab`, `processos_oab_andamentos`) com o mesmo schema, atrás de uma camada `provider`. Isso permite:

- Migração gradual (tenant a tenant).
- Fallback futuro automático Codilo ↔ Judit.
- Zero impacto para usuário final no curto prazo.

## Correção / Implementação

### 1. Banco de dados (migration única)

**a) Tabela `tenants`** — coluna nova:
- `api_provider text NOT NULL DEFAULT 'judit'` com check `('judit','codilo')`.

**b) Tabela `processos_oab`** — coluna nova:
- `api_provider text NOT NULL DEFAULT 'judit'` (rastreia qual provedor está atendendo cada processo, permitindo coexistência durante migração).

**c) Tabela `processo_monitoramento_judit`** — renomear conceitualmente sem renomear ainda. Adicionar:
- `provider text NOT NULL DEFAULT 'judit'`
- `codilo_push_id text` (id retornado pelo `create-push` da Codilo)

**d) Nova tabela `credenciais_codilo`** (espelha `credenciais_judit`, separada por enquanto para isolar credenciais por provedor):
- `tenant_id`, `access_token` (criptografado/secret), `base_url` opcional, `status`, `created_at`, `updated_at`.
- RLS: super_admin pode tudo; admin do tenant pode ler.

**e) RPC helper** `get_provider_for_tenant(p_tenant_id uuid) returns text` — security definer, retorna `tenants.api_provider`. Usado pelas Edge Functions.

**Sem mudança de schema em** `processos_oab_andamentos` (continua o destino comum).

### 2. Secrets (Edge Functions)

- `CODILO_API_TOKEN` (token global de fallback se o tenant não tiver token próprio em `credenciais_codilo`).

### 3. Camada de abstração em Edge Functions

Criar arquivo compartilhado **`supabase/functions/_shared/legalProvider.ts`** com interface:

```ts
type LegalProvider = {
  buscarProcesso(cnj, opts): Promise<{ andamentos[], detalhes, raw }>;
  ativarMonitoramento(cnj, callbackUrl, opts): Promise<{ trackingId }>;
  desativarMonitoramento(trackingId): Promise<void>;
  consultarStatus(trackingId): Promise<{ requestIdAtual, lastUpdate }>;
  parseWebhookPayload(body): NormalizedAndamento[];
}
```

Dois adapters: `judit.ts` (extrai a lógica que já existe nas funções `judit-*`) e `codilo.ts` (novo).

Função despachante `getProviderForTenant(tenantId)` resolve o adapter via RPC.

### 4. Edge Functions Codilo (novas)

- `codilo-buscar-processo` — POST `/autorequest` ou consulta única (autodetecta).
- `codilo-ativar-monitoramento` — POST `https://api.push.codilo.com.br/v1/processo/novo` com `ignore: true` no cadastro inicial (não duplicar histórico já obtido).
- `codilo-desativar-monitoramento` — DELETE.
- `codilo-webhook` — recebe callback Codilo, normaliza para schema interno (`processos_oab_andamentos`), dispara notificação `andamento_novo`, atualiza `ultima_atualizacao`.
- `codilo-sync-pendentes` (cron) — usa `pending-push` + `confirm-callback` para drenar webhooks perdidos. **Rede de segurança que não temos hoje com a Judit.**
- `codilo-health` — espelho de `judit-health`.

### 5. Atualizar Edge Functions de orquestração existentes

Funções que hoje sempre chamam Judit precisam consultar o provider do tenant primeiro:

- `judit-buscar-processo` (renomear lógica para chamar via `getProviderForTenant`) ou criar `monitor-buscar-processo` como entry-point único. **Decisão**: criar entry-point novo `monitor-buscar-processo` e `monitor-ativar-monitoramento` que internamente chamam Judit ou Codilo. As funções `judit-*` antigas continuam intactas para super-admin debugar.

- `useMonitoramentoJudit` no front passa a invocar `monitor-buscar-processo` / `monitor-ativar-monitoramento` em vez de `judit-*`.

### 6. UI — Super Admin (TenantCard)

No `src/components/SuperAdmin/TenantCard.tsx`:

- Adicionar **toggle/select compacto** abaixo do `PlanoIndicator`:
  - Componente `<ProviderSelector tenantId provider onChange />` com 2 opções: `Judit` e `Codilo` (pílulas com ícones).
  - Ao mudar, chama `supabase.from('tenants').update({ api_provider }).eq('id', tenant.id)`.
  - Confirmação se há monitoramentos ativos: aviso "Processos já monitorados continuarão no provedor anterior. Apenas novos monitoramentos usarão o provedor selecionado."
  - Badge no card mostrando o provedor atual (cor distinta — Judit roxo, Codilo verde).

- Atualizar `EditTenantDialog.tsx` com mesmo seletor (consistência).

- Atualizar `src/types/superadmin.ts` adicionando `api_provider?: 'judit' | 'codilo'` em `Tenant`.

- **Novo dialog** `TenantCodiloCredenciaisDialog.tsx` (espelho do `TenantCredenciaisDialog`) acessível pelo dropdown do card quando o provider for Codilo. Permite super-admin colar/atualizar `access_token` por tenant.

### 7. UI — Tenant (informativo, sem ação)

- `src/components/Controladoria/...` — exibir badge discreto no card de processo monitorado mostrando qual provedor está atendendo aquele processo (`processos_oab.api_provider`). Útil para suporte.

- `usePlanoLimites` permanece igual — limites de monitoramento não mudam.

### 8. Memória do projeto

Adicionar em `mem://`:
- Nova memória `mem://legal-ops/multi-provider-monitoring-standard` com regras: usar `monitor-*` entry-points, nunca chamar `judit-*` ou `codilo-*` direto do front; novos processos herdam o provider do tenant; processo já monitorado mantém seu provedor original até desativar/reativar.
- Atualizar `mem://legal-ops/judit-integration-standard` apontando para a nova abstração.

## Arquivos afetados

**Migrations**
- 1 migration (colunas `api_provider`, `provider`, `codilo_push_id`, tabela `credenciais_codilo`, RPC `get_provider_for_tenant`).

**Edge Functions — novas (6)**
- `supabase/functions/_shared/legalProvider.ts` (+ adapters `judit.ts`, `codilo.ts`)
- `codilo-buscar-processo/`
- `codilo-ativar-monitoramento/`
- `codilo-desativar-monitoramento/`
- `codilo-webhook/`
- `codilo-sync-pendentes/`
- `codilo-health/`
- `monitor-buscar-processo/` (despachante)
- `monitor-ativar-monitoramento/` (despachante)
- `monitor-desativar-monitoramento/` (despachante)

**Edge Functions — pequenas alterações**
- Nenhuma `judit-*` é alterada agora (mantém compat). Lógica é movida em refactor incremental conforme `monitor-*` amadurece.

**Front (~7 arquivos)**
- `src/types/superadmin.ts` — campo `api_provider`
- `src/components/SuperAdmin/TenantCard.tsx` — seletor + badge
- `src/components/SuperAdmin/EditTenantDialog.tsx` — seletor
- `src/components/SuperAdmin/TenantCodiloCredenciaisDialog.tsx` (novo)
- `src/components/Common/ProviderBadge.tsx` (novo, reutilizável)
- `src/hooks/useMonitoramentoJudit.ts` → renomear para `useMonitoramento.ts`, invocar `monitor-*`
- `src/hooks/useToggleMonitoramento.ts` → idem
- `src/components/Controladoria/...` (1–2 arquivos para mostrar badge)

**Memória**
- 1 nova entry + 1 atualização no `mem://index.md`.

Total: ~11 arquivos novos + ~7 alterados + 1 migration.

## Impacto

**1. Para o usuário final (UX, telas, fluxos)**
- Curto prazo (Fases 1-2 abaixo): **zero impacto**. Default `judit` em todos os tenants; nada muda.
- Quando o super-admin trocar um tenant para Codilo: o usuário daquele tenant **não nota diferença** — botão "Ativar monitoramento" continua igual, andamentos chegam na mesma tela, mesma timeline.
- Único elemento visível para usuário comum: badge discreto "Codilo" / "Judit" no card do processo monitorado (informativo, ajuda no suporte).
- Super-admin ganha controle por tenant (toggle no card) + dialog para colar token Codilo.

**2. Para os dados (migrations, RLS, performance)**
- 1 migration aditiva (sem rewrite de tabela). Tenants existentes recebem `api_provider='judit'` por default → nenhum dado quebra.
- Nova tabela `credenciais_codilo` com RLS: super_admin gerencia; admin do tenant lê.
- Webhooks Codilo gravam na **mesma tabela** `processos_oab_andamentos` → consultas, dashboards, RPCs (`get_andamentos_nao_lidos_por_processo`, `get_total_andamentos_nao_lidos`) continuam funcionando sem alteração.
- Performance: neutra. Cada processo tem 1 provedor por vez. RPC `get_provider_for_tenant` é cache-friendly (índice em `tenants.id` já existe).
- `prevent_delete_monitored_processo_oab` continua válido (não importa o provedor).

**3. Riscos colaterais**
- **Mapeamento de payload** Codilo → schema interno pode produzir andamentos duplicados ou faltando se campos divergirem. Mitigado por: testes de paridade na Fase 0 + reuso de `generateAndamentoKey` (já existe em `reprocessar-andamentos-monitorados`) para deduplicação.
- **Cobertura por tribunal**: Codilo pode não cobrir 100% dos tribunais que a Judit cobre. Mitigado mantendo Judit como default e migrando tenants em ondas piloto.
- **Webhook URL pública**: já temos infra para `judit-webhook` (URL pública das Edge Functions Supabase), então `codilo-webhook` é replicável.
- **Custo dobrado** durante transição (pagando os dois provedores). Aceitável para piloto controlado.
- **Confusão operacional**: super-admin pode trocar provider sem entender que processos antigos ficam no provedor antigo. Mitigado com dialog de confirmação explícito.
- **Credenciais para sigilosos**: Judit suporta `customer_key`. Codilo precisa ser validado em campo (Fase 0). Se faltar, processos sigilosos continuam só na Judit.

**4. Quem é afetado**
- **Super admin**: ganha seletor de provider no `TenantCard` + dialog de credencial Codilo. Operação principal afetada.
- **Admin do tenant**: zero impacto direto. Pode ver no banco que mudou, mas UX igual.
- **Advogado, controladoria, agenda, financeiro, comercial, estagiário, perito**: **nenhum impacto**. Andamentos chegam pelo mesmo fluxo, mesmas notificações, mesmas telas.
- **Tenants em piloto Codilo**: ganham rede de segurança extra (sync de pendentes via `pending-push`).

## Validação

### Fase 0 — Antes de qualquer código
- Conta sandbox Codilo + tabela de preços + lista de abrangência atual (a página `/abrangencia` da doc retornou 404, pedir CSV ao comercial).
- Testar manualmente 5 CNJs reais já cobertos pela Judit (incluindo o `0043162-19.2026.8.16.0000` que falhou) via curl Codilo. Comparar: cobertura, latência, payload, qualidade dos andamentos. Documentar em `mem://legal-ops/codilo-coverage-baseline`.

### Fase 1 — Backend (sem ligar UI)
- Migration aplicada → confirmar que todos os tenants existentes têm `api_provider='judit'` e nada quebra.
- Edge Functions `codilo-*` deployadas; testar cada uma com curl direto + token sandbox.
- Testes Deno em `supabase/functions/codilo-webhook/codilo-webhook_test.ts` validando normalização do payload.
- Comparar `generateAndamentoKey` aplicado a payload Judit vs payload Codilo do mesmo processo → mesmas chaves geradas.

### Fase 2 — UI super-admin
- Toggle no `TenantCard` muda `tenants.api_provider` no banco.
- Badge atualiza visualmente. Dialog de credencial Codilo grava em `credenciais_codilo`.
- Trocar provider de um tenant de teste → ativar monitoramento de novo processo → confirmar que vai para Codilo (verificar `processos_oab.api_provider='codilo'` e webhook chegando).

### Fase 3 — Piloto controlado (2 semanas)
- 1 tenant interno trocado para Codilo. Comparar diariamente:
  - Total de andamentos novos detectados Codilo vs. mesmo processo na Judit (espelho).
  - Latência média do webhook.
  - Erros tipo `not_found` por provedor.
- **Métricas de aceite**: paridade ≥ 95% nos andamentos detectados, latência ≤ Judit, taxa de erro `not_found` menor ou igual.

### Fase 4 — Rollout
- Ativar Codilo como opção visível e documentar para o super-admin.
- Manter Judit como default por mais N meses.
- **Sem descomissionar Judit** até paridade comprovada em 3 tenants reais.

## Perguntas antes de eu implementar

1. Confirma que o **default de novos tenants continua Judit**? (recomendado para não quebrar nada)
2. Já tem **token sandbox Codilo** disponível pra eu pedir como secret, ou vamos criar a infra primeiro e você fornece depois?
3. Para **processos já monitorados na Judit** quando o super-admin trocar o tenant para Codilo: mantenho na Judit (recomendado) ou ofereço botão "migrar todos para Codilo" (mais arriscado)?
