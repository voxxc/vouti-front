

## Plano: Aba de Segurança no Super Admin + Hotfixes Identificados

### O que será criado

Uma nova aba **"Segurança"** no painel Super Admin com uma lista de hotfixes de segurança. Cada item terá:
- Nível de severidade (Crítico, Alto, Médio, Info)
- Título e descrição do problema
- Status (Pendente / Concluído)
- Data de identificação e data de conclusão
- Botão para você marcar como "Concluído"

Os dados serão armazenados na tabela `super_admin_security_hotfixes` no Supabase, acessível apenas por Super Admins.

---

### Arquivos a criar/editar

1. **Migração SQL** - Criar tabela `super_admin_security_hotfixes` com RLS restrito a super admins
2. **`src/components/SuperAdmin/SuperAdminSecurity.tsx`** - Componente da aba com listagem, filtros por severidade/status, e botão de marcar concluído
3. **`src/pages/SuperAdmin.tsx`** - Adicionar a aba "Segurança" ao TabsList (grid-cols-12)

### Estrutura da tabela

```sql
create table super_admin_security_hotfixes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  severity text not null check (severity in ('critical','high','medium','info')),
  status text not null default 'pending' check (status in ('pending','done')),
  category text, -- 'rls','storage','edge_function','xss','auth','realtime'
  affected_resource text, -- tabela, bucket ou função afetada
  identified_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  notes text,
  created_at timestamptz default now()
);
```

RLS: apenas super admins (via `is_super_admin(auth.uid())`).

### Hotfixes que serão alimentados (13 findings)

**CRÍTICOS (6):**
1. **password_reset_codes sem RLS** - Códigos de reset e emails acessíveis publicamente
2. **processo-documentos (Storage)** - Documentos jurídicos legíveis por qualquer usuário autenticado, sem verificação de tenant
3. **comprovantes-pagamento (Storage)** - Comprovantes de pagamento acessíveis cross-tenant
4. **financial-documents (Storage)** - Documentos financeiros legíveis cross-tenant
5. **reuniao-attachments (Storage)** - Arquivos de reunião legíveis sem autenticação (público)
6. **batink_profiles público** - Perfis de funcionários legíveis sem autenticação

**ALTOS (2):**
7. **task-attachments (Storage)** - Anexos de tarefas acessíveis por colaboradores de qualquer projeto
8. **Edge Function sem auth: judit-cofre-credenciais** - Aceita CPF/senha sem validar JWT do usuário
9. **Edge Function sem auth: save-zapi-config** - Aceita tokens de API sem validar JWT

**MÉDIOS (4):**
10. **dangerouslySetInnerHTML sem sanitização** - `StraightToPointView.tsx` e `SectionViewer.tsx` renderizam HTML do banco sem DOMPurify
11. **Realtime sem RLS** - Qualquer usuário autenticado pode assinar qualquer canal Realtime
12. **planejador-chat-files público** - Arquivos de chat internos acessíveis sem autenticação
13. **batink_user_roles público** - Roles de admin visíveis sem autenticação

**INFO (2):**
14. **RLS habilitado sem políticas** - Tabelas com RLS ativado mas sem políticas definidas
15. **Leaked password protection desabilitada** - Proteção contra senhas vazadas desativada no Supabase Auth

### Detalhe técnico

- O componente exibirá cards agrupados por severidade com badges coloridas (vermelho=critical, laranja=high, amarelo=medium, azul=info)
- Filtro por status: "Todos", "Pendentes", "Concluídos"
- Ao clicar "Marcar como concluído", grava `status='done'`, `resolved_at=now()`, `resolved_by=user_id`
- O INSERT inicial dos 15 hotfixes será feito na migração SQL via seed

