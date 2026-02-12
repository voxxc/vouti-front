

## Revisao Geral do Vouti.CRM - Diagnostico e Correcoes

Apos analise detalhada de todos os componentes, edge functions, RLS policies e fluxos do Vouti.CRM, identifiquei os seguintes problemas organizados por criticidade.

---

### PROBLEMAS CRITICOS (Isolamento Multi-Tenant)

#### 1. whatsapp-send-message: Nao suporta envio por instancia especifica (Transfer)

O `TransferConversationDialog.tsx` envia `instanceId`, `instanceToken` e `clientToken` no body ao fazer "Transferir (outra instancia)". Porem, a Edge Function `whatsapp-send-message` **ignora completamente esses campos** - ela sempre resolve a instancia pelo `tenant_id` do JWT ou fallback para env vars.

**Impacto**: A funcao "Transferir para outro Agente (outra instancia)" NAO FUNCIONA. A mensagem sempre sai pela mesma instancia.

**Correcao**: Modificar `whatsapp-send-message` para aceitar `instanceId`, `instanceToken`, `clientToken` como parametros opcionais e usa-los quando presentes (bypass da resolucao automatica).

#### 2. whatsapp_messages SELECT: Policy "Admins can view all whatsapp messages" sem filtro de tenant

```
qual: has_role(auth.uid(), 'admin'::app_role)
```

A funcao `has_role` verifica a role SEM filtrar por tenant_id. Isso significa que um admin do Tenant A pode ver TODAS as mensagens de TODOS os tenants.

**Correcao**: Substituir por `is_admin_or_controller_in_tenant()` ou adicionar `AND tenant_id = get_user_tenant_id()`.

#### 3. whatsapp_automations: Policy "Admins can manage all whatsapp automations" sem filtro de tenant

Mesmo problema: `has_role(auth.uid(), 'admin')` sem isolamento por tenant.

**Correcao**: Substituir por politica com `tenant_id = get_user_tenant_id()`.

#### 4. whatsapp_instances: Policy "Admins can manage all whatsapp instances" sem filtro de tenant

```
qual: has_role(auth.uid(), 'admin'::app_role)
```

Admin de qualquer tenant pode gerenciar instancias de todos os tenants.

**Correcao**: Adicionar `AND tenant_id = get_user_tenant_id()` ou substituir pela funcao `is_admin_or_controller_in_tenant()`.

#### 5. whatsapp_messages INSERT: Multiplas policies permissivas sem with_check

Existem 4 INSERT policies (`service_insert`, `System can insert`, `Users can create`, `tenant_insert`) todas sem `with_check`. Isso permite que qualquer usuario autenticado insira mensagens em qualquer tenant.

**Correcao**: Consolidar em uma unica policy com `with_check: (tenant_id = get_user_tenant_id())` e manter uma sem restricao para service role (edge functions).

#### 6. whatsapp_contacts INSERT: Policy sem with_check de tenant

```
policyname: whatsapp_contacts_tenant_insert, with_check: null
```

Qualquer usuario pode inserir contatos em qualquer tenant.

**Correcao**: Adicionar `with_check: (tenant_id = get_user_tenant_id())`.

#### 7. whatsapp_instances INSERT: 3 policies permissivas sem with_check

Mesmo problema das mensagens - sem validacao de tenant na insercao.

---

### PROBLEMAS FUNCIONAIS

#### 8. whatsapp-send-message: Pega apenas 1 instancia (`.limit(1).single()`)

Quando um tenant tem multiplos agentes com instancias diferentes, a funcao pega a PRIMEIRA instancia encontrada, nao a do agente que esta enviando. O `agentId` e passado no body mas NAO e usado para filtrar a instancia.

**Correcao**: Filtrar por `agent_id` quando presente no body: `if (agentId) instanceQuery = instanceQuery.eq('agent_id', agentId)`.

#### 9. Webhook IA imediata (sem debounce): Nao prefixa com nome do agente IA

Na funcao `handleAIResponse` (linhas 568-576 do webhook), a resposta `aiData.response` e salva diretamente sem prefixo de `agent_name`. Apenas o debounce aplica o prefixo.

**Correcao**: Aplicar a mesma logica de prefixo do debounce na resposta imediata do webhook.

#### 10. whatsapp_conversation_kanban: Policies duplicadas

Existem duas SELECT policies:
- `whatsapp_conversation_kanban_tenant_all` (ALL)
- `whatsapp_conversation_kanban_tenant_select` (SELECT)

A policy ALL ja cobre SELECT, causando duplicacao desnecessaria.

**Correcao**: Remover a policy SELECT redundante.

#### 11. whatsapp_instances: Policies duplicadas

Existem policies conflitantes para SELECT, UPDATE e DELETE (ex: `tenant_select` + `whatsapp_instances_tenant_select`, `tenant_delete` + `whatsapp_instances_tenant_delete`). A `whatsapp_instances_tenant_select` inclui `OR user_id = auth.uid()` que pode vazar dados entre tenants.

**Correcao**: Consolidar em policies unicas com `tenant_id = get_user_tenant_id()`.

---

### PROBLEMAS MENORES

#### 12. WhatsAppContacts: loadContacts nao filtra por tenant quando nao e super admin e nao tem tenantId

Se `tenantId` for null e `isSuperAdmin` for false, o `useEffect` nao carrega nada (correto). Porem, o estado initial `isSuperAdmin = false` pode causar um flash antes de resolver.

#### 13. AllConversations: Nao aplica nome de contato do whatsapp_contacts

Diferente do Inbox e Kanban, `WhatsAppAllConversations` nao faz JOIN com `whatsapp_contacts` para resolver nomes. Contatos salvos aparecem apenas como numeros de telefone.

#### 14. WhatsAppContext: Verifica role sem filtro de tenant_id

```typescript
.in("role", ["admin", "controller"]);
// Sem .eq("tenant_id", tenantId)
```

Um usuario admin no Tenant A seria reconhecido como admin no Tenant B.

**Correcao**: Adicionar `.eq("tenant_id", tenantId)` na query.

---

### PARA NOVOS TENANTS - O QUE FUNCIONA vs NAO FUNCIONA

| Funcionalidade | Status | Motivo |
|---|---|---|
| Access Gate (login no CRM) | OK | Usa RPC `has_whatsapp_bot_access` com tenant_id |
| Criar agentes | OK | RLS com `tenant_id = get_user_tenant_id()` |
| Conectar Z-API | OK | Isolado por tenant_id e agent_id |
| Enviar mensagens manuais | PARCIAL | Funciona mas usa instancia errada em multi-agente |
| Receber mensagens (webhook) | OK | Resolve tenant via instanceId |
| Kanban drag-and-drop | OK | Fix recente aplicado |
| Caixa de Entrada | OK | Filtrada por agent_id |
| Todas as Conversas | OK (isolamento) | Nomes nao resolvidos |
| IA agente | OK (debounce) / BUG (imediata) | Prefixo so no debounce |
| Transferir (outra instancia) | NAO FUNCIONA | send-message ignora credenciais |
| Contatos | OK | RLS isolada por tenant |
| Etiquetas | OK | RLS isolada por tenant |
| Notas | VERIFICAR | Depende de tabela de notas |

---

### PLANO DE CORRECAO

**Etapa 1 - Critico (RLS)**
1. Remover/substituir policies com `has_role` sem tenant filter em `whatsapp_messages`, `whatsapp_automations`, `whatsapp_instances`
2. Adicionar `with_check` de tenant nas INSERT policies de `whatsapp_messages`, `whatsapp_contacts`, `whatsapp_instances`
3. Limpar policies duplicadas em `whatsapp_instances` e `whatsapp_conversation_kanban`

**Etapa 2 - Funcional**
4. Modificar `whatsapp-send-message` para aceitar credenciais explicitas e filtrar por `agent_id`
5. Adicionar prefixo de nome IA na resposta imediata do webhook (nao-debounce)
6. Corrigir `WhatsAppContext` para filtrar role por tenant_id
7. Resolver nomes de contato em `WhatsAppAllConversations`

**Etapa 3 - Limpeza**
8. Consolidar INSERT policies redundantes
9. Remover SELECT duplicada do kanban

### Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| Migration SQL | ~15 policies RLS para corrigir/criar/remover |
| `supabase/functions/whatsapp-send-message/index.ts` | Aceitar credenciais explicitas + filtrar por agent_id |
| `supabase/functions/whatsapp-webhook/index.ts` | Prefixar nome IA na resposta imediata |
| `src/components/WhatsApp/context/WhatsAppContext.tsx` | Filtrar role por tenant_id |
| `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx` | Resolver nomes de contato |

