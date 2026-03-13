

# Categorização de Prazos Periciais por Tipo

## Situação Atual
A tabela `deadlines` não possui coluna de tipo/categoria. Todos os prazos são tratados igualmente no gráfico pizza.

## Proposta

### 1. Nova coluna no banco: `deadline_category`
Migration para adicionar `deadline_category TEXT` na tabela `deadlines`. Valores possíveis:
- Revisional, Embargos, Contestação, Exceção de Pré-executividade, Impugnação ao laudo pericial, Elaboração de quesitos, Liquidação de sentença, Cumprimento de Sentença, Laudo complementar, Outros

### 2. Novo gráfico: Barras horizontais empilhadas (Stacked Bar)
O gráfico pizza atual mostra bem o total geral (concluído/atrasado/pendente), mas para **cruzar tipo × status**, o melhor formato é **barras horizontais empilhadas**:

```text
Revisional       ██████████░░░░░░░████
Embargos         ████░░████████
Contestação      ██████████████░░
Liquidação       ████░░░░
...
                 🟢 Concluídos  🔴 Atrasados  🔵 Pendentes
```

Cada barra = um tipo de prazo. Segmentos coloridos = status. Visualmente claro para comparar volume e saúde por categoria.

### 3. Integração no card existente
Adicionar uma **terceira vista** no toggle do `PrazosDistributionChart`:
- `geral` → Pizza geral (atual)
- `pericial` → Pizza pericial (atual)  
- `categorias` → Barras empilhadas por tipo (novo)

A seta discreta alterna entre as 3 vistas ciclicamente. Título muda para "Por Categoria". Mesmos filtros de período e usuário.

### 4. Formulário de criação de prazo
Adicionar campo opcional `Categoria` (Select) no formulário de criação/edição de prazos, com as opções listadas. Default: sem categoria (aparece como "Outros" no gráfico).

### Arquivos a modificar
- **Nova migration**: `ALTER TABLE deadlines ADD COLUMN deadline_category TEXT`
- **`src/components/Dashboard/PrazosDistributionChart.tsx`**: terceira vista com `BarChart` horizontal empilhado do Recharts
- **`src/types/agenda.ts`**: adicionar `deadlineCategory?: string` ao tipo `Deadline`
- **`src/hooks/useAgendaData.ts`**: mapear o novo campo
- **Formulário de criação de prazo** (componente que cria deadlines): adicionar Select de categoria

