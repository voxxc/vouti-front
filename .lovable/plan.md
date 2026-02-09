

## Plano: Sistema de Controle de Acesso ao Vouti.Bot para Tenants

### Resumo Executivo

Implementar um sistema de autenticação e autorização específico para o Vouti.Bot, onde:
1. **Administradores do Tenant** têm acesso automático ao Vouti.Bot (sem precisar de cadastro como agente)
2. Dentro do Vouti.Bot, o admin libera acesso para outros usuários/colaboradores
3. Usuários não autorizados verão uma tela informando que não possuem permissão

---

### Fluxo de Acesso

```text
USUÁRIO ACESSA /:tenant/bot
              │
              ▼
    ┌─────────────────────────┐
    │  WhatsAppAccessGate     │
    │  Verifica:              │
    │  1. É admin do tenant?  │
    │  2. É agente cadastrado?│
    └───────────┬─────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
    ▼                       ▼
É ADMIN OU AGENTE?      NÃO AUTORIZADO
    │                       │
    ▼                       ▼
┌───────────────┐    ┌──────────────────┐
│ Tela: Acesso  │    │ Tela: Sem        │
│ Liberado      │    │ Permissão        │
│               │    │                  │
│ [Continuar]   │    │ "Solicite ao     │
│      │        │    │  administrador"  │
│      ▼        │    └──────────────────┘
│ WhatsAppLayout│
└───────────────┘
```

---

### Fluxo do Administrador

```text
ADMIN DO TENANT
      │
      ▼
┌──────────────────────────────────────┐
│  Acessa /:tenant/bot                 │
│                                       │
│  Sistema detecta: É ADMIN            │
│  → Acesso automático liberado        │
└───────────────────┬──────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  DENTRO DO VOUTI.BOT                 │
│                                       │
│  Configurações > Agentes             │
│                                       │
│  [+ Adicionar Agente]                │
│  - Nome: João                         │
│  - Email: joao@escritorio.com        │
│  - Função: Atendente                  │
│                                       │
│  → João agora tem acesso!            │
└──────────────────────────────────────┘
```

---

### Componentes Envolvidos

| Componente | Ação |
|------------|------|
| **Banco de dados** | Adicionar `email` na tabela `whatsapp_agents` |
| **Banco de dados** | Criar tabela de roles `whatsapp_agent_roles` |
| **Banco de dados** | Função RPC que verifica admin OU agente cadastrado |
| **AddAgentDialog.tsx** | Adicionar campo de email obrigatório |
| **WhatsApp.tsx** | Criar lógica de verificação de acesso (Gate) |
| **Nova tela** | `WhatsAppAccessDenied.tsx` - Tela de sem permissão |
| **Nova tela** | `WhatsAppAccessGranted.tsx` - Tela de acesso liberado |

---

### Etapa 1: Migração do Banco de Dados

```sql
-- 1. Adicionar email à tabela whatsapp_agents
ALTER TABLE public.whatsapp_agents
ADD COLUMN email TEXT DEFAULT NULL;

-- 2. Criar enum para roles do Vouti.Bot
CREATE TYPE public.whatsapp_agent_role AS ENUM ('admin', 'atendente');

-- 3. Criar tabela de roles (separada, conforme boas práticas de segurança)
CREATE TABLE public.whatsapp_agent_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.whatsapp_agents(id) ON DELETE CASCADE,
  role whatsapp_agent_role NOT NULL DEFAULT 'atendente',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, role)
);

-- 4. RLS para whatsapp_agent_roles
ALTER TABLE public.whatsapp_agent_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view agent roles"
ON public.whatsapp_agent_roles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_agents wa
    WHERE wa.id = agent_id
    AND wa.tenant_id = get_user_tenant_id()
  )
);

CREATE POLICY "Admins can manage agent roles"
ON public.whatsapp_agent_roles FOR ALL
TO authenticated
USING (
  is_admin_or_controller_in_tenant()
  AND EXISTS (
    SELECT 1 FROM whatsapp_agents wa
    WHERE wa.id = agent_id
    AND wa.tenant_id = get_user_tenant_id()
  )
);

-- 5. Função para verificar se usuário tem acesso ao Vouti.Bot
-- IMPORTANTE: Admin do tenant TEM ACESSO AUTOMÁTICO
CREATE OR REPLACE FUNCTION public.has_whatsapp_bot_access(
  _user_email TEXT,
  _tenant_id UUID
)
RETURNS TABLE (
  has_access BOOLEAN,
  access_type TEXT,  -- 'admin' ou 'agent'
  agent_id UUID,
  agent_name TEXT,
  agent_role whatsapp_agent_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Primeiro verifica se é admin/controller do tenant (acesso automático)
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE p.email = _user_email
      AND ur.tenant_id = _tenant_id
      AND ur.role IN ('admin', 'controller')
  ) THEN
    RETURN QUERY SELECT 
      TRUE as has_access,
      'admin'::TEXT as access_type,
      NULL::UUID as agent_id,
      'Administrador'::TEXT as agent_name,
      'admin'::whatsapp_agent_role as agent_role;
    RETURN;
  END IF;

  -- Se não é admin, verifica se é agente cadastrado
  RETURN QUERY
  SELECT 
    TRUE as has_access,
    'agent'::TEXT as access_type,
    wa.id as agent_id,
    wa.name as agent_name,
    COALESCE(war.role, 'atendente'::whatsapp_agent_role) as agent_role
  FROM whatsapp_agents wa
  LEFT JOIN whatsapp_agent_roles war ON war.agent_id = wa.id
  WHERE wa.email = _user_email
    AND wa.tenant_id = _tenant_id
    AND wa.is_active = TRUE
  LIMIT 1;
END;
$$;

-- 6. Índice para performance
CREATE INDEX idx_whatsapp_agents_email_tenant 
ON public.whatsapp_agents(email, tenant_id) 
WHERE email IS NOT NULL;
```

---

### Etapa 2: Atualizar AddAgentDialog

Modificar o diálogo de criação de agentes para incluir campo de email obrigatório:

```tsx
// Campos no formulário
const [email, setEmail] = useState("");

// Validação
if (!email.trim() || !email.includes('@')) {
  toast.error("Informe um email válido");
  return;
}

// Insert com email
const { data: newAgent, error } = await supabase
  .from("whatsapp_agents")
  .insert({
    tenant_id: tenantId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    is_active: true,
  })
  .select()
  .single();

// Criar role na tabela separada
if (newAgent) {
  await supabase
    .from("whatsapp_agent_roles")
    .insert({
      agent_id: newAgent.id,
      role: role === 'admin' ? 'admin' : 'atendente'
    });
}
```

---

### Etapa 3: Componente WhatsAppAccessGate

Criar `src/components/WhatsApp/WhatsAppAccessGate.tsx`:

```tsx
interface AccessStatus {
  checking: boolean;
  hasAccess: boolean;
  accessType?: 'admin' | 'agent';
  agentId?: string;
  agentName?: string;
  agentRole?: 'admin' | 'atendente';
}

const WhatsAppAccessGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const [status, setStatus] = useState<AccessStatus>({ checking: true, hasAccess: false });
  const [showGate, setShowGate] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [user, tenantId]);

  const checkAccess = async () => {
    if (!user?.email || !tenantId) {
      setStatus({ checking: false, hasAccess: false });
      return;
    }

    const { data } = await supabase.rpc('has_whatsapp_bot_access', {
      _user_email: user.email,
      _tenant_id: tenantId
    });

    if (data && data.length > 0 && data[0].has_access) {
      setStatus({
        checking: false,
        hasAccess: true,
        accessType: data[0].access_type,
        agentId: data[0].agent_id,
        agentName: data[0].agent_name,
        agentRole: data[0].agent_role
      });
    } else {
      setStatus({ checking: false, hasAccess: false });
    }
  };

  if (status.checking) {
    return <LoadingScreen />;
  }

  if (!status.hasAccess) {
    return <WhatsAppAccessDenied userEmail={user?.email} />;
  }

  if (showGate) {
    return (
      <WhatsAppAccessGranted 
        agentName={status.agentName}
        agentRole={status.agentRole}
        accessType={status.accessType}
        onContinue={() => setShowGate(false)}
      />
    );
  }

  return <>{children}</>;
};
```

---

### Etapa 4: Tela de Sem Permissão

`src/components/WhatsApp/WhatsAppAccessDenied.tsx`:

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│            🔒  Acesso Restrito                          │
│                                                         │
│   Você não possui permissão para acessar o Vouti.Bot   │
│                                                         │
│   Para obter acesso, solicite ao administrador do      │
│   seu escritório que cadastre seu email como agente    │
│   autorizado nas configurações do Vouti.Bot.           │
│                                                         │
│   Email atual: joao@escritorio.com                      │
│                                                         │
│                    [← Voltar]                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Etapa 5: Tela de Acesso Liberado

`src/components/WhatsApp/WhatsAppAccessGranted.tsx`:

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│            ✅  Acesso Autorizado                        │
│                                                         │
│   Você está conectado como:                             │
│                                                         │
│   Nome: Daniel                                          │
│   Função: Administrador                                 │
│                                                         │
│   Você possui acesso liberado ao Vouti.Bot              │
│                                                         │
│               [Acessar Vouti.Bot →]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Etapa 6: Atualizar WhatsApp.tsx

```tsx
const WhatsApp = () => {
  const { tenantId } = useTenantId();
  const { isWhatsAppEnabled } = useTenantFeatures();

  if (!isWhatsAppEnabled) {
    return <WhatsAppDisabledScreen />;
  }

  return (
    <WhatsAppAccessGate>
      <WhatsAppLayout />
    </WhatsAppAccessGate>
  );
};
```

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `Nova migração SQL` | Adicionar email, criar tabela de roles, função RPC |
| `src/components/WhatsApp/settings/AddAgentDialog.tsx` | Adicionar campo email obrigatório |
| `src/components/WhatsApp/WhatsAppAccessGate.tsx` | **NOVO** - Componente gate |
| `src/components/WhatsApp/WhatsAppAccessDenied.tsx` | **NOVO** - Tela sem permissão |
| `src/components/WhatsApp/WhatsAppAccessGranted.tsx` | **NOVO** - Tela acesso liberado |
| `src/pages/WhatsApp.tsx` | Integrar WhatsAppAccessGate |

---

### Resumo dos Níveis de Acesso

| Tipo de Usuário | Acesso ao Vouti.Bot | Como obtém acesso |
|-----------------|---------------------|-------------------|
| **Admin do Tenant** | ✅ Automático | Por ser admin/controller |
| **Agente cadastrado** | ✅ Liberado | Admin cadastra no Vouti.Bot |
| **Usuário comum** | ❌ Negado | Precisa ser cadastrado |

---

### Perfis do Vouti.Bot

| Perfil | Descrição | Diferenças Futuras |
|--------|-----------|-------------------|
| **Admin** | Acesso total (automático para admins do tenant) | Gerenciar agentes, configurações, relatórios |
| **Atendente** | Acesso para atendimento | Apenas inbox e respostas |

Inicialmente, ambos verão a mesma interface. A diferenciação será implementada gradualmente.

---

### Benefícios

| Aspecto | Benefício |
|---------|-----------|
| **Segurança** | Apenas autorizados acessam o Vouti.Bot |
| **Praticidade** | Admin do tenant tem acesso automático |
| **Controle** | Liberação é feita DENTRO do Vouti.Bot |
| **Rastreabilidade** | Cada agente identificado por email |
| **Escalabilidade** | Estrutura pronta para permissões granulares |

