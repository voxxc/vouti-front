## Causa raiz

O `PlanejadorTaskDetail` foi desenhado só para desktop:

- Overlay com card `max-w-6xl` dividido horizontalmente em duas colunas fixas: **45% Detalhes + 55% Chat** lado a lado.
- No mobile (390px) essas duas colunas viram ~175px cada, espremendo título, campos, sidebar de seções e o chat ao mesmo tempo.
- Padding interno (`p-5`, `px-5 py-4`) e fontes pensadas para desktop.
- O header tem "Voltar" + badge de status + X amontoados na mesma linha estreita.
- Tabs internas só alternam `Detalhes` / `Info`, então o Chat fica sempre visível roubando metade da tela.
- O card flutua com `my-4` e `rounded-2xl` — no mobile precisa ser fullscreen.

## Correção

Detectar mobile com `useIsMobile()` e renderizar um layout vertical fullscreen, mantendo o desktop intacto.

**Layout mobile (md:hidden)**
- Overlay sem `max-w-6xl`/`my-4`/`rounded-2xl`: ocupa `inset-0` inteiro, sem bordas arredondadas nem margem.
- Painel único em coluna (`flex-col`), sem split 45/55.
- Header compacto em 2 linhas:
  - Linha 1: botão Voltar (ícone só) + badge de status + X à direita.
  - Linha 2: título da tarefa em destaque (`text-base font-semibold`), editável ao tocar (vira input).
- Adicionar uma 3ª tab: **Detalhes | Chat | Info** — no mobile o Chat passa a ser uma tab dedicada em vez de coluna fixa. Desktop continua com 2 tabs + chat lateral.
- Conteúdo das tabs com padding maior e respiro: `px-4 py-4 space-y-4` em vez de `p-5 space-y-5` apertado dentro de 175px.
- Sidebar de seções (subtarefas/etapas/arquivos/etc.) que hoje fica embutida no Detalhes vira lista de cards empilhados com toque grande (min `h-12`), abrindo cada seção como sheet/bottom-sheet em vez de expansão inline.
- Bottom Actions (Iniciar/Concluir/Excluir) viram barra fixa no rodapé com botões de largura igual (`flex-1`) e altura confortável (`h-11`).
- Diálogos secundários (Participantes, Cliente Info, Editar Prazo) já usam `Dialog` shadcn — só garantir `max-w-[95vw]` no mobile.

**Layout desktop (md:)**
- Mantém exatamente o atual: card 6xl, split 45/55, chat lateral, 2 tabs.

## Arquivos afetados

- `src/components/Planejador/PlanejadorTaskDetail.tsx` — adicionar `useIsMobile()`, branch de layout mobile, terceira tab "Chat", ajustes de padding/espaçamento, header em 2 linhas, bottom bar fixa.

Nenhuma mudança em hooks, dados ou outros componentes.

## Impacto

1. **Usuário final (UX)**: no mobile, ao abrir uma tarefa do Planejador agora tudo tem espaço real — título legível, campos com toque confortável, chat em tab própria com largura total, seções em lista clara. No desktop nada muda visualmente.
2. **Dados**: zero. Nenhuma migration, RLS ou query alterada.
3. **Riscos colaterais**: precisa garantir que o `PlanejadorTaskChat` funcione bem em viewport estreita (já é um chat — deve estar OK, mas vale conferir). Z-index dos diálogos internos (Participantes, EditarPrazo, ClienteInfo) precisa continuar acima do overlay fullscreen mobile — já estão em `z-[90]` ou padrão Dialog `z-50`, ajustaremos se necessário para ficar acima do `z-[60]` do detail.
4. **Quem é afetado**: todos os usuários que abrem o Planejador no mobile (qualquer role, qualquer tenant). Desktop inalterado.

## Validação

- Mobile 390px → abrir Planejador → tocar em uma tarefa: dialog ocupa tela inteira, sem split.
- Header mostra Voltar + status + X sem quebrar; título em segunda linha.
- Tabs: Detalhes / Chat / Info — alternar entre elas funciona, chat ocupa largura total.
- Bottom bar fixa com Iniciar/Concluir/Excluir acessíveis sem scroll.
- Abrir Participantes / Editar Prazo / Cliente Info — diálogos aparecem acima do detail.
- Desktop ≥768px → layout antigo intacto (split 45/55, chat lateral, 2 tabs).