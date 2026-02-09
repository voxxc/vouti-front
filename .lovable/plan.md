## Plano: Sistema de Controle de Acesso ao Vouti.Bot para Tenants

### ✅ Status: IMPLEMENTADO

---

### Resumo

Sistema de autenticação e autorização para o Vouti.Bot onde:
1. **Administradores do Tenant** têm acesso automático (sem cadastro como agente)
2. Dentro do Vouti.Bot, o admin cadastra agentes com email para liberar acesso
3. Usuários não autorizados veem tela de acesso restrito

---

### Componentes Implementados

| Componente | Status |
|------------|--------|
| Coluna `email` em `whatsapp_agents` | ✅ |
| Tabela `whatsapp_agent_roles` | ✅ |
| Função RPC `has_whatsapp_bot_access` | ✅ |
| `WhatsAppAccessGate.tsx` | ✅ |
| `WhatsAppAccessDenied.tsx` | ✅ |
| `WhatsAppAccessGranted.tsx` | ✅ |
| `AddAgentDialog.tsx` com email | ✅ |
| `WhatsApp.tsx` com gate | ✅ |

---

### Níveis de Acesso

| Tipo de Usuário | Acesso | Como obtém |
|-----------------|--------|------------|
| Admin do Tenant | ✅ Automático | role admin/controller |
| Agente cadastrado | ✅ Liberado | Admin cadastra email |
| Usuário comum | ❌ Negado | Precisa ser cadastrado |

---

### Perfis do Vouti.Bot

| Perfil | Descrição |
|--------|-----------|
| **Admin** | Acesso total (automático para admins) |
| **Atendente** | Acesso para atendimento |


