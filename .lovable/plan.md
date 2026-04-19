

## Fase 4.3 — CRM (Inbox + Conversas + Tickets)

### Causa raiz / Justificativa

Penúltima sub-fase pendente. O CRM (WhatsApp) é o módulo mais complexo visualmente: tem topbar próprio, sidebar de seções, lista de conversas (inbox), thread de mensagens (chat), painel de tickets e drawers de detalhes. Tudo ainda com visual pré-Apple.

### Exploração necessária

Vou ler antes de aplicar:
- `src/components/WhatsApp/components/CRMTopbar.tsx` (já visto — base do header)
- `src/components/WhatsApp/WhatsAppDrawer.tsx` e/ou `WhatsAppInbox.tsx`
- `src/components/WhatsApp/WhatsAppAllConversations.tsx`
- Componentes de mensagem: `MessageBubble`, `MessageThread`, `MessageInput` (ou nomes equivalentes)
- Painel de tickets: `TicketsPanel` / `TicketCard`
- Lista de conversas: `ConversationList` / `ConversationItem`

### O que vai mudar

**1. Topbar do CRM**
- Já tem boa estrutura. Refinar: aplicar `glass-surface` no header (efeito blur sutil), tipografia do logo mantida, busca com `rounded-xl` e ícone refinado.

**2. Sidebar de seções (Inbox, Tickets, Projetos, etc.)**
- Items com `apple-list-item` (rounded-xl, hover suave).
- Item ativo: `bg-primary/10 text-primary` (não chapado).
- Ícones em containers tintados sutis.
- Badge de contador como pílula `rounded-full`.

**3. Lista de conversas (Inbox)**
- Cards de conversa com `rounded-xl`, hover elevado sutil.
- Avatar com ring sutil, nome em `font-medium tracking-tight`.
- Última mensagem com `text-muted-foreground text-sm`.
- Badge de não-lidas como pílula `bg-primary text-primary-foreground rounded-full`.
- Timestamp discreto, `text-xs`.
- Divisores leves entre items (`border-border/40`).
- Conversa selecionada: `bg-primary/5` com indicador lateral.

**4. Thread de mensagens (chat principal)**
- Header da conversa com `glass-surface` (consistente com outros drawers).
- Bolhas de mensagem estilo iMessage:
  - Recebida: `bg-muted rounded-2xl` (cantos arredondados, ponta inferior-esquerda menor).
  - Enviada: `bg-primary text-primary-foreground rounded-2xl` (ponta inferior-direita menor).
  - Mídia (imagens/áudio): `rounded-xl` com sombra sutil.
- Timestamp e status (entregue/lido) discretos abaixo da bolha.
- Input de mensagem: `glass-surface` no container, textarea com `rounded-xl`, botão de enviar refinado.

**5. Painel de tickets**
- Tabs (5 abas conforme memory `ticket-management-lifecycle-and-tabs`) com `apple-segmented`.
- Cards de ticket com `rounded-xl`, badges de prioridade/status como pílulas tintadas.
- Empty state com `apple-empty`.

**6. Drawers e modais (transferência, detalhes do contato, AI config)**
- Headers com `glass-surface` + tipografia `apple-h1`.
- Já herdam Dialog refinado da Fase 2.

**7. Quick search e notificações**
- `CRMQuickSearch`: input com `rounded-xl`, dropdown de resultados estilo Apple Spotlight.
- `CRMNotificationsBell`: dropdown com items refinados.

### Arquivos afetados (estimativa, vou confirmar lendo o diretório)

- `src/components/WhatsApp/components/CRMTopbar.tsx`
- `src/components/WhatsApp/components/CRMSidebar.tsx` (ou nome similar)
- `src/components/WhatsApp/WhatsAppInbox.tsx`
- `src/components/WhatsApp/WhatsAppAllConversations.tsx`
- `src/components/WhatsApp/components/ConversationList.tsx` (ou similar)
- `src/components/WhatsApp/components/MessageBubble.tsx` / `MessageThread.tsx`
- `src/components/WhatsApp/components/MessageInput.tsx`
- `src/components/WhatsApp/components/TicketsPanel.tsx` (ou similar)
- `src/components/WhatsApp/components/CRMQuickSearch.tsx`
- `src/components/WhatsApp/components/CRMNotificationsBell.tsx`

### Impacto

- **UX**: CRM fica visualmente coeso com os demais módulos refinados. Thread de mensagens com aparência iMessage/WhatsApp moderno. Inbox mais legível e arejado. Tickets com hierarquia clara.
- **Dados**: zero mudanças. Toda a lógica crítica fica intacta:
  - Roteamento e atribuição de mensagens (memory `message-routing-and-attribution-standard`).
  - Normalização de telefone (memory `crm-phone-normalization-enforcement`).
  - Real-time via signals (memory `real-time-sync-architecture`).
  - Acesso a histórico (memory `conversation-history-access-and-routing`).
  - Tickets lifecycle (memory `ticket-management-lifecycle-and-tabs`).
  - Multi-provider AI/API (memories `ai-multi-provider-routing-standard`, `api-integration-standards-v2`).
- **Performance**: imperceptível (só CSS). RPCs de paginação (memory `crm-performance-pagination-rpc`) não afetadas.
- **Riscos colaterais**:
  - Realtime atualiza cards de conversa frequentemente — vou garantir que transições CSS sejam suaves e não causem flicker.
  - Bolhas de mensagem têm muita variação (texto, imagem, áudio, documento, citação) — vou refinar mantendo todas as variantes funcionais.
  - Mobile (390px): inbox vira tela cheia ao selecionar conversa — preservar esse comportamento.
- **Quem é afetado**: usuários do CRM standalone (`crm.vouti.co/:tenant`) e do CRM integrado dentro do sistema jurídico. Veridicto/VoTech: não afetados.

### Validação

1. `/solvenza/crm` (integrado) e `crm.vouti.co/solvenza` (standalone) → topbar, sidebar, inbox e thread refinados.
2. Selecionar conversa → bolhas estilo iMessage, header com glass.
3. Enviar mensagem → input refinado, animação suave.
4. Abrir painel de tickets → 5 abas com `apple-segmented`, cards refinados.
5. Quick search e notificações → dropdowns Apple-style.
6. Realtime: nova mensagem chegando atualiza inbox sem flicker.
7. Mobile (390px): inbox → conversa funciona normal.
8. Dark mode → contraste ok em todas as bolhas e estados.
9. Outros módulos (Dashboard, Agenda, Financeiro, Planejador) → zero regressão.

### Próximo passo após aprovação

1. Listar `src/components/WhatsApp/` pra mapear arquivos exatos.
2. Aplicar refinamentos em ordem: Topbar → Sidebar → Inbox → Thread/Bolhas → Input → Tickets → Drawers/Search/Notificações.
3. Validar visualmente. Depois sigo pra **Fase 4.6 — Polimento final** (Bot Workflow, Auth, Settings — última sub-fase).

