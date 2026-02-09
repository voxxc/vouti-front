
## Corrigir botao "Novo Usuario" no drawer de gerenciamento de usuarios

### Problema

No painel do tenant (ex: `/solvenza/dashboard`), ao abrir o drawer de "Usuarios" e clicar em "Novo Usuario", nada acontece. O botao esta conectado a uma funcao (`handleAddUser`) que apenas recarrega a lista de usuarios -- nao abre nenhum formulario de criacao.

A logica de criacao de usuario existe no componente antigo `UserManagement.tsx`, mas o drawer (`UserManagementDrawer.tsx`) que substituiu a interface nao inclui essa funcionalidade.

### Solucao

Adicionar um dialog de criacao de usuario diretamente dentro do `UserManagementDrawer.tsx`, reutilizando a mesma logica de criacao que existe no `UserManagement.tsx` (chamada a edge function `create-user`).

### Alteracoes

**Arquivo:** `src/components/Admin/UserManagementDrawer.tsx`

1. Adicionar estados para controlar o dialog de criacao e o formulario (nome, email, senha, perfil, permissoes adicionais)
2. Adicionar um Dialog de criacao com campos: Nome, Email, Senha, Perfil (select), Permissoes Adicionais (checkboxes)
3. No `handleCreateSubmit`, chamar a edge function `create-user` com os dados do formulario e o `tenantId`
4. Apos sucesso, chamar `onAddUser()` para recarregar a lista e fechar o dialog
5. Integrar verificacao de limite de plano via `usePlanoLimites()` para desabilitar o botao quando o limite for atingido

### Detalhes tecnicos

- Reutilizar a mesma chamada `supabase.functions.invoke('create-user', { body: { email, password, full_name, role, additional_roles, tenant_id } })`
- Usar o hook `usePlanoLimites()` ja existente para verificar `podeAdicionarUsuario`
- Mostrar `LimiteAlert` quando o limite estiver proximo ou atingido
- O formulario de criacao sera um `Dialog` separado do dialog de edicao ja existente
- Campos obrigatorios: nome, email, senha (min 6 chars), perfil
- Permissoes adicionais: mesmos checkboxes do formulario de edicao (Agenda, Clientes, Financeiro, Controladoria, Reunioes)
