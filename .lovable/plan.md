

# Aba "Indicadores" na Central da Controladoria

## O que será feito

Adicionar a aba "Indicadores" no menu underline **dentro de CentralControladoria**, ao lado de Andamentos, Prazos e Subtarefas. Exibirá uma lista estilizada de processos agrupados por tribunal (`tribunal_sigla`), com contagem, barras de progresso proporcionais e percentuais.

## Alterações

### 1. `src/components/Controladoria/CentralControladoria.tsx`

- Adicionar `'indicadores'` ao `TabValue`
- Adicionar botão de aba "Indicadores" após Subtarefas (sem restrição de tenant)
- Renderizar `<ControladoriaIndicadores />` quando aba ativa

### 2. `src/components/Controladoria/ControladoriaIndicadores.tsx` (novo)

Componente que:
- Busca processos de `processos_oab` filtrando por `tenant_id`
- Agrupa por `tribunal_sigla`, conta quantidade por tribunal
- Ordena do maior para o menor
- Exibe Card com:
  - Header com ícone BarChart3 e título "Processos por Tribunal"
  - Lista de itens: sigla do tribunal, contagem, barra de progresso proporcional ao maior, percentual
  - Footer com total geral
- Loading state com Skeleton
- Estado vazio caso não haja processos

### Arquivos
- `src/components/Controladoria/CentralControladoria.tsx` (modificado)
- `src/components/Controladoria/ControladoriaIndicadores.tsx` (novo)

