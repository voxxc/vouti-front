

## Plano: Aba "Planilha" nos Indicadores de Prazos — visão tabular completa

### Objetivo
Adicionar uma nova aba dentro do card "Indicadores de Prazos" que exiba todos os prazos em formato de planilha (como o print enviado), com colunas detalhadas e visual limpo para impressão/PDF.

### Layout

A seção de Indicadores de Prazos terá duas abas internas (usando `Tabs`):
- **Resumo** (atual): cards de métricas + tabelas agrupadas por usuário + pendentes
- **Planilha**: tabela flat estilo spreadsheet com todos os prazos filtrados

Os filtros (período, status, usuário) ficam acima das abas e se aplicam a ambas.

### Colunas da Planilha

| Coluna | Dados |
|---|---|
| Nº | `deadline_number` (número sequencial de auditoria) |
| Título / Descrição | `title` |
| Data do Prazo | `date` (data fatal) |
| Criado em | `created_at` (timestamp de criação) |
| Concluído em | `concluido_em` (timestamp de conclusão, ou "—") |
| Status | Badge: Concluído (verde), Pendente (amarelo), Atrasado (vermelho) |
| Responsável | Nome do `user_id` (quem criou/é responsável) |
| Concluído por | Nome do `concluido_por` |
| Projeto | Nome do projeto vinculado |

### Detalhes de implementação

**Arquivo**: `src/components/Controladoria/ControladoriaIndicadores.tsx`

1. **Buscar campos adicionais**: Adicionar `created_at` e `deadline_number` ao select da query de deadlines (já existe `concluido_em`)
2. **Novo estado `viewTab`**: `"resumo" | "planilha"` para alternar entre as duas visões
3. **Aba Planilha**: Tabela com todas as colunas acima, ordenada por data do prazo decrescente
4. **Visual estilo spreadsheet**: Bordas em todas as células (`border`), texto compacto (`text-xs`), linhas zebradas, header fixo com fundo cinza — similar ao print do usuário
5. **Cores de status inline**: Atrasado em vermelho, concluído em verde, pendente em amarelo — aplicado na célula inteira ou apenas no badge
6. **Paginação**: 50 itens por página com controles simples (anterior/próximo)
7. **Impressão**: Atualizar `handlePrint` para detectar a aba ativa; se "planilha", gerar HTML com tabela completa estilo spreadsheet com todas as colunas
8. **Botão "Imprimir" mantido no header** — funciona para ambas as abas

### Arquivos a editar
- `src/components/Controladoria/ControladoriaIndicadores.tsx` — adicionar aba planilha, buscar campos extras, atualizar impressão

