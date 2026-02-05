
# Adicionar Criação de Admin Extra no Super Admin

## Objetivo

Permitir que o Super Admin crie administradores adicionais para qualquer tenant diretamente pelo painel de controle, através do botão "Configurar" no card de cada cliente.

---

## Solução Proposta

Transformar o botão "Configurar" em um **DropdownMenu** com duas opções:

```text
┌─────────────────────────────────────┐
│  [Configurar ▼]                     │
│  ┌─────────────────────────────────┐│
│  │ ⚙️  Editar Dados do Cliente    ││
│  │ 👤  Criar Admin Extra          ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## Arquitetura

### 1. Novo Componente: `CreateTenantAdminDialog.tsx`

Dialog para criar um novo administrador para um tenant específico:

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome Completo | Input text | Sim |
| Email | Input email | Sim |
| Senha | Input password | Sim |
| Confirmar Senha | Input password | Sim |

### 2. Nova Edge Function: `create-tenant-admin`

Endpoint que permite ao Super Admin criar um admin para qualquer tenant:

```typescript
// Verificações:
// 1. O chamador é Super Admin? ✓
// 2. O tenant existe? ✓
// 3. O email já existe? ✓

// Ações:
// 1. Criar usuário no auth.users
// 2. Criar/atualizar profile com tenant_id
// 3. Criar role 'admin' para o tenant
```

**Por que uma nova Edge Function?**
- A função `create-user` existente valida se o chamador é admin **do mesmo tenant**
- Super Admin não pertence a nenhum tenant específico
- Precisamos de uma função que valide se o chamador é **Super Admin**

### 3. Modificação no `TenantCard.tsx`

Transformar o botão simples em um DropdownMenu:

```tsx
// Antes:
<Button onClick={onEdit}>
  <Settings /> Configurar
</Button>

// Depois:
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm" className="flex-1 gap-2">
      <Settings className="h-4 w-4" />
      Configurar
      <ChevronDown className="h-3 w-3" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={onEdit}>
      <Settings className="h-4 w-4 mr-2" />
      Editar Dados do Cliente
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setShowCreateAdmin(true)}>
      <UserPlus className="h-4 w-4 mr-2" />
      Criar Admin Extra
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Interface do Dialog

```text
┌─────────────────────────────────────────────────────────────┐
│  Criar Administrador Extra                            [×]   │
│  Cliente: Solvenza                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 Dados do Novo Administrador                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Nome Completo *                                            │
│  [_____________________________________________]            │
│                                                             │
│  Email *                                                    │
│  [_____________________________________________]            │
│                                                             │
│  Senha *                                                    │
│  [_____________________________________________] [👁️]       │
│                                                             │
│  Confirmar Senha *                                          │
│  [_____________________________________________] [👁️]       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  ℹ️ Este usuário terá permissões de administrador no        │
│     sistema do cliente Solvenza.                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                        [Cancelar]  [Criar Administrador]    │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/SuperAdmin/CreateTenantAdminDialog.tsx` | Criar | Dialog para criar admin extra |
| `src/components/SuperAdmin/TenantCard.tsx` | Modificar | Transformar botão em dropdown |
| `supabase/functions/create-tenant-admin/index.ts` | Criar | Edge Function para Super Admin |

---

## Fluxo de Execução

```text
1. Super Admin clica em "Configurar" no TenantCard
           │
           ▼
2. Dropdown abre com duas opções
           │
           ├──→ "Editar Dados" → Abre EditTenantDialog (existente)
           │
           └──→ "Criar Admin Extra" → Abre CreateTenantAdminDialog
                         │
                         ▼
3. Super Admin preenche dados do novo admin
                         │
                         ▼
4. Chama Edge Function create-tenant-admin
           │
           ├──→ Valida que chamador é Super Admin
           │
           ├──→ Cria usuário no auth.users
           │
           ├──→ Atualiza profile com tenant_id
           │
           └──→ Cria role 'admin' para o tenant
                         │
                         ▼
5. Toast de sucesso + fecha dialog
```

---

## Segurança

| Verificação | Implementação |
|-------------|---------------|
| Autorização | Verificar se user_id está em `super_admins` |
| Tenant válido | Verificar se tenant existe |
| Email único | Verificar se email não está cadastrado |
| Senha forte | Mínimo 6 caracteres |
| Domínios bloqueados | Bloquear @metalsystem.local, @vouti.bio, @vlink.bio |

---

## Detalhes Técnicos

### Edge Function: `create-tenant-admin`

```typescript
// 1. Verificar Super Admin
const { data: superAdmin } = await supabaseAdmin
  .from('super_admins')
  .select('id')
  .eq('user_id', user.id)
  .maybeSingle();

if (!superAdmin) {
  return error(403, 'Only super admins can create tenant admins');
}

// 2. Verificar se tenant existe
const { data: tenant } = await supabaseAdmin
  .from('tenants')
  .select('id, name')
  .eq('id', tenant_id)
  .single();

// 3. Criar usuário
const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name }
});

// 4. Atualizar profile
await supabaseAdmin
  .from('profiles')
  .upsert({
    user_id: newUser.user.id,
    email,
    full_name,
    tenant_id
  });

// 5. Criar role admin
await supabaseAdmin
  .from('user_roles')
  .insert({
    user_id: newUser.user.id,
    role: 'admin',
    tenant_id,
    is_primary: true
  });
```

---

## Resultado Esperado

O Super Admin poderá:
1. Clicar no botão "Configurar" de qualquer tenant
2. Selecionar "Criar Admin Extra"
3. Preencher os dados do novo administrador
4. O novo admin terá acesso imediato ao sistema do cliente
