
# Ajuste da Direção dos Drawers

## Problema Atual

A variante `inset` no `sheet.tsx` está configurada com animação da **direita para esquerda**:

```typescript
inset: "... data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
```

## Solução

Alterar as classes de animação para que o drawer deslize da **esquerda para direita**:

| Propriedade | Atual | Novo |
|-------------|-------|------|
| Entrada | `slide-in-from-right` | `slide-in-from-left` |
| Saída | `slide-out-to-right` | `slide-out-to-left` |

## Arquivo a Modificar

**`src/components/ui/sheet.tsx`** - linha 42-43

### Código Atual:
```typescript
inset:
  "top-[57px] md:left-[224px] left-0 right-0 bottom-0 w-auto h-auto border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
```

### Código Corrigido:
```typescript
inset:
  "top-[57px] md:left-[224px] left-0 right-0 bottom-0 w-auto h-auto border-l data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
```

## Resultado

- Drawer abrirá deslizando da esquerda para direita (aparece vindo da sidebar)
- Drawer fechará deslizando da direita para esquerda (volta para a sidebar)
- Movimento mais natural considerando que a sidebar está à esquerda
