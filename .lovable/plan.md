
## Objetivo
Corrigir o desalinhamento no lado direito da aba **OABs** (Controladoria), garantindo que:
- A **borda direita** dos cards de processos volte a aparecer por inteiro.
- Os botões de ação (**Excluir** / **Detalhes**) fiquem **mais à esquerda**, sem “sumirem” (principalmente quando aparece a scrollbar).

## Diagnóstico (causa mais provável)
Hoje a lista está dentro de um container com:
- `overflow-x-hidden` + `pr-4` no scroll container
- e os cards/ações ficam muito “colados” na borda direita.

Em ambientes com **scrollbar overlay** (comum no Windows/alguns browsers), a barra pode **sobrepor** o conteúdo da direita. Resultado:
- parece que “sumiu a borda lateral direita”
- e os botões ficam parcialmente/totalmente escondidos atrás da scrollbar/recorte do overflow.

Além disso, `overflow-x-hidden` no container do scroll pode recortar efeitos visuais (borda/sombra) quando algo encosta exatamente no limite direito.

## Ajustes propostos (sem mudar regra de negócio)
### 1) Ajustar o container de scroll da lista (OABTab)
Arquivo: `src/components/Controladoria/OABTab.tsx`

**Mudança**
- Trocar o `overflow-x-hidden` por um comportamento que não recorte a lateral direita do conteúdo.
- Manter um “gutter” para a scrollbar, mas sem cortar borda.

**Como**
- Atualizar a div da lista (atual linha ~631):

Antes:
```tsx
<div className="h-[calc(100vh-320px)] overflow-y-auto overflow-x-hidden pr-4">
```

Depois (opção recomendada):
```tsx
<div className="h-[calc(100vh-320px)] overflow-y-auto overflow-x-visible pr-4">
```

Se ainda houver recorte em algum browser, alternativa:
- remover o `pr-4` do scroll container e colocar padding no conteúdo interno:
```tsx
<div className="h-[calc(100vh-320px)] overflow-y-auto overflow-x-visible">
  <div className="space-y-4 pr-4">
    ...
  </div>
</div>
```
Assim o “espaço da scrollbar” vira padding do conteúdo (mais previsível).

### 2) “Puxar” os botões para dentro do card (mais à esquerda)
Arquivo: `src/components/Controladoria/OABTab.tsx`
Componente: `ProcessoCard`

**Mudança**
Adicionar um padding à direita no container horizontal do card para que as ações não fiquem coladas na borda (e não caiam atrás da scrollbar).

Antes:
```tsx
<div className="flex items-center gap-3 w-full overflow-hidden">
```

Depois:
```tsx
<div className="flex items-center gap-3 w-full overflow-hidden pr-2">
```

E reforçar que o bloco de ações não encosta na borda:
Antes:
```tsx
<div className="flex items-center gap-1 shrink-0">
```

Depois:
```tsx
<div className="flex items-center gap-1 shrink-0 ml-2">
```

### 3) (Opcional, se necessário) Garantir que o Card respeite 100% da largura disponível
Ainda no `ProcessoCard`, se a borda estiver “quebrando” por conta de algum layout do Droppable, podemos reforçar:
```tsx
<Card className="p-3 w-full transition-shadow ...">
```

## Critérios de aceite (o que você deve ver)
1. Em **todas** as resoluções (principalmente onde aparece scrollbar), a **borda direita** do card fica visível.
2. Os botões **Excluir** e **Detalhes** ficam sempre visíveis e com uma folga da borda direita (mais “para dentro”).
3. Textos longos continuam truncando com `...` e não empurram as ações para fora.

## Teste rápido (checklist)
- Abrir Controladoria → OABs → entrar numa OAB com processos com nomes longos.
- Forçar a lista a ter scrollbar (rolar).
- Verificar os botões em:
  - Chrome/Edge (Windows se possível)
  - Tela menor (ex.: 1366px de largura)
- Confirmar que não existe scroll horizontal e que nenhum card fica “cortado” na direita.

## Arquivos envolvidos
- `src/components/Controladoria/OABTab.tsx` (somente ajustes de classes Tailwind/layout)
