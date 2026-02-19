
## Topbar + Chat Interno + Reorganizacao da Sidebar no Vouti CRM

### Resumo

Criar uma topbar horizontal no CRM com logo, chat interno, notificacoes, nome do perfil e botao de logout. Mover o botao "Projetos" para acima de "Caixa de Entrada" na sidebar. Remover esses elementos do rodape da sidebar (onde estao hoje).

### Mudancas

**1. Criar componente `src/components/WhatsApp/components/CRMTopbar.tsx`**

Topbar horizontal fixa no topo do CRM contendo:
- Esquerda: logo "vouti.crm" (clicavel, vai para inbox)
- Direita: icone de chat interno (MessageCircle), sino de notificacoes (CRMNotificationsBell), nome do perfil logado, botao de logout (LogOut)

O icone de chat interno abre um Dialog com o sistema de mensagens existente (reutilizando `useMessages` hook e a tabela `messages`). O dialog lista usuarios do mesmo tenant e permite troca de mensagens em tempo real.

**2. Criar componente `src/components/WhatsApp/components/CRMInternalChat.tsx`**

Dialog de chat interno adaptado para o CRM:
- Lista de usuarios do tenant na lateral esquerda (busca da tabela `profiles` filtrada por `tenant_id`)
- Area de conversa na direita usando o hook `useMessages`
- Badge com contagem de nao-lidas no icone da topbar
- Realtime via subscription ja existente no `useMessages`

**3. Modificar `src/components/WhatsApp/WhatsAppLayout.tsx`**

- Importar e renderizar `CRMTopbar` acima do conteudo principal
- Alterar layout de `flex h-screen` para `flex flex-col h-screen`, com topbar + area flex (sidebar + main)
- Passar callbacks necessarios (onSectionChange para o logo, onOpenChat)

**4. Modificar `src/components/WhatsApp/WhatsAppSidebar.tsx`**

- **Remover** do header: logo "vouti.crm", botao ArrowLeft, CRMNotificationsBell (movidos para topbar)
- **Remover** do footer: secao de user info (avatar, nome, botao logout) (movidos para topbar)
- **Mover** botao "Projetos" para **acima** de "Caixa de Entrada" na lista de navegacao
- O header da sidebar fica mais compacto ou desaparece, deixando apenas o ScrollArea com os menus

### Estrutura visual resultante

```text
+-----------------------------------------------------------------------+
| [vouti.crm]                    [Chat] [Notif] Nome do Usuario [Sair]  |
+-----------------------------------------------------------------------+
| Sidebar (w-56)  |  Main Content                                       |
|                 |                                                      |
| Projetos        |                                                      |
| Caixa de Entrada|                                                      |
| Conversas  >    |                                                      |
| Kanban CRM >    |                                                      |
| Contatos        |                                                      |
| Relatorios      |                                                      |
| Campanhas       |                                                      |
| Central Ajuda   |                                                      |
| Configuracoes > |                                                      |
|                 |                                                      |
+-----------------+------------------------------------------------------+
```

### Detalhes tecnicos

**CRMTopbar.tsx:**
- Usa `useAuth()` para obter usuario logado
- Usa `useParams()` para tenant e `useNavigate()` para logout redirect
- Renderiza `CRMNotificationsBell` (movido do sidebar)
- Renderiza icone `MessageCircle` com badge de nao-lidas (do `useMessages`)
- Botao logout chama `supabase.auth.signOut()` e redireciona para `/crm/{tenant}/auth`

**CRMInternalChat.tsx:**
- Busca profiles do tenant: `supabase.from('profiles').select('id, name, email, avatar_url').eq('tenant_id', tenantId)`
- Usa `useMessages(user.id)` para mensagens
- Dialog com layout split: lista de usuarios (1/3) + area de chat (2/3)
- Auto-scroll ao receber novas mensagens
- Agrupamento por data com badges (seguindo padrao visual existente)

**WhatsAppSidebar.tsx:**
- Header simplificado (sem logo, sem notificacoes)
- Footer removido (sem avatar/logout)
- Botao "Projetos" movido de linha ~500 para antes de "Caixa de Entrada" (linha ~266)

**WhatsAppLayout.tsx:**
- Layout muda de `flex h-screen` para `flex flex-col h-screen`
- Topbar como primeiro filho
- `div className="flex flex-1 overflow-hidden"` envolve sidebar + main

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/components/WhatsApp/components/CRMTopbar.tsx` | Criar |
| `src/components/WhatsApp/components/CRMInternalChat.tsx` | Criar |
| `src/components/WhatsApp/WhatsAppLayout.tsx` | Modificar (adicionar topbar, ajustar layout) |
| `src/components/WhatsApp/WhatsAppSidebar.tsx` | Modificar (remover header/footer, mover Projetos) |
