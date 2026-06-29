## Causa raiz
O `SpnMobileNav` (barra inferior no mobile) tem apenas 5 itens fixos: Home, Books, Progress, Ranking, Profile. Não há acesso às telas administrativas (`admin-users`, `admin-books`, `admin-levels`), que só aparecem no `SpnSidebar` desktop. No mobile o admin não consegue abrir "Manage Users" para cadastrar aluno.

## Correção
Expor as opções de admin no mobile, sem poluir a barra inferior de 5 ícones:

1. **`src/components/Spn/SpnMobileNav.tsx`**: quando `isAdmin` (via `useSpnAuth`), trocar o item "Profile" por um item "Menu" que abre um Sheet/Drawer com a lista completa do sidebar (incluindo Manage Users, Manage Books, Manage Levels, Settings). Para não-admin, manter "Profile" como está.
2. **Alternativa mais simples (preferida)**: adicionar um item "Admin" extra apenas quando `isAdmin === true`, que abre um Sheet com os 3 atalhos administrativos. Mantém os 5 itens atuais para o aluno.

Escolho a alternativa: menos disrupção para alunos, e admin ganha um ponto de entrada claro.

## Arquivos afetados
- `src/components/Spn/SpnMobileNav.tsx` — adicionar item condicional "Admin" + Sheet com atalhos.
- (sem mudanças em rotas, edge functions ou DB; o fluxo `spn-create-user` já existe em `AdminUsersManager`.)

## Impacto
1. **UX**: Admin no celular passa a ter botão "Admin" na barra inferior que abre painel com Users/Books/Levels. Aluno não vê diferença.
2. **Dados**: Nenhuma alteração de schema, RLS ou edge function.
3. **Riscos colaterais**: Mínimos — mudança restrita ao componente de navegação mobile do SPN. Não afeta desktop nem outros produtos.
4. **Quem é afetado**: Apenas usuários SPN com role `admin` acessando pelo mobile.

## Validação
- Logar como admin SPN no viewport mobile → ver 6º ícone "Admin" na barra inferior.
- Tocar "Admin" → Sheet abre com "Manage Users", "Manage Books", "Manage Levels".
- Tocar "Manage Users" → abre `AdminUsersManager` com formulário de criar aluno funcional.
- Logar como student → barra continua com 5 ícones originais, sem opção "Admin".
