

## Redesign da Agenda - Layout Minimalista com Filtro por Usuario

### Visao geral

Transformar a pagina de Agenda de um layout com Cards pesados para um design minimalista inspirado na listagem de Publicacoes: itens em linhas leves com bordas, informacoes compactas e acoes inline. Adicionar filtro de usuario acima da barra de pesquisa (padrao: usuario logado).

### Mudancas visuais

**Antes (atual):**
- Cards grandes com CardHeader/CardContent para "Prazos Vencidos", "Proximos Prazos"
- Cards individuais por prazo com padding pesado
- Secao de admin separada com tabela
- Calendario ocupa toda a largura

**Depois (novo):**
- Layout em duas colunas: calendario a esquerda (compacto), listagem a direita
- Listagem minimalista com linhas tipo Publicacoes: `border rounded-lg p-3 hover:bg-muted/30 cursor-pointer`
- Status indicado por bolinha colorida + badge discreto (como na Publicacao)
- Acoes inline compactas (concluir, menu 3 pontos)
- Filtro de usuario NO TOPO, acima da busca, visivel para todos (nao apenas admin)

### Estrutura da nova interface

```text
+----------------------------------------------------------+
| <- Voltar    Agenda                        [+ Novo Prazo] |
+----------------------------------------------------------+
| Filtro: [Usuario ativo v]  (padrao: eu)                   |
| [Buscar prazos...]                                        |
+----------------------------------------------------------+
|  CALENDARIO (compacto)  |  LISTAGEM MINIMALISTA           |
|                         |  --- Vencidos (3) ---           |
|   < Fevereiro 2026 >    |  . Prazo X  | 15/02 | Badge    |
|   Dom Seg Ter ...        |  . Prazo Y  | 10/02 | Badge    |
|                         |  --- Pendentes (5) ---          |
|                         |  . Prazo Z  | 25/02 | Badge    |
|                         |  --- Concluidos (2) ---         |
|                         |  . Prazo W  | 01/02 | Badge    |
+----------------------------------------------------------+
```

### Detalhes tecnicos

**Arquivo principal**: `src/pages/Agenda.tsx` (reescrita do bloco de renderizacao, ~linhas 870-1772)

**1. Filtro de usuario (topo, acima da busca)**
- Select com todos os usuarios do tenant (usa `allUsers` ja existente)
- Padrao: `user.id` (usuario logado)
- Qualquer usuario pode ver prazos de outros (nao restrito a admin)
- Ao mudar filtro, filtra deadlines por `advogadoResponsavel.userId === selectedUser` OU `taggedUsers` contendo o selectedUser
- Label: "Visualizando prazos de:"

**2. Listagem minimalista (substitui os Cards de Vencidos/Proximos/data selecionada)**
- Cada prazo e uma linha `border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer`
- Layout interno:
  - Esquerda: bolinha de status (vermelho/amarelo/verde) + titulo truncado
  - Centro: data `text-xs text-muted-foreground`, nome do projeto
  - Direita: Badge de status + botao concluir + menu 3 pontos (admin)
- Agrupamento por secoes: "Vencidos", "Pendentes", "Concluidos" com contadores
- Sem Cards wrapper - secoes sao `h4` simples como no PrazosCasoTab

**3. Layout em duas colunas**
- Esquerda: Calendario (mantido, mas dentro de um container menor `w-[380px]`)
- Direita: Listagem completa em `flex-1`
- Responsivo: empilha em mobile

**4. Remocoes**
- Remove Cards de "Prazos Vencidos" e "Proximos Prazos" (substituidos pela listagem unificada)
- Remove secao "Visao do Administrador" separada (filtro agora esta no topo)
- Remove tabela de "Historico de Prazos Cumpridos" (concluidos ficam na listagem agrupada)

**5. Manter intacto**
- Dialog de criacao de prazo
- Dialog de detalhes do prazo (com tabs Info/Comentarios)
- Dialog de extensao de prazo
- Dialog de edicao de prazo
- AlertDialog de confirmacao de conclusao
- Toda a logica de fetch, create, delete, toggle

**Arquivos modificados:**
| Arquivo | Mudanca |
|---|---|
| `src/pages/Agenda.tsx` | Reescrever bloco de renderizacao: layout 2 colunas, listagem minimalista, filtro de usuario no topo |

**Arquivos NAO modificados:**
- `AgendaCalendar.tsx` - mantido como esta
- `EditarPrazoDialog.tsx` - mantido
- `DeadlineComentarios.tsx` - mantido
- `useAgendaData.ts` - mantido

