## Causa raiz
`useJuditSystemNames` lista credenciais via RPC `list_judit_credentials`. O usuário logado na SOLVENZA não está conseguindo dados pelo RPC (mesmo cenário que vimos no Cartão Credencial — o RPC `SECURITY DEFINER` está devolvendo lista vazia neste contexto), então o select de "Tribunal / Credencial" mostra apenas "Público". O apelido salvo está correto no banco; o problema é só na leitura no front.

## Correção
Trocar o RPC por leitura direta de `credenciais_judit` (mesmo padrão usado em `useTenantCredenciais` e agora no `CartaoCredencialDialog`):

```ts
const { data, error } = await supabase
  .from('credenciais_judit')
  .select('id, system_name, customer_key, apelido')
  .eq('tenant_id', tenantId)
  .eq('status', 'active')
  .order('apelido', { ascending: true, nullsFirst: false })
  .order('system_name', { ascending: true });
```

A RLS atual de `credenciais_judit` já permite leitura pelos roles do tenant, então funcionará para admin/controller/advogado etc. Mantém a interface `JuditCredencial` inalterada → nenhum consumidor precisa mudar.

## Arquivos afetados
- `src/hooks/useJuditSystemNames.ts`

## Impacto
- **Usuário final:** o select "Tribunal / Credencial" em "Importar processo por CNJ" (e qualquer outro lugar que use o hook) volta a listar todas as credenciais ativas do tenant, com o apelido aparecendo primeiro (`{apelido} — {system_name}` conforme já implementado no dialog).
- **Dados:** nenhuma migration. Apenas leitura.
- **Riscos colaterais:** baixíssimo — RLS continua bloqueando acesso cross-tenant; pior caso, a lista fica vazia se a RLS negar (mesmo comportamento atual).
- **Quem é afetado:** todos os usuários dos tenants que importam processos (admin, controller, advogado, agenda…).

## Validação
- Como admin da SOLVENZA, abrir "Importar processo por CNJ" e confirmar que o select lista as credenciais Judit (apelidos primeiro, fallback `system_name — customer_key`).
- Selecionar uma credencial e confirmar que o processo é importado vinculado a ela.
- Verificar que outras telas que consomem o hook (drawer/edição) continuam funcionando.