

# Contador de subtarefas pendentes no header da coluna

## O que muda

1. **Header da coluna (linha 358)**: Substituir o texto "Subtarefa" por um ícone de bandeira (`Flag`) + um badge com o total de subtarefas pendentes de todos os prazos visíveis. Exemplo: 🚩 `(5)` — onde 5 é a soma de subtarefas não concluídas.

2. **Célula da tabela (linhas 427-443)**: Reverter para o formato simples anterior — apenas o botão "Ver" com o ícone de bandeira, sem badge individual nem contador por linha.

## Implementação

**Arquivo: `src/components/Controladoria/CentralPrazosConcluidos.tsx`**

- **Linha 358 (header)**: Calcular `totalPendentes = filteredPrazos.reduce((acc, p) => acc + p.subtarefas.filter(s => !s.concluida).length, 0)` e renderizar:
  ```
  <Flag className="h-4 w-4 inline" />  (totalPendentes)
  ```
  Com cor laranja se > 0, verde se 0.

- **Linhas 427-443 (célula)**: Simplificar para apenas:
  ```
  prazo.subtarefas.length === 0 ? "-" : <Flag className="h-4 w-4" /> Ver
  ```
  Sem badges individuais.

