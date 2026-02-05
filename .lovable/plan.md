
# Corrigir Layout dos Botões no TenantCard

## Problema Identificado

O card de cada tenant possui **8 elementos de ação** em uma única linha horizontal (`flex items-center gap-2`), causando overflow em telas menores ou quando o grid tem 3 colunas:

```text
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Nome do Cliente                      [Switch]       │
│  [Badge] [Plano]                                            │
│  ─────────────────────────────────────────────────────────  │
│  [Configurar▼][📊][📈][🔑][#][💳][🔗][🗑️]  ← OVERFLOW!      │
└─────────────────────────────────────────────────────────────┘
```

## Solução Proposta

Reorganizar os botões em **duas linhas** para melhor distribuição:

```text
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Nome do Cliente                      [Switch]       │
│  [Badge] [Plano]                                            │
│  ─────────────────────────────────────────────────────────  │
│  [Configurar▼]                       [🔗 Acessar] [🗑️]      │
│  [📊][📈][🔑][#][💳]  ← Ferramentas                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Alterações no TenantCard.tsx

### Estrutura Atual (Linha 112-233)
```tsx
<div className="flex items-center gap-2 pt-3 border-t border-border">
  {/* 8 botões em uma única linha */}
</div>
```

### Nova Estrutura
```tsx
<div className="pt-3 border-t border-border space-y-2">
  {/* Linha 1: Ações principais */}
  <div className="flex items-center gap-2">
    <DropdownMenu>...</DropdownMenu>
    <div className="flex-1" /> {/* Spacer */}
    <Button>Acessar</Button>
    <AlertDialog>Excluir</AlertDialog>
  </div>
  
  {/* Linha 2: Ferramentas (ícones menores) */}
  <div className="flex items-center gap-1 justify-start">
    <Button size="icon">Stats</Button>
    <Button size="icon">Activity</Button>
    <Button size="icon">Key</Button>
    <Button size="icon">Hash</Button>
    <Button size="icon">CreditCard</Button>
  </div>
</div>
```

---

## Detalhes da Implementação

| Elemento | Posição | Justificativa |
|----------|---------|---------------|
| Dropdown "Configurar" | Linha 1, esquerda | Ação principal de configuração |
| Botão "Acessar" | Linha 1, direita | Ação frequente, destaque |
| Botão "Excluir" | Linha 1, extrema direita | Ação destrutiva separada |
| Botões de ferramentas | Linha 2 | Agrupados, menor prioridade visual |

---

## Mudanças nos Botões

1. **Reduzir tamanho dos botões de ferramentas**: Usar `size="icon"` com padding menor
2. **Remover `flex-1` do dropdown**: Largura fixa para não expandir demais
3. **Adicionar `flex-wrap`**: Fallback caso ainda transborde em telas muito pequenas

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/SuperAdmin/TenantCard.tsx` | Reorganizar layout dos botões em duas linhas |

---

## Resultado Visual Esperado

```text
┌───────────────────────────────────────┐
│  [S] Solvenza                   [🔘]  │
│  solvenza                             │
│  [Ativo] [Solo]                       │
│  ─────────────────────────────────────│
│  [⚙️ Configurar ▼]    [🔗] [🗑️]       │
│  [📊] [📈] [🔑] [#] [💳]              │
└───────────────────────────────────────┘
```

Os botões agora cabem confortavelmente dentro do card, mesmo em grids de 3 colunas.
