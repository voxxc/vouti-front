## Causa raiz

Hoje o monitoramento via Escavador (ativar/desativar nos processos OAB e processos normais) está sempre disponível para todos os tenants. Você quer **desligar globalmente** essa funcionalidade por enquanto e ter um lugar no **Super Admin** para ligar/desligar quando quiser.

## Correção

### 1. Feature flag global no banco

Criar tabela `super_admin_feature_flags` (key/value boolean) com a flag inicial:

- `escavador_monitoramento_enabled` = `false` (default desligado)

RLS:
- `SELECT` para `authenticated` (todos os usuários precisam ler para saber se o botão aparece).
- `INSERT/UPDATE/DELETE` apenas para super_admins (via `is_super_admin(auth.uid())`).

### 2. UI no Super Admin

Nova seção **"Funcionalidades globais"** em `src/pages/SuperAdmin*` (ou dentro de `SuperAdminMonitoramento.tsx`, que já é o lugar natural):

- Card com Switch "Monitoramento via Escavador" + descrição curta ("Permite que os tenants ativem monitoramento de processos pelo Escavador").
- Hook novo `useFeatureFlags` que lê e atualiza a tabela.

### 3. Hook de leitura para o resto do app

`useFeatureFlag('escavador_monitoramento_enabled')` — retorna boolean. Usado em:

- `ProcessoOABDetalhes.tsx`, `OABTab.tsx`, `GeralTab.tsx`, `AgendaContent.tsx` — esconder o Switch/botão de "Ativar monitoramento" quando a flag está `false`.
- `useToggleMonitoramento.ts` e equivalente OAB — guardar com `if (!flag) { toast("Funcionalidade desativada pelo administrador"); return }` como defesa em profundidade.

### 4. Defesa no backend

Nas edge functions `escavador-ativar-monitoramento-oab` e `escavador-ativar-e-buscar`:

- No início, ler `super_admin_feature_flags` via service role; se `escavador_monitoramento_enabled = false`, retornar 403 com mensagem clara.

Isso impede contorno via chamada direta.

## Arquivos afetados

**Novo:**
- Migration: tabela `super_admin_feature_flags` + grants + RLS + seed inicial `false`.
- `src/hooks/useFeatureFlags.ts` (leitura + update).
- `src/components/SuperAdmin/SuperAdminFeatureFlags.tsx` (card com Switch).

**Editados:**
- `src/components/SuperAdmin/SuperAdminMonitoramento.tsx` — incluir a nova seção no topo (ou no painel principal do super-admin onde fizer sentido).
- `src/components/Controladoria/ProcessoOABDetalhes.tsx`, `OABTab.tsx`, `GeralTab.tsx`, `Agenda/AgendaContent.tsx` — esconder o Switch quando flag off.
- `src/hooks/useToggleMonitoramento.ts` — guard.
- `supabase/functions/escavador-ativar-monitoramento-oab/index.ts` — guard.
- `supabase/functions/escavador-ativar-e-buscar/index.ts` — guard.

## Impacto

- **Usuário final (tenants):** o Switch "Monitoramento" some dos detalhes dos processos enquanto a flag está desligada. Processos que **já estão monitorados** continuam recebendo andamentos via webhook normalmente — só o gatilho de ativar/desativar manual é escondido. Se quiser parar também os já ativos, dizer e eu incluo no plano.
- **Dados:** uma migration nova com uma tabela 1-linha. Nenhuma alteração nos dados de processos/monitoramentos existentes.
- **Riscos colaterais:** se eu errar a leitura da flag, o botão pode sumir mesmo após ligar. Mitigação: hook com cache curto + invalidação no toggle do super admin.
- **Quem é afetado:** todos os tenants do CRM/Controladoria (Veridicto). Super-admin ganha o novo controle. Outros módulos (CRM WhatsApp, Votech, etc.) não são tocados.

## Validação

1. Após migration, abrir um processo no detalhe → Switch de monitoramento **não aparece**.
2. Tentar chamar a edge `escavador-ativar-monitoramento-oab` direto → resposta 403 "Funcionalidade desativada".
3. Entrar no Super Admin → seção "Funcionalidades globais" → ligar o Switch → recarregar processo → Switch volta a aparecer e ativa monitoramento normalmente.
4. Desligar de novo no Super Admin → Switch some, processos já monitorados continuam recebendo webhook.
