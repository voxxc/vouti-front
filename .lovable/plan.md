
# Minimalizar o Botao Setores (Dropdown)

## Estado Atual

O botao Setores usa o componente `Button` com `variant="outline"`, incluindo icone e seta:

```tsx
<Button variant="outline" className="gap-2">
  <Layers size={16} />
  Setores
  <ChevronDown size={14} />
</Button>
```

## Objetivo

Transformar em texto clicavel minimalista, igual aos outros botoes (Participantes, Dados, Historico), mas mantendo a funcionalidade de dropdown.

## Mudanca Proposta

### Arquivo: `src/components/Project/SetoresDropdown.tsx`

**De (linhas 71-77):**
```tsx
<DropdownMenuTrigger asChild>
  <Button variant="outline" className="gap-2">
    <Layers size={16} />
    Setores
    <ChevronDown size={14} />
  </Button>
</DropdownMenuTrigger>
```

**Para:**
```tsx
<DropdownMenuTrigger asChild>
  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
    Setores
    <ChevronDown size={12} className="opacity-50" />
  </button>
</DropdownMenuTrigger>
```

## Detalhes da Mudanca

| Elemento | Antes | Depois |
|----------|-------|--------|
| Componente | `Button` com `variant="outline"` | `button` nativo |
| Icone Layers | Visivel | Removido |
| Seta ChevronDown | 14px | 12px, com opacidade 50% |
| Estilo | Borda, padding, background | Texto simples, sem borda |

## Resultado Visual

```
Participantes    Dados    Historico    Setores ˅
```

Todos os itens agora seguem o mesmo padrao minimalista de texto clicavel.

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Project/SetoresDropdown.tsx` | Trocar Button por button minimalista, remover icone Layers, reduzir seta |
