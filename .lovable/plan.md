## Causa raiz

Hoje a feature flag global `escavador_monitoramento_enabled` está desligada, então todos os processos (sigilosos ou não) ativam apenas o "modo visual" do monitoramento. Você quer ligar a integração real para o caso geral, mantendo sigilosos no modo visual silencioso, e garantir que os webhooks do provedor sejam recebidos e aplicados ao histórico.

## Correção

1. **Ligar a feature flag global**
   - `UPDATE super_admin_feature_flags SET enabled = true WHERE flag_key = 'escavador_monitoramento_enabled'` (via insert tool).
   - Manter o painel do Super Admin como kill-switch.

2. **Roteamento visual-only para sigilosos (silencioso)**
   - `src/hooks/useToggleMonitoramento.ts`: já trata `processo.sigiloso || processo.apartado` como visual. Vou:
     - Reforçar a detecção de sigiloso a partir de `secrecy_level > 0` ou `capa_completa` ausente, para o caso de o campo `sigiloso` não vir populado.
     - Garantir que o toast de sucesso é idêntico ao do fluxo real (sem nenhuma menção a "visual", "Escavador" ou "administrador").
   - `supabase/functions/escavador-ativar-e-buscar/index.ts` e `escavador-ativar-monitoramento-oab/index.ts`: quando o processo for sigiloso, retornar `success: true` com flag interna `visual_only: true` sem chamar a API externa — defesa em profundidade caso o cliente esqueça o gate.

3. **Receptor de webhooks do Escavador**
   - Nova edge function pública `escavador-webhook` (sem verify_jwt, validação por header secreto `X-Escavador-Secret` comparado ao secret `ESCAVADOR_WEBHOOK_SECRET`).
   - Respeita o kill-switch existente `JUDIT_WEBHOOKS_ENABLED` via um novo secret análogo `ESCAVADOR_WEBHOOKS_ENABLED` (default ligado).
   - Fluxo:
     1. Valida secret e payload.
     2. Identifica o processo pelo `numero_cnj` (ou `escavador_id`) em `processos_oab` e em `processos` (controladoria).
     3. Faz upsert das novas movimentações em `processos_oab_andamentos` (com `dedup_hash`) e/ou `processo_atualizacoes_escavador`, marcando `lida=false`.
     4. Atualiza `processo_monitoramento_escavador.ultima_atualizacao` e incrementa `total_atualizacoes`.
     5. Dispara notificação interna (`notifications`) para o tenant, tipo já existente para novos andamentos.
     6. Loga tudo em `judit_api_logs` (já é usado para auditar provedores externos) com `provider='escavador'`.
   - Idempotente: sempre via `dedup_hash` para evitar duplicatas em reenvios.

4. **Configurar URL do webhook no provedor**
   - URL pública: `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/escavador-webhook`.
   - Documentar no Super Admin (apenas exibir a URL + status) — sem mudança operacional automatizada.

## Arquivos afetados

- `src/hooks/useToggleMonitoramento.ts` — detecção robusta de sigiloso, mensagens unificadas.
- `supabase/functions/escavador-ativar-e-buscar/index.ts` — bypass silencioso para sigilosos.
- `supabase/functions/escavador-ativar-monitoramento-oab/index.ts` — idem.
- `supabase/functions/escavador-webhook/index.ts` — novo receptor.
- `supabase/config.toml` — registrar `escavador-webhook` com `verify_jwt = false`.
- Secrets: `ESCAVADOR_WEBHOOK_SECRET`, `ESCAVADOR_WEBHOOKS_ENABLED`.
- Update no `super_admin_feature_flags` (via insert tool).

## Impacto

- **Usuário final (UX)**: para processos normais o monitoramento passa a funcionar de verdade — andamentos chegam sozinhos via webhook e aparecem como não-lidos. Para sigilosos, o toggle continua funcionando exatamente igual, sem nenhum aviso diferente; ele não percebe que é só visual.
- **Dados**: novos inserts em `processos_oab_andamentos` / `processo_atualizacoes_escavador` vindos do webhook, e atualizações em `processo_monitoramento_escavador`. Sem mudança de schema.
- **Riscos colaterais**: chamadas reais ao provedor podem consumir cota; reenvios duplicados do provedor são tratados por `dedup_hash`; se o secret do webhook vazar, qualquer pessoa poderia injetar andamentos — por isso a validação por header secreto é obrigatória.
- **Afetados**: todos os tenants com processos não-sigilosos passam a ter monitoramento real ativo no próximo toggle; tenants com sigilosos seguem com comportamento idêntico ao atual.

## Validação

1. Após ligar a flag, ativar monitoramento em um processo não-sigiloso e confirmar nos logs da edge function `escavador-ativar-e-buscar` que houve chamada externa e gravação de movimentações.
2. Ativar monitoramento em um processo sigiloso e confirmar nos logs que **não** houve chamada externa — toast e estado finais idênticos.
3. Disparar um POST manual em `escavador-webhook` com payload simulado e secret correto; confirmar inserção do andamento com `lida=false` e notificação criada. Repetir o mesmo POST e confirmar que o `dedup_hash` impede duplicata.
4. Disparar POST sem o header secreto e confirmar resposta 401.
