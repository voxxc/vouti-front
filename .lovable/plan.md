

# Plano: Expandir Configurações com Menu Lateral Estilo Chatwoot

## Contexto

Baseado na imagem de referência do Chatwoot, você quer replicar a estrutura de sidebar de configurações com os seguintes itens:

| Item do Chatwoot | Adaptação para Vouti.Bot |
|-----------------|-------------------------|
| Conta | Conta (configurações da conta do tenant) |
| **Agentes** | **Agentes** (usuários que podem atender + suas configurações Z-API) |
| Times | Times (grupos de agentes) |
| Caixas de Entrada | Caixas de Entrada (instâncias WhatsApp) |
| Etiquetas | Etiquetas (para organizar conversas) |
| Atributos | Atributos (campos personalizados) |
| Kanban CRM | Kanban CRM (já existe) |
| Automação | Automação (já existe parcialmente) |
| N8N | Integrações N8N |
| Bots | Bots / Agente IA (já existe) |
| Typebot Bot | Typebot Bot |
| Macros | Macros (respostas rápidas) |
| Respostas Prontas | Respostas Prontas |
| Aplicações | Aplicações (integrações) |
| Integrações | Integrações externas |
| Permissões | Permissões de acesso |

---

## Arquitetura Proposta

### 1. Nova Estrutura de Navegação

Transformar as "Configurações" em uma **seção completa** com sidebar própria, similar ao Chatwoot:

```text
┌────────────────────────────────────────────────────────────────────┐
│  WHATSAPP LAYOUT                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────┐  ┌──────────────────────────────────────────────┐│
│  │ Sidebar     │  │                                              ││
│  │ Principal   │  │         CONTEÚDO                             ││
│  │             │  │                                              ││
│  │ - Inbox     │  │   (quando "Configurações" selecionado)       ││
│  │ - Conversas │  │   ┌───────────┬───────────────────────────┐  ││
│  │ - Kanban    │  │   │ Sub-menu  │    Conteúdo da seção      │  ││
│  │ - Contatos  │  │   │           │                           │  ││
│  │ - ...       │  │   │ • Conta   │    Ex: Configurações      │  ││
│  │ - Config ▼  │  │   │ • Agentes │    do Agente selecionado  │  ││
│  │             │  │   │ • Times   │                           │  ││
│  └─────────────┘  │   │ • ...     │                           │  ││
│                   │   └───────────┴───────────────────────────┘  ││
│                   └──────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/components/WhatsApp/settings/WhatsAppSettingsLayout.tsx` | Layout com sidebar de configurações |
| `src/components/WhatsApp/settings/WhatsAppSettingsSidebar.tsx` | Sidebar com os itens de menu |
| `src/components/WhatsApp/settings/WhatsAppAccountSettings.tsx` | Configurações da Conta |
| `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` | Gerenciamento de Agentes |
| `src/components/WhatsApp/settings/WhatsAppTeamsSettings.tsx` | Gerenciamento de Times |
| `src/components/WhatsApp/settings/WhatsAppInboxSettings.tsx` | Caixas de Entrada |
| `src/components/WhatsApp/settings/WhatsAppLabelsSettings.tsx` | Etiquetas |
| `src/components/WhatsApp/settings/WhatsAppAttributesSettings.tsx` | Atributos |
| `src/components/WhatsApp/settings/WhatsAppAutomationSettings.tsx` | Automação |
| `src/components/WhatsApp/settings/WhatsAppN8NSettings.tsx` | Integrações N8N |
| `src/components/WhatsApp/settings/WhatsAppTypebotSettings.tsx` | Typebot |
| `src/components/WhatsApp/settings/WhatsAppMacrosSettings.tsx` | Macros |
| `src/components/WhatsApp/settings/WhatsAppCannedResponses.tsx` | Respostas Prontas |
| `src/components/WhatsApp/settings/WhatsAppAppsSettings.tsx` | Aplicações |
| `src/components/WhatsApp/settings/WhatsAppIntegrationsSettings.tsx` | Integrações |
| `src/components/WhatsApp/settings/WhatsAppPermissionsSettings.tsx` | Permissões |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/WhatsApp/WhatsAppLayout.tsx` | Usar novo SettingsLayout quando seção = settings |
| `src/components/WhatsApp/WhatsAppSidebar.tsx` | Simplificar dropdown para apenas "Configurações" |

---

## Estrutura do WhatsAppSettingsSidebar

```typescript
const settingsMenuItems = [
  { id: "account", label: "Conta", icon: User },
  { id: "agents", label: "Agentes", icon: Users2 },
  { id: "teams", label: "Times", icon: UsersRound },
  { id: "inboxes", label: "Caixas de Entrada", icon: Inbox },
  { id: "labels", label: "Etiquetas", icon: Tag },
  { id: "attributes", label: "Atributos", icon: Sliders },
  { id: "kanban", label: "Kanban CRM", icon: Columns3 },
  { id: "automation", label: "Automação", icon: Zap },
  { id: "n8n", label: "N8N", icon: Workflow },
  { id: "bots", label: "Bots", icon: Bot },
  { id: "typebot", label: "Typebot Bot", icon: MessageSquare },
  { id: "macros", label: "Macros", icon: FileText },
  { id: "canned", label: "Respostas Prontas", icon: MessageCircle },
  { id: "apps", label: "Aplicações", icon: AppWindow },
  { id: "integrations", label: "Integrações", icon: Plug },
  { id: "permissions", label: "Permissões", icon: Shield },
];
```

---

## Funcionalidade Principal: Agentes

A seção "Agentes" será a mais importante inicialmente:

### Listagem de Agentes
- Mostrar todos os usuários do tenant (via `profiles` + `user_roles`)
- Exibir avatar, nome, email, role, status de verificação
- Botão "Adicionar Agente" (reutilizar lógica de criar usuários)

### Configurações por Agente (cada agente pode ter)
- **Sua própria instância Z-API** (credenciais separadas)
- Permissões específicas de WhatsApp
- Status (ativo/inativo)

### Estrutura de Dados (se necessário)
Para suportar múltiplas instâncias Z-API por agente, a tabela `whatsapp_instances` já tem `user_id`, então cada agente pode ter sua própria configuração.

---

## Implementação em Fases

### Fase 1: Estrutura Base
1. Criar `WhatsAppSettingsLayout.tsx` com sidebar
2. Criar `WhatsAppSettingsSidebar.tsx` com menu
3. Criar componentes placeholder para cada seção
4. Integrar com `WhatsAppLayout.tsx`

### Fase 2: Seção Agentes
1. Implementar listagem de agentes do tenant
2. Criar tela de detalhes do agente com suas configurações Z-API
3. Permitir que cada agente tenha sua própria instância

### Fase 3: Outras Seções
1. Implementar cada seção conforme necessidade

---

## Resultado Esperado

Ao clicar em "Configurações" na sidebar principal:

1. Abre layout com **sub-sidebar** à esquerda (como Chatwoot)
2. Lista de seções: Conta, Agentes, Times, etc.
3. Ao clicar em "Agentes" → lista de agentes do tenant
4. Ao clicar em um agente → suas configurações individuais (incluindo Z-API próprio)

