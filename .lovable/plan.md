# Corrigir erro ao admin trocar o próprio email

## Causa raiz
Quando um admin (ex: Jari) edita o **próprio** usuário no drawer "Gestão de Usuários" e altera o email:

1. `update-user-email` chama `auth.admin.updateUserById` — sucesso, email já é gravado.
2. Como o email modificado é do próprio dono da sessão, o Supabase Auth **revoga o refresh token atual** (visto nos logs: `token_revoked` logo após o PUT 200 em `/admin/users/{id}`).
3. As chamadas seguintes do mesmo fluxo (`profiles.update`, `admin-set-user-roles`, etc.) usam o token agora inválido → retornam erro 401.
4. O `catch` mostra toast vermelho "Erro ao atualizar usuário", mesmo com o email já alterado. O admin reenvia 2-3 vezes (vide 3 PUTs no log às 20:06/20:07/20:07), achando que falhou.

Confirmado em logs: 3 PUTs `200 OK` em `/admin/users/0c02f769…` + `token_revoked` para `jarifilho@hotmail.com` no mesmo minuto.

## Correção
Em `src/components/Admin/UserManagementDrawer.tsx` (`handleEditSubmit`):

1. Detectar se o usuário sendo editado é o próprio admin logado (`editingUser.id === currentUser.id`) **e** se o email mudou.
2. Se **não for o próprio**: manter fluxo atual (todas as etapas em sequência).
3. Se **for o próprio com mudança de email**:
   - Executar primeiro **nome, roles e senha** com o token ainda válido.
   - Em seguida executar `update-user-email` por último.
   - Após sucesso, exibir toast informativo: "Email alterado. Faça login novamente com o novo endereço." e disparar `supabase.auth.signOut()` + redirecionar para `/{slug}/auth`.
4. Tornar `admin-set-user-roles` condicional: só chamar quando role primária ou roles adicionais realmente mudaram (evita 401 desnecessário em casos sem alteração de papel).

## Arquivos afetados
- `src/components/Admin/UserManagementDrawer.tsx` — reordenar etapas, detectar self-edit, fazer logout após mudança de email próprio, tornar update de roles condicional.
- `src/components/Admin/UserManagement.tsx` — mesmo ajuste, pois replica o fluxo (linhas 310-320).

## Impacto
1. **UX**: Admins que mudarem o próprio email verão mensagem clara pedindo novo login (em vez de toast de erro). Edição de outros usuários continua igual. Edição de roles só dispara quando há mudança real, reduzindo ruído.
2. **Dados**: Nenhuma migration. Comportamento da Edge Function inalterado. Reduz writes redundantes em `user_roles`.
3. **Riscos colaterais**: O logout forçado interrompe a sessão do admin — esperado e correto, já que o token foi revogado pelo Supabase. Outras sessões do mesmo admin em outros devices também precisarão de re-login (comportamento natural do Auth).
4. **Quem é afetado**: Apenas admins/controllers que editam o próprio email pelo painel de Gestão de Usuários. Todos os tenants.

## Validação
- Logar como admin Vargas → Gestão de Usuários → editar próprio perfil → trocar email → salvar.
- Esperado: toast "Email alterado. Faça login novamente." → logout automático → tela de login.
- Logar com novo email → confirmar entrada.
- Editar outro usuário (não-self) trocando email → fluxo normal, sem logout.
- Editar usuário sem alterar email/role → sem chamadas extras (verificar Network).
