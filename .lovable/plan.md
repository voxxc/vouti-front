
## Ajustes CRM + Workspace do Projeto - 5 Itens

### 1. Conta: Estilo de Navegacao como Extras do Vouti

**Arquivo:** `src/components/WhatsApp/settings/WhatsAppAccountSettings.tsx`

**Problema:** Atualmente usa `Tabs` com `TabsList` e `TabsTrigger` (botoes com fundo). O usuario quer nomes clicaveis como no `ExtrasDrawer.tsx` do Vouti.

**Solucao:**
- Remover `Tabs/TabsList/TabsTrigger` do Radix
- Substituir por botoes de texto simples com underline ativo (mesmo padrao do `TabButton` do `ExtrasDrawer.tsx`)
- Layout: texto clicavel com `text-sm font-medium`, cor `text-foreground` quando ativo, `text-muted-foreground` quando inativo
- Linha inferior `h-0.5 bg-primary rounded-full` no item ativo
- Adicionar nova aba "Agenda" ao lado de "Geral" e "Usuarios"

### 2. Aba Agenda no CRM (Identica ao Vouti)

**Arquivo:** `src/components/WhatsApp/settings/WhatsAppAccountSettings.tsx`

**Solucao:**
- Importar `AgendaContent` de `@/components/Agenda/AgendaContent`
- Adicionar nova tab "Agenda" que renderiza `<AgendaContent />` diretamente
- O componente `AgendaContent` ja e compartilhado entre a pagina e o drawer do Vouti (conforme arquitetura existente), entao sera 100% identico
- Nao precisa de nenhuma alteracao no componente AgendaContent em si

### 3. Processo no Workspace: Remover Botoes + Adicionar Comentarios

**Arquivo:** `src/components/Controladoria/ProcessoOABDetalhes.tsx`

**Problema:** Ao clicar em um processo no workspace, o drawer mostra tabs "Resumo, Andamentos, Partes, Intimacoes, Prazos, Tarefas, IA" (7 tabs). O usuario quer:
- Remover tabs/botoes desnecessarios? -- Na verdade, ao reler o pedido, o usuario menciona "Vinculo, Relatorio e Historico" que existem no **TaskModal** (modal de tarefa/card), nao no drawer de processo. Vou verificar ambos contextos.

**Esclarecimento:** Os botoes "Vinculo", "Relatorio" e "Historico" existem no `TaskModal.tsx` (linhas 735-751), nao no `ProcessoOABDetalhes.tsx`. Porem o usuario fala "dentro do workspace do projeto, ao clicar em algum processo" -- os processos usam o drawer `ProcessoOABDetalhes`. Os botoes mencionados estao nos cards/tarefas.

**Acao no TaskModal.tsx:**
- Remover a tab "Vinculo" (linha 734-738)
- Remover a tab "Historico" (linha 748-751)
- Remover o botao "Gerar Relatorio" do `TaskTarefasTab`
- Manter apenas: Detalhes, Tarefas, Arquivos

**Acao no ProcessoOABDetalhes.tsx -- Comentarios no Resumo:**
- Na tab "Resumo", acima do toggle de monitoramento (que funciona como "alterar status"), adicionar uma secao de Comentarios
- Criar tabela `processo_comentarios` com: `id`, `processo_id` (FK processos_oab), `user_id`, `comment_text`, `reply_to_id` (self-reference para respostas), `mentioned_user_ids` (UUID array), `tenant_id`, `created_at`, `updated_at`
- RLS: usuarios do mesmo tenant podem ler/escrever
- Interface similar ao `DeadlineComentarios` existente mas adaptada para processos
- Suporte a responder mensagem (reply_to_id) mostrando a mensagem original
- Suporte a mencionar usuarios do projeto com `@nome` (buscar colaboradores do projeto)

**Migracao SQL:**
```sql
CREATE TABLE processo_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos_oab(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  reply_to_id UUID REFERENCES processo_comentarios(id) ON DELETE SET NULL,
  mentioned_user_ids UUID[] DEFAULT '{}',
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE processo_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_processo_comentarios" ON processo_comentarios
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_processo_comentarios_updated_at
  BEFORE UPDATE ON processo_comentarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. Colunas Arrastáveis com Cadeado Desbloqueado

**Status:** Ja implementado! O codigo em `ProjectView.tsx` (linha 1225-1229) ja usa `isDragDisabled={isColumnsLocked}` nas colunas e o `handleDragEnd` (linha 202-227) ja trata reordenacao de colunas. Ao desbloquear o cadeado, as colunas ja podem ser arrastadas.

**Acao:** Nenhuma alteracao necessaria. Confirmar que funciona corretamente.

### 5. Botao Carteira ao Lado de "+ Novo Processo"

**Arquivo:** `src/components/Project/ProjectProcessos.tsx`

**Conceito:** Carteira e um agrupador visual de processos dentro do workspace. Ao criar uma carteira, ela aparece vazia. Com o cadeado desbloqueado, o usuario pode arrastar processos para dentro da carteira.

**Migracao SQL:**
```sql
CREATE TABLE project_carteiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#6366f1',
  ordem INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_carteira_processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carteira_id UUID NOT NULL REFERENCES project_carteiras(id) ON DELETE CASCADE,
  project_processo_id UUID NOT NULL REFERENCES project_processos(id) ON DELETE CASCADE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(carteira_id, project_processo_id)
);

ALTER TABLE project_carteiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_carteira_processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_carteiras" ON project_carteiras
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_carteira_processos" ON project_carteira_processos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_carteiras pc
      WHERE pc.id = carteira_id AND pc.tenant_id = get_user_tenant_id()
    )
  );
```

**Implementacao no ProjectProcessos.tsx:**
- Botao minimalista (icone pasta/briefcase) ao lado de "Vincular Processo"
- Dialog para criar carteira (nome + cor opcional)
- Carteiras aparecem como secoes colapsaveis (similar a InstanciaSection)
- Com cadeado desbloqueado (`isLocked = false`), processos podem ser arrastados para dentro de carteiras
- Processos em carteira ficam fixados ate serem removidos manualmente
- Drag-and-drop entre carteiras e secoes de instancia

### Resumo de Arquivos

**Migracoes SQL:**
- Tabela `processo_comentarios`
- Tabelas `project_carteiras` e `project_carteira_processos`

**Arquivos novos:**
- `src/components/Controladoria/ProcessoComentarios.tsx` -- componente de comentarios para processos

**Arquivos editados:**
1. `WhatsAppAccountSettings.tsx` -- estilo tabs texto clicavel + aba Agenda
2. `ProcessoOABDetalhes.tsx` -- adicionar secao de comentarios no Resumo
3. `ProjectProcessos.tsx` -- botao carteira + secoes de carteira + drag-and-drop
4. `TaskModal.tsx` -- remover tabs Vinculo, Historico, botao Relatorio
5. `TaskTarefasTab.tsx` -- remover prop/botao Gerar Relatorio
