

## Carteiras de Processos (Protocolos)

A ideia é replicar o padrão já existente em **ProjectProcessos** (aba de processos OAB) para a aba de **Processos** (protocolos). Hoje a tabela `project_carteiras` e `project_carteira_processos` servem para agrupar processos OAB. Para protocolos, precisamos de uma tabela de junção nova.

### Banco de dados

Criar uma nova tabela `project_carteira_protocolos`:

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | ID |
| carteira_id | uuid (FK → project_carteiras) | Referência à carteira |
| project_protocolo_id | uuid (FK → project_protocolos) | Referência ao protocolo |
| ordem | integer | Posição dentro da carteira |
| created_at | timestamptz | Data de criação |

A tabela `project_carteiras` existente será reutilizada (já tem `projeto_id`, `workspace_id`, `tenant_id`, `nome`, `cor`).

RLS: mesma política das tabelas irmãs (acesso por tenant_id).

### Mudanças no componente `ProjectProtocolosList.tsx`

1. **Botão de carteira** ao lado do botão "Novo processo" (ícone `Briefcase`, mesmo padrão do `ProjectProcessos`). Abre um dialog simples para criar carteira (nome + cor).

2. **Carregar carteiras** existentes do projeto/workspace ao montar o componente.

3. **Renderizar carteiras** como seções colapsáveis (`Collapsible`) abaixo da lista de protocolos, com droppable zones para receber drag-and-drop.

4. **Drag-and-drop** de protocolos para carteiras: ao soltar um protocolo sobre uma carteira, cria o vínculo na tabela `project_carteira_protocolos`. Quando solta de volta na lista principal, remove o vínculo.

5. **Botão de excluir carteira** visível quando o cadeado está desbloqueado.

### Fluxo do usuário

```text
┌─────────────────────────────────────────┐
│ Processos                    [+Novo] [📁]│  ← botão carteira
├─────────────────────────────────────────┤
│ 🔍 Buscar...         [Filtro status] [↕]│
├─────────────────────────────────────────┤
│ ⠿ PROCESSO A                  Pendente  │
│ ⠿ PROCESSO B                Em Andamento│
│ ⠿ PROCESSO C                  Concluído │
├─────────────────────────────────────────┤
│ 📁 Carteira "Urgentes" (2)          ▼ 🗑│  ← colapsável, droppable
│   ├ PROCESSO D                 Pendente  │
│   └ PROCESSO E               Em Andamento│
├─────────────────────────────────────────┤
│ 📁 Carteira "Arquivados" (0)        ▼ 🗑│
│   Arraste processos para cá              │
└─────────────────────────────────────────┘
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| **SQL migration** | Criar tabela `project_carteira_protocolos` com RLS |
| **`src/components/Project/ProjectProtocolosList.tsx`** | Adicionar estado de carteiras, botão criar, renderização colapsável com drag-and-drop, lógica de mover/remover |
| **`src/integrations/supabase/types.ts`** | Será atualizado automaticamente com o novo tipo da tabela |

A lógica segue exatamente o padrão já implementado em `ProjectProcessos.tsx` (linhas 344-550, 1033-1091), adaptado para protocolos em vez de processos OAB.

