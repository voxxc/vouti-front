

## Redesign visual das origens no detalhamento de prazo

### Conceito

Substituir os blocos/cards atuais (processoOrigem, protocoloOrigem, casoVinculado, protocoloVinculado) por uma navegação em abas estilo Extras — nomes clicáveis com underline, onde o primeiro é sempre a origem e o segundo é o vinculado.

### Mudança em `src/components/Agenda/AgendaContent.tsx`

**Linhas ~1079-1230**: Substituir os 4 blocos independentes por:

1. **State local**: `originTab: 'origem' | 'vinculado'` (default `'origem'`)
2. **Barra de abas** com botões texto estilo TabButton do Extras:
   - Primeiro botão: nome da origem (ex: "Processo Judicial" ou "Processo de Origem") — sempre visível se existir
   - Segundo botão: nome do vinculado (ex: "Caso Vinculado" ou "Processo Vinculado") — só aparece se existir
   - Estilo: `text-sm font-medium`, underline primário no ativo, `text-muted-foreground` no inativo
3. **Conteúdo condicional**: renderiza os detalhes (CNJ, partes, tribunal, botão "Ver") conforme a aba selecionada

Isso mantém toda a lógica existente de onClick (abrir drawer do caso, navegar para projeto), apenas reorganiza visualmente.

