

## Busca Rapida no CRM + Isolamento da Agenda

### 1. Busca Rapida na Topbar do CRM

Criar um componente `CRMQuickSearch` baseado no `ProjectQuickSearch` existente, mas adaptado para o CRM:

**Novo arquivo:** `src/components/WhatsApp/components/CRMQuickSearch.tsx`

- Mesma estetica do `ProjectQuickSearch`: input compacto com icone de lupa, dropdown com resultados
- Busca projetos com `.eq('module', 'crm')` em vez de `'legal'`
- Filtra por permissao: usuarios normais so veem projetos onde sao participantes (`project_collaborators`) ou criadores (`created_by`)
- Admins/controllers veem todos os projetos CRM do tenant
- Ao selecionar, navega para a secao de projetos e abre o projeto selecionado

**Arquivo editado:** `src/components/WhatsApp/components/CRMTopbar.tsx`

- Adicionar o `CRMQuickSearch` na topbar, entre o logo e os botoes da direita (mesma posicao que o Vouti tem na sua topbar)

---

### 2. Isolamento da Agenda entre Vouti e CRM

O problema: `AgendaContent` busca TODOS os deadlines do tenant sem filtrar por modulo. A tabela `deadlines` nao tem coluna `module`.

**Solucao:** Adicionar coluna `module` na tabela `deadlines` e filtrar por contexto.

**Migracao SQL:**
```
ALTER TABLE deadlines ADD COLUMN module TEXT DEFAULT 'legal';
```

- Deadlines existentes ficam como `'legal'` (padrao, preserva comportamento atual do Vouti)
- Quando criado pelo CRM, grava `module = 'crm'`

**Arquivo editado:** `src/components/Agenda/AgendaContent.tsx`

- Aceitar prop opcional `module` (default `'legal'`)
- Adicionar `.eq('module', module)` na query de fetch de deadlines
- Ao criar deadline, incluir o campo `module` no insert

**Arquivo editado:** `src/components/WhatsApp/WhatsAppLayout.tsx` (ou onde renderiza AgendaContent no CRM)

- Passar `module="crm"` para o `AgendaContent` quando renderizado dentro do CRM

---

### Resumo de Alteracoes

| Arquivo | Acao |
|---|---|
| Novo: `CRMQuickSearch.tsx` | Componente de busca rapida para projetos CRM |
| `CRMTopbar.tsx` | Adicionar CRMQuickSearch na topbar |
| Migracao SQL | Adicionar coluna `module` na tabela `deadlines` |
| `AgendaContent.tsx` | Aceitar prop `module`, filtrar deadlines por modulo |
| `WhatsAppLayout.tsx` | Passar `module="crm"` ao renderizar AgendaContent |
| `WhatsAppDrawer.tsx` | Passar `module="crm"` ao renderizar AgendaContent |

