
## Resumo: Alinhamento do Vouti.Bot entre Super Admin e Tenants

### Situação Atual

**Super Admin (`/super-admin/bot`)**
- Interface com **expansão inline**: ao clicar no card de um agente, abre um painel abaixo com **duas abas** (Conexão Z-API + Comportamento da IA)
- Sistema robusto de credenciais com campos para colar URL completa ou preencher individualmente
- Polling automático após gerar QR Code até detectar conexão
- Feedback visual de status (conectado/desconectado/verificando)
- Usa `useToast` (hook shadcn) para notificações

**Tenant (`/:tenant/bot`)**
- Interface com **drawer lateral** (Sheet): ao clicar no card, abre um drawer na direita
- **NÃO tem a aba de Comportamento da IA** no drawer de configuração
- Usa campos legados (`instance_name`, `zapi_token`) no banco em vez dos novos (`zapi_instance_id`, `zapi_instance_token`, `zapi_client_token`)
- Usa `toast` do sonner (inconsistência)

---

### O que precisa ser alinhado

1. **Interface de Agentes (principal)**
   - Substituir o `AgentConfigDrawer` (Sheet) por uma estrutura de **expansão inline com abas**, igual ao Super Admin
   - Incluir a aba "Comportamento da IA" (`WhatsAppAISettings`) dentro da configuração do agente

2. **Campos de banco de dados**
   - O drawer do tenant usa `instance_name` e `zapi_token` (campos antigos)
   - Precisa usar `zapi_instance_id`, `zapi_instance_token`, `zapi_client_token` (campos novos)

3. **Contexto de IA por agente**
   - Atualmente `WhatsAppAISettings` filtra por `tenant_id`, mas não por `agent_id`
   - Cada agente deveria poder ter seu próprio comportamento de IA (opcional, para fase futura)

4. **Consistência de UX**
   - Usar o mesmo sistema de toasts (`useToast` do shadcn)
   - Manter os mesmos textos e fluxos

---

### Arquivos que serão modificados

| Arquivo | Ação |
|---------|------|
| `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` | **Reescrever** para usar expansão inline com abas (como SuperAdmin) |
| `src/components/WhatsApp/settings/AgentConfigDrawer.tsx` | **Manter temporariamente** como fallback ou **remover** após migração |

---

### Implementação planejada

**1. Atualizar `WhatsAppAgentsSettings.tsx`**
- Importar componentes de Tabs e Cards
- Adicionar estados para: `expandedAgentId`, `activeTab`, `config`, `isConnected`, `qrCode`, etc.
- Implementar funções: `loadInstanceConfig`, `checkZAPIStatus`, `handleSaveCredentials`, `handleGenerateQRCode`, `handleDisconnect`, `handleReset`
- Renderizar grid de cards com expansão inline contendo duas abas:
  - Aba "Conexão Z-API": formulário de credenciais + ações de conexão
  - Aba "Comportamento da IA": componente `WhatsAppAISettings` (passando `isSuperAdmin={false}`)
- Usar campos corretos do banco: `zapi_instance_id`, `zapi_instance_token`, `zapi_client_token`
- Usar `useToast` para consistência

**2. Filtrar por tenant_id (já existe)**
- As queries já filtram por `tenant_id` usando o hook `useTenantId`
- Cada tenant verá apenas seus próprios agentes e instâncias

**3. Remover uso do drawer antigo**
- O componente `AddAgentDialog` continua sendo usado
- O `AgentConfigDrawer` não será mais chamado (pode ser removido depois ou mantido para referência)

---

### Resultado esperado

- Tenants terão a **mesma interface** do Super Admin
- Ao clicar em um agente, aparece um painel expansível com:
  - **Aba Conexão Z-API**: campos de credenciais, botão salvar, botões de conectar/desconectar/resetar, QR Code
  - **Aba Comportamento da IA**: configuração do agente IA (nome, prompt, modelo, temperatura)
- Cada tenant é isolado (vê apenas seus próprios agentes)
- Novos tenants começam com lista vazia

---

### Detalhes Técnicos

A nova estrutura do componente `WhatsAppAgentsSettings` será praticamente uma cópia do `SuperAdminAgentsSettings`, com as seguintes diferenças:
- Usa `tenantId` do hook `useTenantId()` em vez de `null`
- Queries filtram por `.eq("tenant_id", tenantId)` em vez de `.is("tenant_id", null)`
- Usa `AddAgentDialog` em vez de `SuperAdminAddAgentDialog`
- Passa `isSuperAdmin={false}` para `WhatsAppAISettings`
