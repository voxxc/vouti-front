## Causa raiz

- A credencial existe no banco e está ativa: `PJE TJRO - Dr. Alan` no tenant `27492091-e05d-46a8-9ee8-b3b47ec894e4`.
- O request do select em `/solvenza/dashboard` está retornando `[]` para `credenciais_judit`, mesmo com dados existentes.
- Isso indica problema de visibilidade via RLS/roles para o usuário logado no contexto da Controladoria, não ausência de dados nem erro no apelido.
- O hook `useJuditSystemNames` já consulta a tabela certa, mas ainda depende das políticas atuais liberarem a leitura direta.

## Correção

1. Criar/ajustar uma função segura no banco para listar credenciais Judit ativas por tenant:
   - retornar `id`, `system_name`, `customer_key`, `apelido`;
   - validar acesso com `has_role_in_tenant(auth.uid(), tenant_id, ...)`;
   - incluir perfis que usam a Controladoria, especialmente `admin`, `controller`, `advogado`, `agenda` e demais papéis já previstos no sistema;
   - manter isolamento por `tenant_id`.
2. Alterar `useJuditSystemNames` para usar essa função como fonte principal.
3. Manter fallback controlado para consulta direta somente se a função retornar erro, sem quebrar a tela.
4. Melhorar o estado visual do select para deixar claro quando está carregando ou quando nenhuma credencial acessível foi retornada.

## Arquivos afetados

- `supabase/migrations/...sql`
  - Ajuste da função/RLS de listagem segura das credenciais Judit.
- `src/hooks/useJuditSystemNames.ts`
  - Trocar a leitura direta atual por chamada à função segura e tipada.
- `src/components/Controladoria/ImportarProcessoCNJDialog.tsx`
  - Ajuste leve no select para refletir carregamento/lista vazia sem esconder credenciais válidas.

## Impacto

1. **Usuário final**
   - Ao abrir o select “Tribunal / Credencial”, a credencial salva no Super Admin deve aparecer pelo apelido, por exemplo `PJE TJRO - Dr. Alan`.
   - A opção `Público (sem credencial)` continua disponível.
   - Usuários não verão mais uma lista vazia quando houver credenciais ativas acessíveis no tenant.

2. **Dados / Banco**
   - Não cria tabela nova.
   - Ajusta apenas a forma segura de leitura das credenciais.
   - Mantém filtro obrigatório por `tenant_id` e validação por papel no tenant.
   - Não expõe credenciais de outros tenants.

3. **Riscos colaterais**
   - Baixo risco: a mudança é restrita à listagem de credenciais ativas para seleção.
   - Se algum papel não deveria ver credenciais no select, ele precisa ser removido da função; inicialmente seguirei os papéis já previstos para uso da Controladoria.
   - A importação continuará enviando `system_name` e `customer_key` como antes.

4. **Quem é afetado**
   - Admins e usuários da Controladoria que importam processos por CNJ.
   - Super Admin continua podendo salvar apelidos.
   - Todos os tenants seguem isolados por `tenant_id`.

## Validação

- Confirmar no banco que a função retorna a credencial `PJE TJRO - Dr. Alan` para o tenant correto.
- Confirmar no Network que a chamada não retorna mais `[]` quando existem credenciais ativas.
- Confirmar no dialog “Importar Processo por CNJ” que o select mostra o apelido salvo e mantém a opção público.