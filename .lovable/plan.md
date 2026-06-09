## Causa raiz

Os buckets `reuniao-attachments` e `reuniao-cliente-attachments` são privados e a policy de SELECT em `storage.objects` exige que `auth.uid()::text = (storage.foldername(name))[1]`, ou seja: **só o próprio autor do upload consegue baixar o arquivo**.

Como o upload grava o caminho como `{uploader_id}/{reuniao_id}/...`, qualquer outro usuário do mesmo tenant (advogado, admin, comercial) que clicar em "Baixar" recebe 400/403 do Storage → cai no `catch` → toast "Erro ao baixar arquivo". Para o usuário, o clique simplesmente "não baixa".

No bucket `reuniao-cliente-attachments` há uma exceção parcial para admin (`has_role_in_tenant(... 'admin' ...)`), mas qualquer não-admin do mesmo tenant continua bloqueado. No bucket `reuniao-attachments` (arquivos vinculados à reunião) **nem o admin consegue**.

## Correção

Migration ajustando as duas policies de SELECT do `storage.objects` para autorizar download a qualquer usuário do **mesmo tenant** do arquivo:

- **`reuniao-attachments`** → permite SELECT quando existe `reuniao_arquivos` com `file_path = name` e `tenant_id = get_user_tenant_id()`.
- **`reuniao-cliente-attachments`** → permite SELECT quando existe `reuniao_cliente_arquivos` com `file_path = name` e `tenant_id = get_user_tenant_id()` (mantém o caso do uploader e do admin como fallback).

O prefixo `{uploader_id}/` continua intacto — não muda upload, delete, listagem nem o front-end.

## Arquivos afetados
- `supabase/migrations/<novo>.sql` (DROP + CREATE das duas policies de SELECT em `storage.objects`)

## Impacto

**Usuário final (UX/telas/fluxos):**
- Botão "Baixar" nos anexos de Reuniões (aba de arquivos da reunião e aba de arquivos do lead/cliente) passa a funcionar para todos do mesmo tenant — não só para quem subiu.
- Antes: clique não fazia nada visível (toast de erro silenciado/instável) — relato do usuário.
- Visualização da listagem dos anexos no banco já funcionava (RLS em `reuniao_arquivos` por tenant) — só o Storage estava bloqueando.

**Dados (migrations/RLS/performance):**
- Sem mudança de schema, sem GRANT novo. Apenas substitui 2 policies em `storage.objects`.
- Cada download passa a fazer um lookup leve (`select 1 from reuniao_(cliente_)arquivos where file_path = name and tenant_id = ...`). Indexação em `file_path` é desejável; se não existir, custo é desprezível dado o volume.

**Riscos colaterais:**
- Amplia leitura do arquivo de "apenas o uploader" para "qualquer usuário do mesmo tenant". É o comportamento esperado para anexos de reuniões/leads compartilhados internamente. Sem vazamento entre tenants — o filtro `tenant_id = get_user_tenant_id()` é estrito.
- Upload, delete e listagem permanecem inalterados.

**Quem é afetado:**
- Todos os usuários autenticados de todos os tenants que recebem ou enviam anexos em Reuniões e em Leads (Fabieli, demais comerciais, admins, advogados). Nenhum impacto em outros módulos/buckets.

## Validação
1. Aplicar migration → conferir que apenas as duas policies de SELECT foram trocadas.
2. Logar como usuário B do mesmo tenant que subiu o arquivo (usuário A) → abrir a reunião/lead → clicar "Baixar" → download dispara e arquivo abre.
3. Logar como usuário de outro tenant → não consegue baixar (verificação de isolamento).
4. Confirmar que upload, exclusão e visualização continuam funcionando normalmente.