

# Adicionar contador de subtarefas pendentes

## O que muda

Na coluna "Subtarefa" da tabela de Prazos Concluídos, ao lado do texto "Ver", exibir um badge com a quantidade de subtarefas ainda não concluídas (pendentes). Se todas estiverem concluídas, mostrar apenas o ícone verde sem contador.

## Implementação

**Arquivo: `src/components/Controladoria/CentralPrazosConcluidos.tsx`**

1. **Coluna da tabela (linhas 426-434)**: Calcular `pendentes = prazo.subtarefas.filter(s => !s.concluida).length` e exibir um `Badge` com o número ao lado de "Ver" quando `pendentes > 0`.

2. **Header da tabela (linha 358)**: Opcionalmente, adicionar um badge global com o total de subtarefas pendentes em todos os prazos visíveis.

Mudança visual: `🟠 Ver (2)` quando há pendentes, `🟢 Ver ✓` quando todas concluídas.

