

## Drawer de Projetos no CRM com tamanho igual ao Vouti.Jurídico

### Causa raiz

O drawer `WhatsAppProjects` (CRM) usa `side="left-offset"` com overrides `!right-0 !w-auto` e `left:56px` (quando colapsado). Resultado: ele se estica do início do conteúdo até a borda direita, ficando enorme em telas largas.

Já o `ProjectDrawer` do Vouti.Jurídico usa `side="inset"`, que abre alinhado ao layout do dashboard (`top:49px, left:224px (md), right:0, bottom:56px (mobile) / 0 (md)`) — mesmo padrão visual usado por todos os drawers do app jurídico (`ReunioesDrawer`, `ControladoriaDrawer`, etc.).

### Correção

Em `src/components/WhatsApp/sections/WhatsAppProjects.tsx` (linhas 115–120):

1. Trocar `side="left-offset"` por `side="inset"`.
2. Remover os overrides `!right-0 !w-auto` e o `style` inline com `left:56px`.
3. Remover o prop `sidebarCollapsed` da interface e dos chamadores (não é mais usado), ou mantê-lo opcional ignorado para não quebrar `WhatsAppDrawer.tsx` e `WhatsAppLayout.tsx` que ainda passam o valor.

Resultado: o drawer de Projetos do CRM passa a ter exatamente as mesmas dimensões e posicionamento do drawer de Projeto do Vouti.Jurídico.

### Arquivos afetados

**Modificado:**
- `src/components/WhatsApp/sections/WhatsAppProjects.tsx` — trocar variante do `SheetContent` para `inset` e limpar overrides; manter `sidebarCollapsed` como prop opcional ignorado.

**Sem mudanças:** `sheet.tsx` (variantes já existentes), `WhatsAppDrawer.tsx`, `WhatsAppLayout.tsx`, `ProjectDrawerContent.tsx`, banco/RLS.

### Impacto

**Usuário final (UX):**
- Drawer de Projetos no CRM (`/crm/:tenant`) abre com o mesmo tamanho do drawer de Projetos do Vouti.Jurídico — encaixado no conteúdo principal, sem se esticar exageradamente.
- Consistência visual entre os dois produtos (CRM e Jurídico).
- A sidebar interna do WhatsApp continua visível ao fundo, igual aos demais drawers do CRM.

**Dados:** zero impacto — mudança puramente visual.

**Riscos colaterais:** nenhum. A variante `inset` já é usada por vários drawers e está testada.

**Quem é afetado:** todos os usuários do Vouti.CRM ao abrir "Projetos" pela sidebar.

### Validação

1. Acessar `/crm/:tenant` → abrir "Projetos" na sidebar do WhatsApp.
2. Confirmar que o drawer abre alinhado ao layout (top ~49px, esquerda colada na sidebar do dashboard ~224px em desktop, direita até a borda da tela, bottom até a barra mobile/0 em desktop).
3. Comparar lado a lado com o drawer de Projetos do Vouti.Jurídico (`/:tenant/dashboard` → atalho de projeto) — devem ter o mesmo tamanho.
4. Testar em mobile (<768px): drawer ocupa tela inteira sob o header e acima da `MobileBottomNav`.
5. Selecionar um projeto dentro do drawer → conteúdo do projeto ocupa o mesmo espaço.

