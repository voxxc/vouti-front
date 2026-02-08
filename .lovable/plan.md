
# Plano: Redesign Completo do WhatsApp Bot como Página Dedicada

## Entendimento do Problema

### Problema 1: Mensagens não estão sendo enviadas
A edge function `whatsapp-process-queue` não tem logs, indicando que **nunca foi invocada**. O trigger do banco insere na fila `whatsapp_pending_messages`, mas a função precisa ser chamada para processar. Além disso, a função busca por `is_connected = true` que não existe na tabela `whatsapp_instances`.

### Problema 2: Redesign da Interface
Você quer transformar o WhatsApp Bot em uma **página dedicada** (não mais dentro das tabs do CRM), com layout similar ao print fornecido:
- Sidebar esquerda com menu
- Drawer de conversas (Caixa de Entrada)
- Painel de mensagens central
- Painel de informações do contato à direita

---

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                         /:tenant/whatsapp  (Nova Página Dedicada)                          │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────────┐  ┌────────────────────────────────────────────────────────────────────┐│
│  │   SIDEBAR       │  │                       CONTEUDO PRINCIPAL                          ││
│  │   ESQUERDA      │  │                                                                    ││
│  │                 │  │  ┌─────────────────────────────────────────────────────────────┐  ││
│  │ ◉ Caixa Entrada │  │  │  Renderizado baseado no item selecionado no sidebar:       │  ││
│  │ ○ Conversas     │  │  │                                                             │  ││
│  │ ○ Kanban CRM    │  │  │  - Caixa de Entrada: Grid de mensagens + Chat + Contato    │  ││
│  │ ○ Contatos      │  │  │  - Conversas: Lista de todas conversas ativas              │  ││
│  │ ○ Relatórios    │  │  │  - Kanban CRM: Pipeline visual de leads                    │  ││
│  │ ○ Campanhas     │  │  │  - Contatos: Lista de contatos do WhatsApp                 │  ││
│  │ ○ Central Ajuda │  │  │  - Relatórios: Métricas e gráficos                         │  ││
│  │ ○ Configurações │  │  │  - Campanhas: Mensagens em massa                           │  ││
│  │                 │  │  │  - Central Ajuda: Docs/FAQ                                 │  ││
│  │                 │  │  │  - Configurações: Z-API + Fonte de Leads                   │  ││
│  │                 │  │  └─────────────────────────────────────────────────────────────┘  ││
│  └─────────────────┘  └────────────────────────────────────────────────────────────────────┘│
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Layout da Caixa de Entrada (Principal)

Baseado no print fornecido:

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR MENU   │        LISTA CONVERSAS         │       CHAT ATIVO        │   INFO CONTATO       │
│  (w-48)         │        (w-80)                  │       (flex-1)          │   (w-80)             │
│                 │                                 │                         │                      │
│ Caixa Entrada   │ 🔵 Juliana Grupo:              │  Daniel de Morais       │  [Avatar]            │
│ Conversas       │    "Oi, Michelle..."           │  🏷️ Trafego Pago       │  Daniel De Morais    │
│ Kanban CRM      │    Nova Mensagem    [2d]       │                         │  📞 +559291276333    │
│ Contatos        │                                 │  [Histórico de msgs]   │  📧 559291@whats...  │
│ Relatórios      │ Daniel Morais:                 │                         │                      │
│ Campanhas       │    Anexo                       │  ┌─────────────────┐    │  ⚡ Habilitar Bot    │
│ Central Ajuda   │    Nova Mensagem    [5d]       │  │ Bom dia Daniel  │    │                      │
│ Configurações   │                                 │  │ Recebi a proc...│    │  [Ações da Conversa]│
│                 │ [... mais conversas]           │  └─────────────────┘    │  [Typebot Bot]       │
│                 │                                 │                         │  [Msgs Agendadas]    │
│ [User Avatar]   │                                 │  [Input de mensagem]   │  [Kanban CRM]        │
│ Daniel Solvenza │                                 │                         │  [Macros]            │
│                 │                                 │                         │  [Info Contato]      │
│                 │                                 │                         │  [Atributos]         │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementação em 5 Fases

### FASE 1: Criar Nova Página `/whatsapp`

**Nova página**: `src/pages/WhatsApp.tsx`
- Layout próprio (sem DashboardLayout)
- Sidebar fixa à esquerda
- Conteúdo dinâmico baseado no item selecionado

**Rota no App.tsx**:
```typescript
<Route path="/:tenant/whatsapp" element={
  <TenantRouteWrapper>
    <WhatsApp />
  </TenantRouteWrapper>
} />
```

### FASE 2: Criar Componentes do WhatsApp

| Componente | Descrição |
|------------|-----------|
| `WhatsAppLayout.tsx` | Container principal com sidebar |
| `WhatsAppSidebar.tsx` | Menu lateral com as 8 opções |
| `WhatsAppInbox.tsx` | Caixa de entrada (3 colunas: lista, chat, contato) |
| `WhatsAppConversations.tsx` | Lista expandida de conversas |
| `WhatsAppKanban.tsx` | Pipeline visual de leads |
| `WhatsAppContacts.tsx` | Gestão de contatos |
| `WhatsAppReports.tsx` | Relatórios e métricas |
| `WhatsAppCampaigns.tsx` | Campanhas de mensagens |
| `WhatsAppHelp.tsx` | Central de ajuda |
| `WhatsAppSettings.tsx` | Configurações Z-API + Fonte de Leads |
| `WhatsAppChatPanel.tsx` | Área de chat com histórico |
| `WhatsAppContactInfo.tsx` | Painel lateral com info do contato |

### FASE 3: Modificar CRM para Abrir Nova Janela

**Em `src/pages/CRM.tsx`**:
- Trocar tab "WhatsApp Bot" por botão que abre nova janela
- `window.open(tenantPath('/whatsapp'), '_blank')`

### FASE 4: Corrigir Edge Function de Processamento

**Problema identificado**: A função `whatsapp-process-queue` busca `is_connected = true`, mas a coluna não existe na tabela (é `connection_status`).

**Correção**:
```typescript
// Antes (incorreto)
.eq('is_connected', true)

// Depois (correto)
.eq('connection_status', 'connected')
```

### FASE 5: Criar Mecanismo de Invocação da Fila

A edge function precisa ser invocada. Opções:
1. **Supabase pg_cron** (recomendado) - trigger a cada 1 minuto
2. **Webhook externo** (ex: cron-job.org)
3. **Realtime + invocação** - quando insere na fila, chama a função

---

## Estrutura de Arquivos a Criar

```
src/
├── pages/
│   └── WhatsApp.tsx                    # Página principal
├── components/
│   └── WhatsApp/
│       ├── WhatsAppLayout.tsx          # Container principal
│       ├── WhatsAppSidebar.tsx         # Menu lateral
│       ├── sections/
│       │   ├── WhatsAppInbox.tsx       # Caixa de entrada
│       │   ├── WhatsAppConversations.tsx
│       │   ├── WhatsAppKanban.tsx
│       │   ├── WhatsAppContacts.tsx
│       │   ├── WhatsAppReports.tsx
│       │   ├── WhatsAppCampaigns.tsx
│       │   ├── WhatsAppHelp.tsx
│       │   └── WhatsAppSettings.tsx
│       └── components/
│           ├── ConversationList.tsx    # Lista de conversas
│           ├── ChatPanel.tsx           # Painel de chat
│           └── ContactInfoPanel.tsx    # Info do contato
```

---

## Menu da Sidebar

| Item | Ícone | Descrição |
|------|-------|-----------|
| Caixa de Entrada | `Inbox` | Vista principal com 3 colunas |
| Conversas | `MessageSquare` | Lista completa de conversas |
| Kanban CRM | `LayoutKanban` | Pipeline de leads WhatsApp |
| Contatos | `Users` | Gestão de contatos |
| Relatórios | `BarChart3` | Métricas e analytics |
| Campanhas | `Megaphone` | Mensagens em massa |
| Central de Ajuda | `HelpCircle` | Documentação e FAQ |
| Configurações | `Settings` | Z-API + Fonte de Leads |

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/App.tsx` | Modificar | Adicionar rota `/:tenant/whatsapp` |
| `src/pages/WhatsApp.tsx` | Criar | Nova página dedicada |
| `src/pages/CRM.tsx` | Modificar | Trocar tab por botão que abre nova janela |
| `src/components/WhatsApp/*` | Criar | Todos os componentes listados acima |
| `supabase/functions/whatsapp-process-queue/index.ts` | Modificar | Corrigir `connection_status` |
| Migração SQL | Criar | Adicionar trigger para invocar edge function |

---

## Detalhes da Caixa de Entrada

A **Caixa de Entrada** é a view principal e mais complexa. Ela terá:

**Coluna 1 - Lista de Conversas** (w-80):
- Avatar + Nome do contato
- Preview da última mensagem
- Tempo desde última mensagem
- Badge de mensagens não lidas
- Busca no topo

**Coluna 2 - Chat Ativo** (flex-1):
- Header com nome do contato + status
- Histórico de mensagens (scrollable)
- Input de mensagem com emoji, anexo, áudio
- Indicador de digitação

**Coluna 3 - Info do Contato** (w-80):
- Avatar grande
- Nome + telefone + email WhatsApp
- Toggle "Habilitar Bot"
- Accordion com:
  - Ações da conversa (resolver, transferir, etc)
  - Typebot Bot
  - Mensagens Agendadas
  - Kanban CRM (estágio do lead)
  - Macros (respostas rápidas)
  - Informação da conversa
  - Atributos do contato (Skip Evaluation, Skip Greetings, etc)

---

## Considerações Técnicas

1. **Tenant Isolation**: Todas as queries filtradas por `tenant_id`
2. **Realtime**: Subscription para novas mensagens do WhatsApp
3. **Estado Global**: Contexto para conversa selecionada
4. **Responsividade**: Mobile-first com drawer colapsável
5. **Tema**: Respeitar dark/light mode do tenant

---

## Correção do Bug de Envio de Mensagens

Além do redesign, vou corrigir:

1. **Edge Function**: Trocar `is_connected` por `connection_status = 'connected'`
2. **Campos faltantes na tabela**: A query busca `instance_id` e `token` que podem não existir - usar campos corretos
3. **Invocação automática**: Adicionar chamada periódica ou trigger

---

## Ordem de Implementação

1. Corrigir edge function `whatsapp-process-queue`
2. Criar estrutura de pastas e componentes base
3. Criar página `WhatsApp.tsx` com layout
4. Criar sidebar com navegação
5. Implementar view de Configurações (migrar do atual)
6. Implementar Caixa de Entrada (principal)
7. Modificar CRM para abrir nova janela
8. Adicionar rota no App.tsx
9. Implementar demais views (Conversas, Kanban, etc) - podem ser placeholders inicialmente
