## Causa raiz

Hoje o botão **"Recriar c/ credencial"** aparece dentro do card "Progresso por tenant" do `SuperAdminMigracaoAnexos`, escondido entre dezenas de linhas e abrindo um modal. Em telas grandes (super-admin), o usuário não localiza onde a função está.

## Correção

Promover a função para uma **aba dedicada** ao lado de "Reconciliação Judit", com seletor de tenant no topo e o painel de execução logo abaixo (sem modal).

1. **Extrair o conteúdo do dialog** em um componente reutilizável `RebindCredencialJuditPanel` (mesmas controles: credencial, padrão CNJ, OABs, lote, Contar/Dry-run/Executar e resultados). Recebe `tenantId: string` por prop.

2. **`RebindCredencialJuditDialog`** passa a apenas envolver o panel em `<Dialog>` — mantém compatibilidade com o uso atual em `MigracaoAnexosTab` (Controladoria) e com o botão por linha no super-admin (se desejado manter; será removido para não duplicar — ver abaixo).

3. **`SuperAdminMigracaoAnexos.tsx`**:
   - Adicionar `TabsTrigger value="rebind"` com label **"Recriar c/ credencial"** ao lado de "Reconciliação Judit".
   - No `CardContent`, quando `aba === 'rebind'`: renderizar um `<Select>` de tenant (reutiliza `tenants`) + `<RebindCredencialJuditPanel tenantId={tenantSelecionado} />`.
   - Remover o botão "Recriar c/ credencial" das linhas da lista de tenants (e o estado `rebindTenantId` + render do dialog), já que agora há uma aba própria.

Nenhuma mudança em Edge Function (`judit-rebind-credencial-lote`), hooks de dados ou schema.

## Arquivos afetados

- `src/components/Controladoria/RebindCredencialJuditPanel.tsx` (novo — UI extraída)
- `src/components/Controladoria/RebindCredencialJuditDialog.tsx` (vira wrapper Dialog + panel)
- `src/components/SuperAdmin/SuperAdminMigracaoAnexos.tsx` (nova aba + remove botão por linha)

## Impacto

- **Usuário final (super-admin):** a função fica visível como aba dedicada "Recriar c/ credencial" ao lado de "Reconciliação Judit". Fluxo: seleciona o tenant no topo → ajusta credencial/padrão/OABs → Contar / Dry-run / Executar. Sem precisar caçar botão em linha. O botão por linha some.
- **Usuário final (tenant — Controladoria):** sem mudança visível. O botão "Recriar com credencial" da aba "Migração de Anexos" continua abrindo o mesmo dialog (que agora internamente usa o panel).
- **Dados:** nenhum. Sem migration, sem alteração de RLS, sem mudança de payload.
- **Riscos colaterais:** baixos. Apenas reorganização de UI; lógica de execução e seleção de OABs/credenciais é a mesma. O panel não chama `useTenantId` — recebe tenant explícito (consistente com a correção anterior).
- **Quem é afetado:** super-admins (ganho de descoberta) e advogados/admin em Controladoria (sem efeito).

## Validação

1. `/super-admin` → módulo Judit/Migração → aba **"Recriar c/ credencial"** existe ao lado de "Reconciliação Judit".
2. Selecionar SOLVENZA → credencial `alangeral` pré-selecionada → padrão `%.8.16.%` → OABs Alan/Will marcadas, João desmarcado.
3. **Contar** retorna número esperado; **Dry-run** lista lote; **Executar lote** processa.
4. Linhas de tenant na visão de progresso não exibem mais o botão "Recriar c/ credencial" (sem duplicidade).
5. Controladoria de um tenant → aba "Migração de Anexos" → botão "Recriar com credencial" abre o dialog normalmente.
