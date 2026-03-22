
## Revisão do que vou ajustar

Vou tratar os 4 pontos juntos, porque eles se cruzam no mesmo fluxo do Planejador e dos prazos.

### 1) Renomear “Proprietário” para “Criado por”
Ajustar todos os pontos visíveis no Planejador onde hoje aparece “Proprietário”, para ficar consistente com o resto do sistema.

**Onde revisar:**
- `PlanejadorTaskDetail.tsx`
  - bloco de campos da aba **Detalhes**
  - bloco de **Informações Gerais** da aba **Info**
  - dialog de **Participantes** (onde hoje distingue o dono/criador)

**Ajuste esperado:**
- `Proprietário` → `Criado por`
- onde fizer sentido, `Dono` → `Criador`

---

### 2) Editar prazo direto na tarefa, com motivo obrigatório para alterar data
Hoje a tarefa já lista os **Prazos Relacionados**, mas sem ação direta de edição. Vou adicionar um botão ícone ao lado de cada prazo.

**Implementação planejada:**
- Em `PlanejadorTaskDetail.tsx`
  - na seção **Prazos Relacionados**, adicionar botão com ícone `Pencil` ao lado do nome/status do prazo
  - ao clicar, abrir o fluxo de edição do prazo
- Reaproveitar `EditarPrazoDialog.tsx` em vez de criar outro editor do zero
- Buscar o registro completo do prazo selecionado antes de abrir o dialog, para popular corretamente o formulário

**Regra nova do fluxo:**
- se a **data** do prazo for alterada, o campo **Motivo da alteração** passa a ser obrigatório
- esse motivo será gravado em `deadline_comentarios`

**Registro no bate-papo do prazo:**
- manter o comentário genérico de edição
- adicionar um comentário específico para mudança de data, algo como:
```text
📅 Data do prazo alterada
De: 10/04/2026
Para: 15/04/2026
Motivo: ...
Alterado por: ...
```

**Arquivos principais:**
- `src/components/Planejador/PlanejadorTaskDetail.tsx`
- `src/components/Agenda/EditarPrazoDialog.tsx`

---

### 3) Busca por mensagem no bate-papo do prazo
O componente de comentários do prazo já existe; vou adicionar busca local para filtrar rapidamente o histórico.

**Implementação planejada:**
- Em `DeadlineComentarios.tsx`
  - adicionar campo de busca no topo da aba de comentários
  - filtrar por:
    - texto do comentário
    - nome do autor
- manter a lista em tempo real como está hoje
- mensagem vazia específica quando não houver resultados para a busca

**Sem mudança de banco**
- isso pode ser resolvido no frontend com os comentários já carregados por `useDeadlineComentarios`

**Arquivos:**
- `src/components/Agenda/DeadlineComentarios.tsx`
- opcionalmente `src/hooks/useDeadlineComentarios.ts` apenas se eu precisar expor metadados extras, mas a princípio não é necessário

---

### 4) Corrigir de vez a falta de interatividade da tarefa
Pelo código atual, o detalhe da tarefa está sendo renderizado via `createPortal(..., document.body)` fora do contexto do `Sheet` do Planejador. Como o `Sheet` do Radix continua modal/focus-trapped, isso explica o sintoma: a tarefa parece aberta, mas campos e inputs não recebem interação corretamente.

## Causa provável
Hoje existem dois layers separados:
```text
Sheet do Planejador (Radix modal/focus trap)
└── Drawer principal

Portal solto no body
└── Detalhe da tarefa
```

Isso gera conflito de foco/teclado/pointer entre o drawer modal e o detalhe aberto por fora.

## Correção planejada
Fazer o detalhe da tarefa pertencer ao mesmo contexto visual/interativo do Planejador, em vez de continuar “solto” no `document.body`.

### Ajuste principal
- remover a dependência do portal solto para o detalhe da tarefa
- renderizar o `PlanejadorTaskDetail` dentro da árvore do `PlanejadorDrawer`/`SheetContent`
- usar posicionamento absoluto/inset dentro do drawer para manter o visual sobreposto, mas sem quebrar foco e digitação

### Complementos
- manter ESC fechando a tarefa antes do drawer
- garantir `pointer-events-auto` nas áreas editáveis
- impedir que backdrop/container capture cliques destinados aos inputs
- validar especificamente:
  - digitação no título
  - digitação na descrição
  - digitação em subtarefa
  - busca de cliente/processo/participantes
  - chat da tarefa

**Arquivos principais:**
- `src/components/Planejador/PlanejadorDrawer.tsx`
- `src/components/Planejador/PlanejadorTaskDetail.tsx`

---

## Ordem de implementação

1. Corrigir a arquitetura de renderização do detalhe da tarefa para restaurar a interatividade
2. Renomear “Proprietário” para “Criado por” em toda a interface da tarefa
3. Adicionar edição de prazo por ícone dentro de **Prazos Relacionados**
4. Tornar obrigatório o motivo quando a data do prazo mudar e registrar isso em `deadline_comentarios`
5. Adicionar busca no bate-papo/comentários do prazo

---

## Resultado esperado

Ao final:
- a tarefa volta a ser totalmente interativa
- “Proprietário” deixa de aparecer e passa a ser “Criado por”
- cada prazo relacionado na tarefa terá um botão de edição
- mudar a data exigirá motivo e isso ficará registrado no histórico/comentários do prazo
- o bate-papo do prazo terá busca por mensagem/autor

## Arquivos que devo revisar
- `src/components/Planejador/PlanejadorDrawer.tsx`
- `src/components/Planejador/PlanejadorTaskDetail.tsx`
- `src/components/Agenda/EditarPrazoDialog.tsx`
- `src/components/Agenda/DeadlineComentarios.tsx`
- `src/components/Agenda/DeadlineDetailDialog.tsx` (para manter consistência do fluxo de edição, se necessário)
