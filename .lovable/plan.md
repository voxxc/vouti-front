## Contexto
Atualmente, para interagir com um card de revisional no Planejador, o usuário precisa clicar exclusivamente no botão "..." (MoreVertical) no canto do card. O usuário solicitou que o card inteiro seja clicável.

## Objetivo
Permitir que o card de revisional responda ao clique em qualquer parte de sua área, não apenas no botão de menu.

## Plano de implementação

### 1. Card clicável com menu de ações
- Transformar o `<div>` do `RevisionalCard` em um elemento clicável que abre o dropdown de ações atual.
- O botão "..." continua existindo como alternativa visual, mas o clique em qualquer parte do card também dispara o mesmo menu.
- Preservar o comportamento do botão "Ver prazo" para que continue funcionando como link independente.

### 2. Feedback visual
- Adicionar cursor pointer no card para indicar que é clicável.
- Manter o efeito de hover existente.

### 3. Acessibilidade
- Adicionar `role="button"` e `tabIndex={0}` ao card para suporte a teclado.
- Tratar a tecla Enter/Espaço para abrir o menu.

## Arquivos afetados
- `src/components/Planejador/PlanejadorRevisionaisView.tsx` — alteração no componente `RevisionalCard`

## Impacto
- **UX:** O usuário pode clicar em qualquer lugar do card para acessar ações (Editar, Atribuir, Arquivar, etc.), reduzindo a área de precisão necessária.
- **Dados:** Nenhuma alteração no schema ou dados.
- **Riscos:** O link "Ver prazo" dentro do card deve continuar funcionando sem conflito com o clique geral do card (propagação de evento deve ser controlada).

## Validação
- Verificar que o card abre o menu ao clicar.
- Verificar que o link "Ver prazo" ainda funciona.
- Verificar que o teclado (Enter/Tab) funciona corretamente.