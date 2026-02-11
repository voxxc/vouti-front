

## Correcoes e Novas Funcionalidades do Kanban CRM

Este plano aborda 5 areas: correcao do drag-and-drop, botao de mudanca de coluna, sistema de notas, integracao com contatos, e campos adicionais no cadastro.

---

### 1. Correcao do Drag-and-Drop entre colunas

**Problema raiz**: O `upsert` com `onConflict` nao funciona com indices parciais condicionais (WHERE tenant_id IS NOT NULL / IS NULL). O Supabase nao consegue resolver qual constraint usar, e o upsert falha silenciosamente.

**Solucao**: Substituir o `upsert` por uma logica de `select` + `update`. Ao soltar o card, primeiro buscar o registro existente pelo `id` do card, depois fazer `update` no `column_id` e `card_order`.

**Arquivo**: `src/components/WhatsApp/sections/WhatsAppKanban.tsx`

- No `handleDragEnd`, usar o `id` do card (ja disponivel no estado `cards`) em vez do `phone` como `draggableId`
- Trocar `upsert` por `update ... where id = card.id`
- Usar `card.id` como `draggableId` no `<Draggable>` em vez de `card.phone`

```typescript
// Antes (problematico):
upsert({ phone: draggableId, ... }, { onConflict: '...' })

// Depois (confiavel):
const card = cards.find(c => c.id === draggableId);
await supabase
  .from("whatsapp_conversation_kanban")
  .update({ column_id: newColumnId, card_order: destination.index })
  .eq("id", card.id);
```

---

### 2. Botao "Kanban CRM" no painel lateral da conversa

Ativar o botao existente na secao "Kanban CRM" do `ContactInfoPanel` para permitir mudanca de coluna via dropdown com confirmacao.

**Arquivo**: `src/components/WhatsApp/components/ContactInfoPanel.tsx`

- Buscar a coluna atual do card (via `whatsapp_conversation_kanban` pelo phone)
- Listar todas as colunas disponiveis (via `whatsapp_kanban_columns` pelo agent_id)
- Exibir um `Select` dropdown com as colunas
- Ao selecionar, exibir um `AlertDialog` de confirmacao
- Ao confirmar, fazer `update` no `column_id`

O componente precisa receber o `agentId` como prop (ja disponivel no contexto do Kanban).

---

### 3. Sistema de Notas (Comentarios) sobre Leads

Criar uma tabela `whatsapp_contact_notes` e um componente de comentarios.

**Migracao SQL**: Nova tabela

```sql
CREATE TABLE public.whatsapp_contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS + policies
```

**Novo componente**: `src/components/WhatsApp/components/ContactNotesPanel.tsx`

- Lista de notas com autor, data e conteudo
- Campo de texto + botao "Adicionar Nota"
- Scroll com as notas mais recentes primeiro
- Usa o `CommentText` existente para renderizar mencoes

**Integracao no ContactInfoPanel**: Adicionar uma nova secao "Notas" (usando icone `MessageSquare`) no accordion, que renderiza o `ContactNotesPanel`.

---

### 4. Botao "Detalhes" na secao Contatos

**Arquivo**: `src/components/WhatsApp/sections/WhatsAppContacts.tsx`

- Adicionar item "Detalhes" no `DropdownMenu` de cada contato
- Ao clicar, abrir um `Dialog` que exibe o `ContactNotesPanel` do contato
- Permite ver e adicionar notas diretamente da lista de contatos

---

### 5. Campos adicionais no cadastro de contatos

**Migracao SQL**: Adicionar colunas a `whatsapp_contacts`

```sql
ALTER TABLE whatsapp_contacts 
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil';
```

**Arquivo**: `src/components/WhatsApp/components/SaveContactDialog.tsx`

- Adicionar campos: Cidade, Estado, Pais
- Incluir no `handleSave` (insert e update)
- Carregar valores existentes no `useEffect` de contato existente

---

### Resumo de arquivos

| Arquivo | Mudanca |
|---|---|
| **Migracao SQL** | Tabela `whatsapp_contact_notes` + colunas `city`, `state`, `country` em `whatsapp_contacts` |
| `WhatsAppKanban.tsx` | Fix drag: usar `card.id` como draggableId, substituir upsert por update |
| `ContactInfoPanel.tsx` | Ativar botao Kanban CRM com dropdown de colunas + confirmacao; adicionar secao Notas |
| `ContactNotesPanel.tsx` (novo) | Componente de comentarios/notas por lead |
| `WhatsAppContacts.tsx` | Adicionar "Detalhes" no menu 3 pontos com dialog de notas |
| `SaveContactDialog.tsx` | Campos: cidade, estado, pais |

