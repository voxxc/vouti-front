

## Plano: Filtros avançados e expansão por usuário nos Indicadores de Prazos

### Objetivo
Adicionar filtros de período (de/até), status (Concluídos/Pendentes/Atrasados) e usuário ao painel de Indicadores de Prazos. Permitir expandir cada usuário para ver os prazos concluídos dele. Resultado filtrado imprimível/PDF.

### Implementação

**Arquivo**: `src/components/Controladoria/ControladoriaIndicadores.tsx`

#### 1. Novos estados de filtro
- `dateFrom: string` e `dateTo: string` — campos date input para período
- `statusFilter: "todos" | "concluidos" | "pendentes" | "atrasados"` — select de status
- `userFilter: string` — select com "Todos" + lista de usuários do tenant
- `expandedUserId: string | null` — controla qual usuário está expandido

#### 2. Armazenar dados brutos completos
- Guardar `allDeadlines` (todos os deadlines do fetch) em estado separado
- Guardar `allProfiles` (mapa userId → nome) para o select de usuários
- Guardar detalhes dos prazos concluídos por usuário (`userDeadlines: Map<string, Deadline[]>`)

#### 3. Barra de filtros (abaixo do header, acima dos cards)
```
[Data De: ___] [Data Até: ___] [Status: Todos ▼] [Usuário: Todos ▼] [Filtrar]
```
- Date inputs com `type="date"` 
- Select de status: Todos, Concluídos, Pendentes, Atrasados
- Select de usuário: Todos + nomes dos perfis do tenant
- Botão "Filtrar" aplica os filtros no client-side sobre `allDeadlines`

#### 4. Filtragem client-side
- Filtrar `allDeadlines` por período (comparar `d.date` com dateFrom/dateTo)
- Filtrar por status (completed, !completed, atrasado)
- Filtrar por usuário (concluido_por ou user_id)
- Recalcular cards de resumo, tabelas de usuários e pendentes com dados filtrados

#### 5. Expandir usuário ao clicar
- Na tabela "Prazos concluídos por usuário", ao clicar no nome → toggle `expandedUserId`
- Ícone ChevronDown/ChevronUp ao lado do nome
- Abaixo da row, renderizar sub-tabela com: Título, Data, Projeto dos prazos concluídos por aquele usuário (respeitando filtros ativos)

#### 6. Impressão/PDF atualizado
- O `handlePrint` já gera HTML em nova janela — atualizar para:
  - Incluir os filtros aplicados no cabeçalho ("Período: X a Y", "Status: Concluídos", etc.)
  - Incluir os prazos expandidos do usuário selecionado (se houver)
  - Incluir todos os dados filtrados (não só os 20 primeiros pendentes)
- Botão "Imprimir" e botão "Exportar PDF" (ambos usam `window.print()` — o navegador oferece "Salvar como PDF")

### Arquivos a editar
- `src/components/Controladoria/ControladoriaIndicadores.tsx` — todas as mudanças concentradas neste arquivo

