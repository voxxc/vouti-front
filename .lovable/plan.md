

## Reformulação da seção Push-Docs na Controladoria

### Situação atual
- A aba "Push-Doc" na página Controladoria renderiza `CNPJManager`, que usa a tabela `cnpjs_cadastrados` e só suporta CNPJ
- Já existe o hook `useTenantPushDocs` que opera na tabela `push_docs_cadastrados` e suporta CPF, CNPJ e OAB
- Já existe o `TenantPushDocsDialog` (Super Admin) com UI de abas CPF/CNPJ/OAB — serve como referência visual

### Plano

**1. Criar componente `src/components/Controladoria/PushDocsManager.tsx`**
- Componente novo que substitui `CNPJManager` na aba Push-Doc
- Usa `useTenantPushDocs(tenantId)` do hook existente (obtendo tenantId do `useAuth`)
- Layout com 3 sub-abas: CPF (User icon), CNPJ (Building2 icon), OAB (Scale icon) — com contadores
- Botão "Cadastrar" contextual por aba ativa
- Cada documento listado em card com: documento formatado, descrição, status badge, botões pausar/reativar/deletar
- Seção inferior: "Processos Recebidos" com listagem dos `push_docs_processos`
- Dialogs: cadastrar novo documento, confirmar exclusão
- Respeitar permissão admin (só admin cadastra/remove)

**2. Atualizar `src/pages/Controladoria.tsx`**
- Trocar import de `CNPJManager` por `PushDocsManager`
- Na aba `push-doc`, renderizar `<PushDocsManager />` em vez de `<CNPJManager />`

**3. Sem mudanças de banco/edge functions**
- O hook `useTenantPushDocs` e as edge functions `judit-push-docs-cadastrar`, `judit-push-docs-toggle` já suportam CPF/CNPJ/OAB
- A edge function `judit-push-docs-cadastrar` exige super_admin — será necessário ajustar para permitir admins do tenant também

**4. Ajustar edge function `judit-push-docs-cadastrar`**
- Remover verificação exclusiva de `super_admins`
- Permitir que usuários com role `admin` no tenant também cadastrem documentos
- Validar que o tenantId do request corresponde ao tenant do usuário

