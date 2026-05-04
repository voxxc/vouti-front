# Redesign do Card de Reunião

## Objetivo
- Remover o botão "Ver ficha do lead" do card (ficará apenas no modal de detalhes).
- Tornar os botões "Desmarcada" e "Remarcada" mais compactos e visualmente discretos.
- Limpar o layout do card.

## Mudanças

### 1. `src/components/Reunioes/ReuniaoCard.tsx`
- **Remover** completamente o bloco do botão `Ver ficha do lead` (e a prop `onAbrirCliente`).
- **Tornar o nome do cliente clicável**: o nome do lead vira um link sutil (hover sublinhado, cor primary) que abre a ficha — substitui o botão grande, mas mantém o atalho.
- **Redesign dos botões de situação**:
  - Trocar de `variant="outline"` largura total → ícones pequenos (`size="icon"` ou `ghost`) à direita do header do card.
  - Usar `Tooltip` para indicar "Desmarcar" / "Remarcar" no hover.
  - Remover o `border-t` separador.
- Reorganizar visualmente:
  - Linha 1: título + badge status + ícones de ação (desmarcar/remarcar) à direita
  - Linha 2: nome do cliente (clicável se houver lead resolvível) com ícone User
  - Linha 3: telefone + duração inline (compactos)
  - Linha 4: "Agendado por" em texto pequeno
  - Descrição opcional, pequena

### 2. `src/components/Reunioes/ReunioesContent.tsx`
- Manter `onAbrirCliente` passado ao `ReuniaoCard` (agora usado pelo nome clicável).
- Manter o botão "Ver ficha do lead" no modal de detalhes (já existe).

## Resultado
Card mais limpo, com ações secundárias compactas via ícones, e o atalho do lead preservado de forma sutil pelo nome clicável.
