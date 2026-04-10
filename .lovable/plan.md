

## Plano: Criar plataforma VoTech (`/votech`)

### Objetivo
Criar um sistema isolado "VoTech" em `/votech` — uma plataforma de controle financeiro pessoal/empresarial com tela de login completa. Seguir o mesmo padrão dos sistemas isolados existentes (Metal, Batink, SPN).

### Estrutura a criar

#### 1. Banco de dados (migração SQL)
- Tabela `votech_profiles` (user_id, email, full_name, avatar_url, empresa, cargo, timestamps)
- Tabela `votech_user_roles` com enum `votech_role` ('admin', 'usuario', 'contador')
- Função `has_votech_role()` (SECURITY DEFINER)
- RLS em ambas as tabelas
- Trigger para auto-criar perfil via `handle_new_user` (padrão `@votech.local`)

#### 2. Tipos (`src/types/votech.ts`)
- `VotechRole`, `VotechProfile`, `VotechUserRole`

#### 3. Contexto de Auth (`src/contexts/VotechAuthContext.tsx`)
- `VotechAuthProvider`, `useVotechAuth`
- Login/signup com email `@votech.local`
- Gerenciamento de sessão, perfil e role

#### 4. Página de Login (`src/pages/VotechAuth.tsx`)
- Design premium escuro com gradiente (consistente com a identidade Vouti)
- Tabs Login / Cadastro
- Campos: login/email, senha, nome completo (cadastro), empresa (cadastro)
- Ícone/logo VoTech com identidade visual de fintech (DollarSign ou similar)
- Subtítulo: "Plataforma de Controle Financeiro"
- Indicadores visuais decorativos (cards de "resumo financeiro" como background art)

#### 5. Página Dashboard placeholder (`src/pages/VotechDashboard.tsx`)
- Tela inicial com cards resumo (receitas, despesas, saldo, investimentos)
- Sidebar com menu de navegação
- Placeholder funcional para futuras features

#### 6. Rotas no App.tsx
- `/votech` → redirect para `/votech/auth`
- `/votech/auth` → VotechAuth (com VotechAuthProvider + PublicRoute guard)
- `/votech/dashboard` → VotechDashboard (com VotechAuthProvider + ProtectedRoute guard)

### Arquivos a criar
- `supabase/migrations/xxx_create_votech_tables.sql`
- `src/types/votech.ts`
- `src/contexts/VotechAuthContext.tsx`
- `src/pages/VotechAuth.tsx`
- `src/pages/VotechDashboard.tsx`

### Arquivos a editar
- `src/App.tsx` (lazy imports + rotas)

### Design da tela de Login
- Fundo escuro com gradiente azul/roxo (identidade fintech)
- Card central com glassmorphism sutil
- Logo "VoTech" estilizado com ícone de gráfico/finanças
- Tabs "Entrar" / "Criar conta"
- Campos com labels brancos e inputs claros
- Botão primário com gradiente
- Elementos decorativos laterais (mini cards com valores fictícios de receita/despesa)

