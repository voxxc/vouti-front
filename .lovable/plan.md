## Causa raiz

O diálogo carrega 0 arquivos para SOLVENZA mesmo havendo 20 em `reuniao_arquivos` e 1 em `reuniao_cliente_arquivos`. As policies RLS dessas tabelas só liberam linhas onde `tenant_id = get_user_tenant_id()` — ou seja, o tenant do próprio usuário logado. Como o Super Admin acessa o `tenant_id` de OUTRO cliente (SOLVENZA), o PostgREST devolve lista vazia. O mesmo bloqueio existe em `storage.objects` para os buckets `reuniao-attachments` e `reuniao-cliente-attachments`, então o download e o `remove()` também falhariam silenciosamente.

## Correção

Migration adicionando policies que liberam Super Admins (`is_super_admin(auth.uid())`) nas duas tabelas e nos dois buckets de storage:

1. `reuniao_arquivos`: policies SELECT e DELETE para super admin (sem filtro de tenant).
2. `reuniao_cliente_arquivos`: policies SELECT e DELETE para super admin.
3. `storage.objects` bucket `reuniao-attachments`: policies SELECT e DELETE para super admin.
4. `storage.objects` bucket `reuniao-cliente-attachments`: policies SELECT e DELETE para super admin.

Sem mudanças de código no diálogo — ele já consulta as duas tabelas e usa `download`/`createSignedUrl`/`remove`, que passarão a retornar dados quando RLS permitir.

## Arquivos afetados

- Nova migration em `supabase/migrations/` (gerada via tool de migração) com as 8 policies.
- Nenhum arquivo de UI alterado.

## Impacto

1. **Usuário final (Super Admin):** ao abrir "Documentos reuniões" para qualquer tenant, a lista passa a popular corretamente; download individual, ZIP e exclusão funcionam.
2. **Dados:** sem mudança de schema; apenas novas policies. Sem custo de performance relevante (RLS adiciona um `OR is_super_admin(auth.uid())`). Nenhuma migração de dados.
3. **Riscos colaterais:** Super Admins ganham SELECT/DELETE em todas as linhas dessas duas tabelas e nos arquivos correspondentes do storage. É o nível de acesso esperado para o painel de Super Admin (já equivalente a outros buckets como `tenant-boletos`, `processo-documentos`).
4. **Quem é afetado:** apenas Super Admins ganham capacidade extra. Tenants comuns continuam isolados pelas policies existentes — nenhuma policy é removida ou afrouxada.

## Validação

- Após a migration, abrir SOLVENZA → "Documentos reuniões": deve mostrar 20 em "Reuniões" e 1 em "Dossiê do Cliente".
- Baixar 1 arquivo individual e gerar ZIP de "tudo".
- Apagar 1 arquivo de teste e confirmar que some do storage e da tabela.
- Abrir um tenant sem arquivos (cordeiro/harles/oliveira) → deve continuar exibindo "Nenhum arquivo".
- Logar como usuário comum de outro tenant e confirmar que o isolamento permanece (não vê arquivos de SOLVENZA).
