## Causa raiz
As 5 Edge Functions criadas nesta feature ainda não foram deployadas para o Supabase. O console mostra `FunctionsFetchError: Failed to send a request to the Edge Function` em `carregarTribunais`, e a `super-admin-reordenar-andamentos` está no mesmo estado — por isso a nova ordem aparece no UI (otimista) mas não persiste, e ao recarregar volta ao original.

## Correção
1. Deploy explícito das 5 Edge Functions:
   - `super-admin-listar-tribunais-andamento`
   - `super-admin-gerenciar-tribunal-andamento`
   - `super-admin-deletar-andamento`
   - `super-admin-atualizar-andamento`
   - `super-admin-reordenar-andamentos`
2. Validar com chamada direta (`supabase--curl_edge_functions`) à `super-admin-reordenar-andamentos` que ela responde 200 e que o `super_admin_ordem` é gravado.
3. No frontend, melhorar o feedback: mostrar toast de sucesso quando a reordenação salvar, e logar o erro real no console (já está) para diagnóstico futuro.

## Arquivos afetados
Nenhum código novo precisa mudar — apenas deploy. Possível ajuste de UX em `SuperAdminProcessoOABDetalhesPanel.tsx` para toast de "Ordem salva".

## Impacto
1. **UX**: após o deploy, arrastar um movimento passa a persistir. Toast confirma o salvamento. Listar tribunais e demais ações (excluir, marcar sigiloso, tag de tribunal) também voltam a funcionar.
2. **Dados**: nenhuma mudança de schema; só passa a haver escrita na coluna `super_admin_ordem` e leitura/escrita na tabela `super_admin_tribunais_andamento`.
3. **Riscos colaterais**: nenhum — funções novas, isoladas, com checagem de super admin.
4. **Quem é afetado**: apenas Super Admins usando o painel de detalhes do processo OAB.

## Validação
1. Recarregar o Super Admin → abrir um processo → confirmar que o seletor de tribunais carrega.
2. Destravar reordenação, arrastar um card para o topo, recarregar a página: ordem deve persistir.
3. Excluir um movimento e marcar/desmarcar sigiloso: tudo persistente.
4. Conferir logs das Edge Functions no Supabase para garantir 200.