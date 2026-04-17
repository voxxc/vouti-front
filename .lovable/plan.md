

### Vou executar agora (3 itens)

**Item 1 — RLS no `password_reset_codes`** (defesa em profundidade)
- Migration SQL: criar política `FOR ALL USING (false)` para bloquear acesso via client
- Service role (edge functions) continua funcionando normalmente
- Zero impacto em código existente

**Item 4 — Lista de Processos Incompletos no Super Admin**

Arquivos a criar/editar:
- `src/components/SuperAdmin/TenantProcessosIncompletosDialog.tsx` (novo) — dialog com tabela: CNJ, OAB, data criação, monitoramento ativo, botão "Recarregar detalhes"
- `src/components/SuperAdmin/TenantCard.tsx` — adicionar botão `FileWarning` com badge da contagem (consulta `processos_oab` onde `detalhes_request_id IS NULL` filtrado por `tenant_id`)
- `supabase/functions/judit-backfill-detalhes-tenant/index.ts` (nova edge function) — recebe `tenant_id`, busca em lotes de 50 os processos sem detalhes, chama `judit-buscar-detalhes-processo` para cada (com delay de 200ms entre cada para não estourar rate limit)
- Hook query para contar `processos_oab` faltando detalhes por tenant (passa para `TenantCard` via prop `incompleteProcessosCount`)

**Item 5 — Rate limit em landing leads**

Arquivos a criar/editar:
- `supabase/functions/submit-landing-lead/index.ts` (nova) — valida payload (zod), checa rate limit por IP (5/10min) e por telefone (3/dia) usando uma tabela auxiliar `landing_lead_rate_limits` (ou consulta direto `landing_leads` por `created_at`), insere o lead se passar
- Migration: criar tabela `landing_lead_rate_limits (ip, phone, created_at)` com índices para query rápida — OU pular tabela e usar query direta em `landing_leads` (mais simples, vou seguir essa abordagem)
- Localizar componente do formulário da landing (provavelmente `src/pages/Landing*` ou similar — vou buscar `landing_leads` no código) e trocar `supabase.from('landing_leads').insert()` por `supabase.functions.invoke('submit-landing-lead')`

### Vai ficar para conversar depois

- **Item 3 — Credenciais Judit (multi-credencial loop):** preciso entender custo Judit por request vazio + se faz sentido cachear matching tribunal→credencial antes de implementar
- **Item 6 — HIBP:** sem ação possível pelo nosso lado, fica fora do escopo

### Validação pós-deploy

1. Abrir Super Admin → ver botão "Processos Incompletos" com badge nos cards (ex: Solvenza 94, Oliveira 98, Harles 74, Cordeiro 19)
2. Clicar no botão → ver lista → clicar "Recarregar todos" → conferir contador descer ao longo do tempo
3. Tentar enviar 6 leads em sequência pelo mesmo IP → 6º deve ser rejeitado com "Muitas tentativas, tente novamente em alguns minutos"
4. Verificar que fluxo "esqueci senha" continua funcionando (RLS não quebrou nada)

