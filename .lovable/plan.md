

# Corrigir Animacao do Drawer Inset

## Problema

A classe `slide-in-from-left` do Tailwind faz o drawer comecar completamente fora da tela (translateX: -100%) e animar ate a posicao final. Isso cria o efeito visual de o drawer "passar por cima" da sidebar durante a animacao.

## Conceito Visual - Problema Atual

```text
        Animacao atual:
        
        ←──────────────────────┐
        [  DRAWER  ]           │ Drawer vem de FORA da tela
        ←──────────────────────┘ passando por cima da sidebar
        
┌──────────┬───────────────────────────────────────┐
│          │                                       │
│ SIDEBAR  │     Area de conteudo                  │
│          │                                       │
└──────────┴───────────────────────────────────────┘
```

## Conceito Visual - Resultado Desejado

```text
        Animacao corrigida:
        
                   ←──────────┐
                   [ DRAWER ] │ Drawer aparece da borda da
                   ←──────────┘ sidebar com fade
        
┌──────────┬───────────────────────────────────────┐
│          │                                       │
│ SIDEBAR  │     Area de conteudo                  │
│          │                                       │
└──────────┴───────────────────────────────────────┘
```

## Solucao

Substituir a animacao de slide por uma animacao de **fade + leve translate** que nao ultrapassa os limites da sidebar. O drawer aparecera da borda da sidebar com um efeito suave.

### Opcao 1: Usar fade-in com translate sutil (Recomendada)

Criar uma animacao customizada que faz o drawer aparecer com fade e um pequeno deslocamento (ex: 20px), nao mais vindo de fora da tela.

### Opcao 2: Usar clip-path para "cortar" a animacao

Aplicar `overflow-hidden` em um container que englobe apenas a area de conteudo, mas isso seria mais complexo.

---

## Implementacao - Opcao 1

### 1. Adicionar keyframes customizados no tailwind.config.ts

```typescript
keyframes: {
  // ... existentes ...
  "drawer-in": {
    "0%": { opacity: "0", transform: "translateX(-20px)" },
    "100%": { opacity: "1", transform: "translateX(0)" }
  },
  "drawer-out": {
    "0%": { opacity: "1", transform: "translateX(0)" },
    "100%": { opacity: "0", transform: "translateX(-20px)" }
  },
},
animation: {
  // ... existentes ...
  "drawer-in": "drawer-in 0.3s ease-out",
  "drawer-out": "drawer-out 0.2s ease-out",
},
```

### 2. Atualizar a variante inset no sheet.tsx

```typescript
inset:
  "top-[57px] md:left-[224px] left-0 right-0 bottom-0 w-auto h-auto border-l data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in",
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `tailwind.config.ts` | Adicionar keyframes `drawer-in` e `drawer-out` |
| `src/components/ui/sheet.tsx` | Trocar classes de animacao na variante `inset` |

---

## Resultado

- Drawer aparece com fade suave + leve movimento da esquerda
- Animacao nao ultrapassa a borda da sidebar
- Visual limpo e integrado
- Sidebar permanece visivel durante toda a transicao

