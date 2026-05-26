# Adicionar "Recriar com credencial" no Super Admin

## Causa raiz
O botão **Recriar com credencial** foi adicionado apenas em `src/components/Controladoria/MigracaoAnexosTab.tsx` (escopo tenant — usado dentro de uma Controladoria específica). A tela em que você está agora é a **Migração global** do Super Admin (`/super-admin` → aba Judit), renderizada por `src/components/SuperAdmin/SuperAdminMigracaoAnexos.tsx`, que não recebeu o botão.

## Correção
1. Em `SuperAdminMigracaoAnexos.tsx`, adicionar botão **"Recriar com credencial"** na barra de ações do header (ao lado de "Atualizar" / "Simular" / "Migrar próximo lote") e também opcionalmente na linha de cada tenant (próximo de "Migrar lote").
2. Ao abrir, o `RebindCredencialJuditDialog` precisa saber qual `tenantId` usar. Como a tela é global e o diálogo atual usa `useTenantId()` (tenant do usuário logado), há duas opções:
   - **a)** Adicionar prop opcional `tenantId` ao `RebindCredencialJuditDialog` e, no super-admin, abrir o diálogo a partir do botão de cada tenant passando o `tenant_id` daquela linha.
   - **b)** Adicionar um seletor de tenant dentro do próprio diálogo quando aberto em contexto global.
   
   Recomendo **(a)**: botão por tenant na lista "Progresso por tenant", reaproveitando o diálogo existente com prop `tenantIdOverride`.
3. Ajustar `useRebindCredencialJudit` para aceitar `tenantId` opcional via parâmetro, em vez de só ler do hook.

## Arquivos afetados
- `src/components/SuperAdmin/SuperAdminMigracaoAnexos.tsx` — adicionar botão por linha de tenant e estado para abrir o diálogo com o tenant selecionado.
- `src/components/Controladoria/RebindCredencialJuditDialog.tsx` — aceitar prop `tenantIdOverride?: string`.
- `src/hooks/useRebindCredencialJudit.ts` — aceitar `tenantId` via `params` (sobrescrevendo o do hook).

## Impacto
- **Usuário final (você, super-admin):** passa a ver, em `/super-admin` aba Judit, um botão "Recriar com credencial" em cada tenant da lista "Progresso por tenant". Clica no SOLVENZA → abre o diálogo já contextualizado naquele tenant, com OABs do SOLVENZA, preset TJPR 8.16 e credencial `alangeral`.
- **Dados:** nenhuma mudança de schema. A Edge Function `judit-rebind-credencial-lote` já recebe `tenantId` no body — só estamos ampliando de onde ele vem.
- **Riscos colaterais:** baixo. O diálogo continua funcionando igual na Controladoria por tenant (prop opcional). Único cuidado: garantir que ao abrir no super-admin a query de OABs use o `tenantIdOverride` (não o `useTenantId()` do usuário logado).
- **Quem é afetado:** apenas super-admins. Não muda nada para advogados/comercial/financeiro nem para a Controladoria de um tenant específico.

## Validação
1. Acessar `/super-admin` → aba Judit → confirmar botão "Recriar com credencial" em cada linha de tenant.
2. Clicar no SOLVENZA → diálogo abre, lista as OABs do SOLVENZA, Alan + Will pré-selecionados, João desmarcado.
3. Clicar **Contar** → deve retornar ~86 CNJs elegíveis (8.16, OABs Alan+Will).
4. **Dry-run** → preview com badge "compartilhado" nos CNJs que têm linha do João.
5. **Executar lote** com batch 10 → 86 ÷ 10 = 9 lotes; verificar `judit_migracao_attachments` com `motivo='rebind_credencial'` e `customer_key='alangeral'`.
6. Abrir Controladoria do SOLVENZA → confirmar que o botão antigo continua funcionando lá também.
