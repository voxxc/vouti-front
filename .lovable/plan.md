

# Vincular Clientes e Processos à Tarefa do Planejador + Aba "Prazos Relacionados"

## Resumo

Adicionar à tarefa do Planejador:
1. Vínculo com **cliente** (tabela `clientes`)
2. Vínculo com **processo** (tabela `processos_oab`)
3. Aba **"Prazos Relacionados"** que exibe prazos da tabela `deadlines` vinculados ao processo da tarefa

## Mudanças no Banco de Dados

**Migration:** Adicionar 2 colunas à tabela `planejador_tasks`:

```sql
ALTER TABLE public.planejador_tasks
  ADD COLUMN cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN processo_oab_id UUID REFERENCES public.processos_oab(id) ON DELETE SET NULL;

CREATE INDEX idx_planejador_tasks_cliente ON public.planejador_tasks(cliente_id);
CREATE INDEX idx_planejador_tasks_processo ON public.planejador_tasks(processo_oab_id);
```

Sem tabelas novas. Sem RLS adicional (já coberto pelas policies existentes de tenant).

## Mudanças no Frontend

### 1. `usePlanejadorTasks.ts` — Atualizar tipo `PlanejadorTask`

Adicionar `cliente_id` e `processo_oab_id` ao interface.

### 2. `PlanejadorTaskDetail.tsx` — 3 novos itens no sidebar

Adicionar ao array `sidebarItems`:
- **Cliente** (ícone `UserCircle`): mostra cliente vinculado ou busca para vincular. Busca na tabela `clientes` filtrada por `tenant_id`, com campo de pesquisa por `nome_pessoa_fisica` / `nome_pessoa_juridica`.
- **Processo** (ícone `Scale`): mostra processo vinculado ou busca para vincular. Busca na tabela `processos_oab` filtrada por `tenant_id`, com pesquisa por `numero_cnj`, `parte_ativa`, `parte_passiva`.
- **Prazos** (ícone `CalendarClock`): exibe prazos da tabela `deadlines` onde `processo_oab_id` = processo vinculado à tarefa. Somente leitura, com status (concluído/pendente), título, data.

### 3. Fluxo de vínculo (Cliente e Processo)

Padrão similar ao já existente em `TaskVinculoTab`:
- Seção expandível no sidebar
- Campo de busca com debounce
- Click para vincular → `onUpdate(task.id, { cliente_id: id })`
- Botão para desvincular → `onUpdate(task.id, { cliente_id: null })`
- Exibe card resumido quando vinculado

### 4. Aba "Prazos Relacionados"

- Query: `SELECT * FROM deadlines WHERE processo_oab_id = ? AND tenant_id = ?`
- Lista com: título, data, badge de status (concluído/pendente)
- Mensagem vazia quando não há processo vinculado ou sem prazos

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | 2 colunas em `planejador_tasks` |
| `usePlanejadorTasks.ts` | Campos no interface |
| `PlanejadorTaskDetail.tsx` | 3 novos itens expandíveis: Cliente, Processo, Prazos |

