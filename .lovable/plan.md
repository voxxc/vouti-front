

## Drawer de Projetos do CRM com a mesma largura do Vouti.Jurídico

### Causa raiz

A última alteração trocou `WhatsAppProjects` para `side="inset"`, que estica o drawer da sidebar do dashboard até a borda direita da tela (`right:0, w-auto`). O drawer do Vouti.Jurídico (`ProjectsDrawer`) usa `side="left-offset"`, que tem **largura fixa de 384px** (`w-96`) — estreito, igual a um painel lateral compacto.

Resultado: no CRM o drawer continua "largo" (estica até o fim da tela). O usuário quer o mesmo painel estreito do Jurídico.

Detalhe importante: ao **selecionar um projeto** dentro do drawer, ele renderiza `ProjectDrawerContent` (workspace completo do projeto) — esse conteúdo precisa de espaço amplo. Hoje, com `inset`, ele cabe. Se mudarmos para `left-offset` (384px), o conteúdo do projeto fica espremido.

### Correção

Adotar **largura dinâmica** em `WhatsAppProjects.tsx`:

- **Lista de projetos** (estado padrão, `selectedProjectId === null`): largura compacta igual ao Jurídico → `w-96` (384px), alinhado à sidebar do dashboard à esquerda.
- **Projeto selecionado** (`selectedProjectId !== null`): largura ampla → ocupa até a borda direita (comportamento atual `inset`), pois o workspace do projeto precisa de espaço.

Implementação: manter `side="inset"` (que já dá o posicionamento `top:49px`, `bottom:0`/`56px`, alinhado à sidebar do dashboard) e sobrescrever a largura via `className`:

```tsx
<SheetContent
  side="inset"
  className={cn(
    "p-0 flex flex-col transition-[width] duration-300",
    selectedProjectId ? "" : "!right-auto !w-96"
  )}
>
```

- Sem projeto selecionado: `!right-auto !w-96` força largura fixa de 384px (idêntico ao `left-offset` do Jurídico).
- Com projeto selecionado: sem override → mantém `right:0 w-auto` do `inset` (largura cheia para o workspace).
- Transição suave entre os dois estados.

### Arquivos afetados

**Modificado:**
- `src/components/WhatsApp/sections/WhatsAppProjects.tsx` (linhas 116–119) — adicionar largura condicional via `cn` no `className` do `SheetContent`. Nenhuma outra mudança.

**Sem mudanças:** `sheet.tsx`, `ProjectDrawerContent.tsx`, `ProjectsDrawer.tsx` (Jurídico), banco/RLS, hooks.

### Impacto

**Usuário final (UX):**
- Lista de Projetos no CRM passa a ter exatamente a mesma largura compacta (~384px) do Vouti.Jurídico — consistência visual entre os dois produtos.
- Ao clicar em um projeto, o drawer expande para largura cheia automaticamente, dando espaço ao workspace (Kanban, comentários, abas).
- Transição suave entre os dois estados (300ms).
- A sidebar interna do CRM continua visível ao fundo enquanto a lista está aberta.

**Dados:** zero impacto — mudança puramente visual (CSS condicional).

**Riscos colaterais:** nenhum. A lógica `selectedProjectId` já existe e controla a renderização interna.

**Quem é afetado:** todos os usuários do Vouti.CRM que abrem "Projetos" pela sidebar.

### Validação

1. Acessar `/crm/:tenant` → abrir "Projetos" na sidebar do WhatsApp.
2. Drawer abre com largura compacta (~384px), igual ao Jurídico — comparar lado a lado com `/:tenant/dashboard` → "Projetos".
3. Clicar em um projeto da lista → drawer expande para largura cheia (workspace do projeto completo, igual hoje).
4. Botão "voltar" no header do projeto → drawer encolhe novamente para 384px com a lista.
5. Mobile (<768px): drawer ocupa tela inteira nos dois estados (comportamento padrão do `inset`).
6. Tema claro e escuro: sem regressão visual.

