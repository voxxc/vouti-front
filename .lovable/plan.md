

# Ajustar Drawer de Projetos - Posicionamento e Visual

## Problemas Identificados

1. **Drawer sobrepoe a topbar**: A variante `left-offset` usa `inset-y-0` que posiciona o drawer do topo ate o fundo, cobrindo a topbar
2. **Drawer muito estreito**: Largura atual de 320px (`w-80`)
3. **Borda direita sem destaque**: Apenas uma linha simples, sem elemento visual elegante

## Conceito Visual

```text
ATUAL (problema):                       PROPOSTO (corrigido):
                                        
┌──────────┬───────────────────────┐    ┌──────────┬────────────────────────┐
│  SIDE    │ DRAWER│    TOPBAR    │    │  SIDE    │         TOPBAR         │
│  BAR     │ sobre │              │    │  BAR     ├────────┬───────────────┤
│          │ topbar│              │    │          │        │               │
│          ├───────┤              │    │          │ DRAWER │   (conteudo)  │
│          │       │              │    │          │ maior  │               │
│          │       │              │    │          │ +barra │               │
└──────────┴───────┴──────────────┘    └──────────┴────────┴───────────────┘
```

## Alteracoes

### 1. Arquivo: `src/components/ui/sheet.tsx`

Atualizar a variante `left-offset` para:
- Respeitar a topbar usando `top-[57px]` ao inves de `inset-y-0`
- Aumentar a largura para `w-96` (384px)
- Usar `bottom-0` para ocupar ate o final

```typescript
"left-offset":
  "top-[57px] bottom-0 md:left-[224px] left-0 h-auto w-96 border-l data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in",
```

### 2. Arquivo: `src/components/Projects/ProjectsDrawer.tsx`

Adicionar uma barra decorativa na borda direita do drawer para sinalizar visualmente o fim. Isso sera feito adicionando um elemento com gradiente sutil que vai de transparente ao fundo.

```tsx
<SheetContent side="left-offset" className="p-0 flex flex-col relative">
  {/* Conteudo existente */}
  
  {/* Barra decorativa de fechamento */}
  <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-border via-border/50 to-border pointer-events-none" />
</SheetContent>
```

Alternativa mais elegante - usar uma borda com sombra:

```tsx
<SheetContent 
  side="left-offset" 
  className="p-0 flex flex-col shadow-[4px_0_12px_-4px_rgba(0,0,0,0.15)]"
>
```

## Resultado Esperado

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Posicao vertical | Cobre a topbar | Comeca abaixo da topbar |
| Largura | 320px (w-80) | 384px (w-96) |
| Borda direita | Linha simples | Sombra elegante + borda |
| Alinhamento | Fora do grid | Alinhado com o layout |

