
Objetivo: corrigir o CRM do tenant **/demorais** para que as conversas mostrem mensagens atuais sem precisar refresh.

Diagnóstico confirmado:
- O problema principal está em `loadMessages` (Inbox/All/Label/SuperAdmin): as queries em `whatsapp_messages` usam `order("created_at", { ascending: true })` sem paginação.
- O Supabase aplica limite padrão de **1000 linhas** por request.
- Para a conversa da Laura (`5545999180026`) existem **3425** mensagens. A linha 1000 termina exatamente em **“Acabei de receber boleto da copel”**, por isso a UI para “ali” e parece desatualizada.

Plano de implementação:
1. Criar um carregamento paginado de histórico de mensagens (sem limite de 1000)
- Em vez de 1 query única, buscar em páginas com `.range(offset, offset + 999)` até retornar menos de 1000 itens.
- Manter ordenação cronológica para não quebrar o ChatPanel.
- Aplicar os mesmos filtros atuais (tenant, agent, shared access, variante de telefone).

2. Aplicar a correção em todos os pontos que carregam histórico
- `src/components/WhatsApp/sections/WhatsAppInbox.tsx`
- `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx`
- `src/components/WhatsApp/sections/WhatsAppLabelConversations.tsx`
- `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx`
Assim, nenhuma tela de conversa ficará “presa” nas primeiras 1000 mensagens.

3. Garantir atualização em tempo real sem regressão
- Manter o fluxo atual de `useWhatsAppSync`.
- Com a paginação, quando chegar sinal (`message_received`/`message_sent`), o recarregamento passará a refletir a mensagem real mais recente (sem exigir refresh da página).

4. Validação focada em /demorais
- Abrir a conversa da Laura e confirmar que a última mensagem exibida é a mais recente do banco (não mais “acabei de receber boleto da copel”).
- Enviar/receber nova mensagem e validar atualização automática no chat e no preview da lista.
- Validar que conversas aceitas do Daniel continuam na aba correta (“Abertas”).

Detalhes técnicos (resumo):
- Causa raiz: limite default de 1000 registros do Supabase.
- Estratégia: paginação por `range` + merge de páginas até completar o histórico.
- Sem necessidade de migration SQL para este ajuste (apenas frontend).
