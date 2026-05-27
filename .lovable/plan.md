## Causa raiz

Hoje a credencial Judit é identificada apenas pelo par técnico `system_name` + `customer_key` (ex.: `TJSP — alanpjero`). Não existe um rótulo amigável (apelido/nome) que o usuário possa usar depois para escolher a credencial certa na hora de importar um processo por CNJ. Além disso, o diálogo de importação expõe o nome "Judit", que deve ser ocultado.

## Correção

### 1. Banco — novo campo `apelido` em `credenciais_judit`
- Adicionar coluna `apelido text` (nullable) em `public.credenciais_judit`.
- Atualizar a RPC `list_judit_credentials` para devolver também `apelido`.
- Criar RPC `update_judit_credential_apelido(p_id uuid, p_apelido text)` com checagem de `tenant_id` via `has_role_in_tenant` (admin/controller), respeitando o padrão de isolamento multi-tenant.

### 2. Cadastro da credencial (Envio Direto / Enviar Pendente)
Em `TenantCredenciaisDialog.tsx`, nas abas "Envio Direto" e "Enviar Pendente":
- Adicionar campo obrigatório **"Apelido da credencial"** (ex.: "PJE TJRO — Dr. Alan"), com placeholder explicando que esse é o rótulo que aparecerá ao importar processos.
- Persistir `apelido` no insert em `credenciais_judit` (mantém `customer_key` técnico inalterado).

### 3. Novo botão "Cartão Credencial" no card do tenant
Em `TenantCard.tsx` (linha de "INTEGRAÇÕES", ao lado de "Credenciais Judit", "Chamadas Judit", "Pagamentos"):
- Adicionar botão **"Cartão Credencial"** (ícone `IdCard`) que abre um novo dialog `CartaoCredencialDialog`.
- O dialog lista todas as credenciais ativas do tenant em formato de tabela: `Apelido` (editável inline) · `Sistema` · `Customer key` (somente leitura, fonte mono) · `Status`.
- Edição inline do apelido chama a RPC `update_judit_credential_apelido` e invalida os queries `tenant-credenciais-judit` e `judit-system-names`.

### 4. Importar Processo por CNJ
Em `ImportarProcessoCNJDialog.tsx`:
- Renomear o label "Tribunal / Credencial Judit" → **"Tribunal / Credencial"**.
- Alterar a opção "Público (sem credencial)" → **"Público"** (manter a nota explicativa abaixo se já existe).
- Atualizar o tipo `JuditCredencial` em `useJuditSystemNames.ts` para incluir `apelido`.
- Trocar a label das opções do `<Select>` para:
  - Se `apelido` existir: `{apelido} — {system_name}`
  - Senão (fallback): `{system_name} — {customer_key}` (comportamento atual)

## Arquivos afetados

- `supabase/migrations/<timestamp>_credenciais_judit_apelido.sql` (nova migration)
- `src/integrations/supabase/types.ts` (regenerado pela migration)
- `src/hooks/useJuditSystemNames.ts` (tipo + retorno)
- `src/hooks/useTenantCredenciais.ts` (insert com `apelido`, mutation `atualizarApelido`)
- `src/components/SuperAdmin/TenantCredenciaisDialog.tsx` (campo apelido nas abas de envio)
- `src/components/SuperAdmin/CartaoCredencialDialog.tsx` (novo)
- `src/components/SuperAdmin/TenantCard.tsx` (novo botão "Cartão Credencial")
- `src/components/SuperAdmin/TenantRowMobile.tsx` e `TenantRow.tsx` (mesmo botão, para paridade)
- `src/components/Controladoria/ImportarProcessoCNJDialog.tsx` (label sem "Judit", opção pelo apelido)

## Impacto

1. **Usuário final (UX)**
   - Ao cadastrar uma credencial, passa a informar um apelido legível (obrigatório). Sem apelido, o botão "Enviar para Cofre" fica desabilitado.
   - Novo botão "Cartão Credencial" no card do tenant permite revisar e renomear credenciais já cadastradas (edição inline).
   - No dialog "Importar Processo por CNJ" o select agora mostra o apelido amigável (ex.: "PJE TJRO — TJRO") em vez do customer_key técnico, e a palavra "Judit" some do label e da opção "Público".

2. **Dados**
   - Migration aditiva: nova coluna `apelido text` nullable em `credenciais_judit` — credenciais existentes continuam funcionando com fallback para `system_name — customer_key`.
   - Nova RPC `update_judit_credential_apelido` com `SECURITY DEFINER` validando role no tenant. `GRANT EXECUTE ... TO authenticated`.
   - Sem mudança em RLS de outras tabelas; sem impacto em performance (campo simples, sem índice necessário).

3. **Riscos colaterais**
   - Painéis que já mostram `system_name — customer_key` (RebindCredencialJuditPanel, abas Deletar/Histórico) continuam exibindo o dado técnico — não é alterado para não quebrar o fluxo de deleção, que precisa do customer_key real.
   - Importações antigas (sem apelido) continuam funcionando via fallback no Select.

4. **Quem é afetado**
   - **Super admin**: ganha o botão "Cartão Credencial" e o campo apelido no envio.
   - **Admin do tenant / advogado**: vê os apelidos no dialog de importar processo. Nenhum impacto em outros tenants (isolamento por `tenant_id`).
   - **Edge functions Judit**: nenhuma — `apelido` é metadado interno, não vai para o cofre Judit.

## Validação

- Migration aplica sem erro e `apelido` aparece em `credenciais_judit`.
- Cadastrar credencial nova com apelido "PJE TJRO" → aparece em "Cartão Credencial" e no Select de importar CNJ.
- Renomear apelido em "Cartão Credencial" → invalida cache e o Select atualiza.
- Credencial antiga (sem apelido) ainda aparece no Select com o fallback técnico.
- Dialog "Importar Processo por CNJ" não contém mais a palavra "Judit".