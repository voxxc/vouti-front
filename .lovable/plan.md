

# Plano: Subtarefas + Projeto/Workspace na Agenda + Criador do Prazo

## 1. Banco de dados — Nova tabela `deadline_subtarefas`

```sql
CREATE TABLE deadline_subtarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_id uuid REFERENCES deadlines(id) ON DELETE CASCADE NOT NULL,
  descricao text NOT NULL,
  atribuido_a uuid NOT NULL,
  criado_por uuid NOT NULL,
  tenant_id uuid,
  concluida boolean DEFAULT false,
  concluida_em timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deadline_subtarefas ENABLE ROW LEVEL SECURITY;
-- RLS: tenant isolation
```

## 2. Subtarefa ao concluir prazo

**Arquivo: `AgendaContent.tsx`** — No AlertDialog de conclusão (linhas 1395-1440):
- Adicionar estados: `criarSubtarefa` (boolean), `subtarefaDescricao` (string), `subtarefaUsuario` (string)
- Abaixo do campo de comentário, checkbox "Criar subtarefa"
- Ao marcar, exibe campo de descrição + `AdvogadoSelector` para escolher destinatário
- No `handleConfirmComplete`, após concluir o prazo, insere na tabela `deadline_subtarefas` se checkbox marcado

## 3. Coluna bandeira na Controladoria Prazos Concluídos

**Arquivo: `CentralPrazosConcluidos.tsx`**:
- Atualizar query para buscar subtarefas: join com `deadline_subtarefas`
- Nova coluna na tabela com ícone `Flag` (lucide) — colorida quando há subtarefa pendente
- Botão "Ver" ao lado que abre detalhes da subtarefa no modal
- No modal de detalhes, seção para exibir subtarefas (descrição, atribuído a, status)
- Adicionar `user_id` (criador) na query e exibir "Criado por" no modal

## 4. Seletor de Projeto + Workspace na criação pela Agenda

**Arquivo: `AgendaContent.tsx`** — No dialog de criação (linhas 1024-1084):
- Buscar projetos do tenant ao abrir o dialog
- Adicionar `Select` de projeto (opcional, placeholder "Sem projeto")
- Quando projeto selecionado, buscar `project_workspaces` desse projeto
- Exibir segundo `Select` de workspace (opcional, default = workspace padrão)
- Atualizar `handleCreateDeadline` para usar o workspace selecionado em vez de resolver o default automaticamente

**Arquivo: `types/agenda.ts`**:
- Adicionar `workspaceId?: string` ao `DeadlineFormData`

## 5. Exibir "Criado por" nos detalhes do prazo

**Arquivo: `AgendaContent.tsx`**:
- Na query de deadlines, já existe `createdByUserId`. Adicionar join para buscar nome/avatar do criador
- Adicionar `createdByName` e `createdByAvatar` ao tipo `Deadline`
- Exibir no dialog de detalhes com avatar + nome

**Arquivo: `CentralPrazosConcluidos.tsx`**:
- Adicionar join do `user_id` (criador) na query
- Exibir no modal de detalhes

## Ordem de execução

1. Criar migration (tabela `deadline_subtarefas` + RLS)
2. Atualizar `types/agenda.ts`
3. Atualizar `AgendaContent.tsx` (subtarefa na conclusão, projeto+workspace na criação, criador nos detalhes)
4. Atualizar `CentralPrazosConcluidos.tsx` (coluna bandeira, subtarefas, criador)

