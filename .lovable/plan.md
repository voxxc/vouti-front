

## Commander - Central de Controle WhatsApp via IA

### O que sera construido

Um numero de telefone "Commander" que, ao enviar mensagens para o bot, a IA interpreta o comando em linguagem natural e executa acoes no sistema. Para o MVP/teste, o foco sera em **criar prazos** na agenda.

### Fluxo

```text
Commander envia msg no WhatsApp
        |
        v
Webhook recebe mensagem
        |
        v
Detecta que o remetente e um "Commander"
        |
        v
Redireciona para edge function whatsapp-commander
        |
        v
IA (Lovable AI Gateway + tool calling) interpreta o comando
        |
        v
Executa a acao: criar_prazo, registrar_gasto, enviar_mensagem, etc.
        |
        v
Responde pelo WhatsApp confirmando a execucao
```

### Mudancas por arquivo

---

**1. Migration SQL - Tabela `whatsapp_commanders`**

Armazena os numeros autorizados como Commander por tenant.

Campos: `id`, `tenant_id`, `agent_id`, `phone_number`, `name`, `is_active`, `created_at`, `updated_at`

RLS: acesso por membros do tenant.

---

**2. Nova secao "Commander" no CRM - UI**

| Arquivo | Acao |
|---|---|
| `src/components/WhatsApp/WhatsAppDrawer.tsx` | Adicionar `"commander"` ao tipo `WhatsAppSection` |
| `src/components/WhatsApp/WhatsAppSidebar.tsx` | Adicionar item "Commander" no menu de configuracoes (icone `Terminal`) |
| `src/components/WhatsApp/WhatsAppLayout.tsx` | Adicionar case `"commander"` no switch e importar componente |
| `src/components/WhatsApp/settings/WhatsAppCommanderSettings.tsx` | **Novo** - Tela para cadastrar/gerenciar numeros Commander |

A tela de configuracao tera:
- Lista de numeros Commander cadastrados (nome + telefone + status)
- Botao para adicionar novo Commander
- Toggle ativar/desativar
- Lista de comandos disponiveis como referencia

---

**3. Edge Function `whatsapp-commander` (nova)**

Usa Lovable AI Gateway com tool calling. Tools disponiveis para o MVP:

| Tool | Descricao | Parametros |
|---|---|---|
| `criar_prazo` | Cria um prazo/deadline na agenda | titulo, descricao, data_vencimento, responsavel_nome, processo_numero (opcional), cliente (opcional) |

Fluxo interno:
1. Recebe telefone + mensagem do Commander
2. Busca contexto do tenant (usuarios disponiveis, processos recentes)
3. Chama Lovable AI com tools definidas
4. IA retorna `tool_calls` com parametros estruturados
5. Para `criar_prazo`: busca o user_id do responsavel pelo nome, busca processo_oab_id pelo numero, insere em `deadlines`
6. Responde pelo WhatsApp com confirmacao

Exemplo de interacao:
- Commander: "Cria um prazo para vencimento dia 10/10/2026 sobre o caso 1234456, responsavel Laura, cliente Havan, fase recursal"
- Bot: "Prazo criado! Titulo: Caso 1234456 - Cliente Havan. Vencimento: 10/10/2026. Responsavel: Laura. Fase: Recursal"

---

**4. Alteracao no `whatsapp-webhook/index.ts`**

No `handleIncomingMessage`, apos resolver o telefone e buscar a instancia, verificar se o remetente e um Commander:

```text
// Apos buscar instance e effectiveTenantId:
// 1. SELECT de whatsapp_commanders WHERE phone_number = phone AND tenant_id AND is_active
// 2. Se encontrar: chamar whatsapp-commander edge function
// 3. Retornar sem processar como mensagem normal
```

A mensagem do Commander **nao sera salva** como mensagem de conversa normal - sera processada e descartada (ou salva em log separado).

---

**5. `supabase/config.toml`**

Adicionar entrada para a nova edge function:
```toml
[functions.whatsapp-commander]
verify_jwt = false
```

---

### Resumo de arquivos

| Arquivo | Tipo | Acao |
|---|---|---|
| Migration SQL | DB | Criar tabela `whatsapp_commanders` com RLS |
| `src/components/WhatsApp/WhatsAppDrawer.tsx` | Frontend | Adicionar tipo "commander" |
| `src/components/WhatsApp/WhatsAppSidebar.tsx` | Frontend | Adicionar item no menu settings |
| `src/components/WhatsApp/WhatsAppLayout.tsx` | Frontend | Adicionar case no switch |
| `src/components/WhatsApp/settings/WhatsAppCommanderSettings.tsx` | Frontend | **Novo** - UI de configuracao |
| `supabase/functions/whatsapp-commander/index.ts` | Backend | **Novo** - IA com tool calling |
| `supabase/functions/whatsapp-webhook/index.ts` | Backend | Interceptar mensagens de Commander |
| `supabase/config.toml` | Config | Registrar nova edge function |

### Escopo do teste

Para o teste inicial, a tool `criar_prazo` fara:
1. Buscar responsavel pelo nome (fuzzy match na tabela `profiles` do tenant)
2. Buscar processo pelo numero CNJ (se informado) na tabela `processos_oab`
3. Inserir na tabela `deadlines` com todos os campos preenchidos
4. Responder pelo WhatsApp confirmando os dados do prazo criado

Apos validar o teste, podemos expandir com mais tools (registrar gastos, enviar mensagens, etc).

