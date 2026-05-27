## Causa raiz
O `CartaoCredencialDialog` lista via RPC `list_judit_credentials`, que retorna vazio em algum cenário de auth (provavelmente a sessão `auth.uid()` não satisfaz `is_super_admin` no contexto da `SECURITY DEFINER`, ou o filtro `status='active'` exclui registros). Os outros dialogs (ex.: `TenantCredenciaisDialog`) leem `credenciais_judit` direto pela tabela e funcionam — confirma que o problema é o RPC, não a ausência de dados (verificado no DB: SOLVENZA tem dezenas de credenciais ativas).

## Correção
Refatorar `CartaoCredencialDialog` para usar o mesmo caminho que já funciona:

1. **Listar** via `supabase.from('credenciais_judit').select('id, system_name, customer_key, apelido, status, created_at').eq('tenant_id', tenantId).neq('status','removed').order('created_at',{ascending:false})`.
2. **Salvar apelido** continuar usando o RPC `update_judit_credential_apelido` (já validado), mas com fallback para UPDATE direto na tabela caso o RPC falhe (RLS de super-admin permite).
3. Mostrar coluna **Status** (active/error) como Badge para o usuário identificar credenciais com erro.
4. Mensagem vazia só aparece quando `data.length===0` (após query real).

## Arquivos afetados
- `src/components/SuperAdmin/CartaoCredencialDialog.tsx` (refatorar query e adicionar coluna Status)

## Impacto
- **Usuário final:** o cartão credencial passa a listar todas as credenciais Judit do tenant (SOLVENZA verá ~30+ registros) com sistema, customer key e status; o campo "Apelido" continua editável e o valor escolhido aparecerá no select de "Importar processo por CNJ" dentro da Controladoria.
- **Dados:** nenhuma migration. Apenas leitura/escrita já permitidas.
- **Riscos colaterais:** baixo — usa o mesmo padrão já em produção em `TenantCredenciaisDialog`. Apelido segue persistido via RPC `SECURITY DEFINER` (auditável).
- **Quem é afetado:** apenas super-admins gerenciando tenants em `/super-admin`.

## Validação
- Em `/super-admin`, expandir SOLVENZA → INTEGRAÇÕES → "Cartão Credencial": confirmar lista completa de credenciais com sistema + customer key.
- Editar um apelido (ex.: "PJE TJRO — Dr. Alan"), salvar, recarregar e confirmar que o valor persiste.
- Em Controladoria → "Importar processo por CNJ", confirmar que o select mostra `{apelido} — {system_name}` para a credencial renomeada.