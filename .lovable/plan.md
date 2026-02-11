

## Rebranding Vouti.Bot para Vouti.CRM + Transferencia de Conversa entre Agentes

Este plano cobre duas grandes entregas: (1) renomear o modulo de "Vouti.Bot" para "Vouti.CRM" e mudar a rota de `/bot` para `/crm`, e (2) implementar a funcionalidade de transferencia de conversa entre agentes com notificacao.

---

### 1. Rebranding: Vouti.Bot para Vouti.CRM

Todas as referencias textuais "Vouti.Bot" serao substituidas por "Vouti.CRM", e a rota `/:tenant/bot` passara a ser `/:tenant/crm`.

| Arquivo | Mudanca |
|---|---|
| `src/App.tsx` | Rota `/:tenant/bot` muda para `/:tenant/crm`; `/super-admin/bot` muda para `/super-admin/crm` |
| `src/components/Dashboard/DashboardSidebar.tsx` | Label "Vouti.Bot" para "Vouti.CRM", rota `/bot` para `/crm` |
| `src/components/WhatsApp/WhatsAppSidebar.tsx` | Texto "Vouti.Bot" para "Vouti.CRM" |
| `src/components/WhatsApp/WhatsAppDrawer.tsx` | SheetTitle "Vouti.Bot" para "Vouti.CRM" |
| `src/components/WhatsApp/WhatsAppAccessGranted.tsx` | Textos "Vouti.Bot" para "Vouti.CRM" |
| `src/components/WhatsApp/WhatsAppAccessDenied.tsx` | Textos "Vouti.Bot" para "Vouti.CRM" |
| `src/components/WhatsApp/settings/AddAgentDialog.tsx` | Texto "Vouti.Bot" para "Vouti.CRM" |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppSidebar.tsx` | Texto "Vouti.Bot" para "Vouti.CRM" |
| `src/components/SuperAdmin/TenantCard.tsx` | Textos e titles "Vouti.Bot" para "Vouti.CRM" |
| `src/components/CRM/CRMContent.tsx` | Rota `/bot` para `/crm` |
| `src/pages/CRM.tsx` | Rota `/bot` para `/crm` |
| `src/components/SuperAdmin/SuperAdminLeads.tsx` | Rota `/super-admin/bot` para `/super-admin/crm` |

---

### 2. Transferencia de Conversa entre Agentes

Nova funcionalidade no painel "Acoes da Conversa" do `ContactInfoPanel`.

**Fluxo completo:**

1. Na secao "Acoes da Conversa", um novo botao "Atribuir a outro Agente" aparece
2. Ao clicar, abre um dropdown/select com a lista de agentes ativos do tenant (exceto o agente atual)
3. O usuario seleciona o agente destino e confirma via AlertDialog
4. Ao confirmar:
   - Uma mensagem automatica e enviada ao cliente via WhatsApp: "*{NomeAgenteAtual}*: Voce esta sendo transferido para o Atendente {NomeNovoAgente}"
   - Todas as mensagens do contato (`whatsapp_messages`) sao atualizadas de `agent_id = antigo` para `agent_id = novo`
   - O card do Kanban (`whatsapp_conversation_kanban`) e movido: deleta do antigo agente e insere no "Topo de Funil" do novo agente
   - Uma notificacao e criada para o novo agente no sistema de notificacoes
5. A conversa desaparece da Inbox e Kanban do agente atual e aparece na do novo agente

**Detalhes tecnicos:**

**Arquivo: `src/components/WhatsApp/components/ContactInfoPanel.tsx`**

Adicionar:
- Props: `currentAgentId`, `currentAgentName`, `tenantId`, `onTransferComplete`
- Estado para lista de agentes, agente selecionado, dialogo de confirmacao
- Query para buscar agentes ativos do tenant (exceto o atual)
- Funcao `handleTransferConversation` que:

```typescript
// 1. Enviar mensagem de transferencia via WhatsApp
await supabase.functions.invoke("whatsapp-send-message", {
  body: {
    phone: conversation.contactNumber,
    message: `Voce esta sendo transferido para o Atendente ${targetAgentName}`,
    messageType: "text",
    agentName: currentAgentName,
    agentId: currentAgentId
  }
});

// 2. Reatribuir mensagens ao novo agente
await supabase
  .from("whatsapp_messages")
  .update({ agent_id: targetAgentId })
  .eq("from_number", conversation.contactNumber)
  .eq("agent_id", currentAgentId);

// 3. Mover Kanban card
await supabase
  .from("whatsapp_conversation_kanban")
  .delete()
  .eq("phone", conversation.contactNumber)
  .eq("agent_id", currentAgentId);

// Buscar primeira coluna do novo agente
const { data: cols } = await supabase
  .from("whatsapp_kanban_columns")
  .select("id")
  .eq("agent_id", targetAgentId)
  .order("column_order", { ascending: true })
  .limit(1);

await supabase
  .from("whatsapp_conversation_kanban")
  .insert({
    tenant_id: tenantId,
    agent_id: targetAgentId,
    phone: conversation.contactNumber,
    column_id: cols[0].id,
    card_order: 0,
  });

// 4. Buscar user_id do agente destino para notificacao
const { data: targetAgent } = await supabase
  .from("whatsapp_agents")
  .select("user_id, email")
  .eq("id", targetAgentId)
  .single();

// Buscar user_id pelo email se nao tiver user_id direto
let targetUserId = targetAgent?.user_id;
if (!targetUserId && targetAgent?.email) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", targetAgent.email)
    .eq("tenant_id", tenantId)
    .single();
  targetUserId = profile?.user_id;
}

// 5. Criar notificacao
if (targetUserId) {
  await supabase.from("notifications").insert({
    user_id: targetUserId,
    tenant_id: tenantId,
    type: "conversation_transferred",
    title: "Nova conversa transferida",
    content: `${currentAgentName} transferiu a conversa com ${conversation.contactName} para voce.`,
    triggered_by_user_id: currentUserId,
  });
}
```

**Arquivo: `src/components/WhatsApp/sections/WhatsAppInbox.tsx`**

Passar as novas props ao `ContactInfoPanel`:
```
currentAgentId={myAgentId}
currentAgentName={myAgentName}
onTransferComplete={() => {
  setSelectedConversation(null);
  loadConversations();
}}
```

**Arquivo: `src/components/WhatsApp/sections/WhatsAppKanban.tsx`**

Passar as mesmas props quando o ContactInfoPanel e renderizado no Kanban.

**Arquivo: `src/hooks/useNotifications.ts`**

Adicionar `'conversation_transferred'` ao tipo da interface `Notification` para suportar o novo tipo.

**Arquivo: `src/components/Communication/NotificationCenter.tsx`**

Tratar o clique na notificacao de tipo `conversation_transferred` para navegar ate o CRM e abrir a conversa. Sera adicionado um handler que, ao clicar, navega para `/:tenant/crm` (o drawer do CRM abrira com a Inbox).

---

### Resumo visual do fluxo de transferencia

1. Agente A abre conversa com Lead X
2. Clica em "Atribuir a outro Agente" nas acoes
3. Seleciona "Agente B" no dropdown
4. Confirma no dialogo
5. Mensagem automatica: "*Agente A*: Voce esta sendo transferido para o Atendente Agente B"
6. Conversa sai do Inbox/Kanban de A, aparece no de B
7. Agente B recebe notificacao: "Agente A transferiu a conversa com Lead X para voce"
8. Agente B clica na notificacao e a conversa abre

