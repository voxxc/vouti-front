

## Macros em Tempo Real + Emoji Picker com Historico

### 1. Macros: Polling + Exibicao no Painel de Conversa

**Problema atual:** A secao "Macros" no ContactInfoPanel (painel direito) mostra botoes hardcoded (`/saudacao`, `/preco`). Precisa carregar macros reais do banco com polling de 2s, e ao clicar em uma macro, exibir um mini drawer de confirmacao acima da barra de digitar.

**Arquivos afetados:**

**`src/components/WhatsApp/components/ContactInfoPanel.tsx`**
- Substituir o conteudo hardcoded da secao `macros` (linhas 331-345)
- Adicionar estado para macros do agente: `agentMacros`
- Adicionar `useEffect` com polling de 2 segundos que busca macros ativas do agente (`whatsapp_macros` where `agent_id = currentAgentId` and `is_active = true`)
- Cada macro aparece como um botao com o shortcut e nome
- Ao clicar em uma macro, chamar callback `onMacroSelect(macro)` passado como prop

**`src/components/WhatsApp/components/ChatPanel.tsx`**
- Adicionar nova prop `macros` (lista de macros do agente) e `agentId` (para buscar macros)
- Adicionar estado `selectedMacro` para controlar o mini drawer
- Criar componente inline `MacroConfirmPanel`:
  - Aparece acima da barra de input (entre a area de mensagens e o input)
  - Mostra o nome da macro, o texto processado (com variaveis substituidas), e dois botoes: "Cancelar" e "Enviar"
  - Ao confirmar, processa as variaveis (`{{nome}}` -> nome do contato, `{{telefone}}` -> numero, `{{saudacao}}` -> resultado de `getGreeting()`)
  - Chama `onSendMessage` com o texto final e fecha o painel
- Buscar macros do agente com polling de 2s diretamente no ChatPanel (ou receber via props do WhatsAppInbox)

**`src/components/WhatsApp/sections/WhatsAppInbox.tsx`**
- Adicionar estado `agentMacros` com polling de 2 segundos buscando da tabela `whatsapp_macros`
- Passar macros como props para o ChatPanel e ContactInfoPanel
- Ao clicar na macro no ContactInfoPanel, acionar estado no ChatPanel para mostrar o mini drawer de confirmacao

**Fluxo:**
1. Agente abre conversa -> painel direito mostra secao "Macros" com macros reais do banco
2. Agente clica em uma macro -> mini drawer aparece acima da barra de input
3. Mini drawer mostra texto processado com variaveis substituidas
4. Agente clica "Enviar" -> mensagem enviada, mini drawer fecha
5. Agente clica "Cancelar" -> mini drawer fecha

### 2. Emoji Picker Funcional com Historico por Agente

**Nova tabela SQL (migracao):**

```sql
CREATE TABLE whatsapp_emoji_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  agent_id UUID REFERENCES whatsapp_agents(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  use_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, emoji)
);

ALTER TABLE whatsapp_emoji_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_emoji_history" ON whatsapp_emoji_history
  FOR ALL USING (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);
```

**`src/components/WhatsApp/components/EmojiPicker.tsx`** (novo arquivo)
- Componente de emoji picker customizado (sem dependencia externa)
- Categorias: Recentes (historico do agente), Smileys, Gestos, Animais, Comida, Viagem, Atividades, Objetos, Simbolos
- Cada categoria com emojis unicode nativos
- Secao "Recentes" no topo: busca os 20 emojis mais usados pelo agente (ordenados por `use_count DESC`)
- Ao clicar num emoji:
  - Insere no campo de texto (callback `onEmojiSelect`)
  - Faz upsert na `whatsapp_emoji_history` (incrementa `use_count` ou insere novo)
- Campo de busca para filtrar emojis
- Renderiza como Popover ancorado no botao de emoji

**`src/components/WhatsApp/components/ChatPanel.tsx`**
- Importar `EmojiPicker`
- Substituir o botao `Smile` (linha 478) por um `Popover` com trigger no botao e content com o `EmojiPicker`
- Ao selecionar emoji, inserir no `newMessage` na posicao do cursor
- Passar `agentId` e `tenantId` para o EmojiPicker gravar historico

### Detalhes tecnicos - Resumo

**Migracao SQL:** Criar tabela `whatsapp_emoji_history`

**Arquivos novos:**
- `src/components/WhatsApp/components/EmojiPicker.tsx`

**Arquivos editados:**
1. `ChatPanel.tsx` -- macro confirm panel acima do input, emoji popover funcional
2. `ContactInfoPanel.tsx` -- secao macros com dados reais do banco + polling
3. `WhatsAppInbox.tsx` -- estado de macros com polling 2s, passar props para ChatPanel e ContactInfoPanel

**Processamento de variaveis da macro (client-side):**
- `{{nome}}` -> `conversation.contactName`
- `{{telefone}}` -> `conversation.contactNumber`
- `{{email}}` -> `conversation.contactNumber + "@whatsapp.com"` (ou do contato salvo)
- `{{saudacao}}` -> `getGreeting()` do `greetingHelper.ts` (ja usa fuso de Brasilia)

