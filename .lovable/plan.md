

## Controladoria — OABs e Instâncias minimalistas

### Mudanças

**Dois arquivos, dois ajustes:**

---

### 1. `src/components/Controladoria/OABManager.tsx` — Tabs de OAB e Toolbar

**Tabs (linhas 277-296):** Trocar o `TabsList` + `TabsTrigger` (estilo botão com fundo) por um menu de texto clicável com underline, igual ao padrão do `ControladoriaContent.tsx` (Central / OABs / Push-Doc):

```text
Antes:  [ 92124/SP ]  [ 45678/RJ ]    ← botões com fundo
Depois:  92124/SP    45678/RJ           ← texto clicável, underline na ativa
```

Substituir `TabsList`/`TabsTrigger` por botões simples com `cn()` e a linha `bg-primary` de 0.5 abaixo, dentro de um `flex gap-6 border-b`. Manter o `Badge` com contagem ao lado do nome.

**Toolbar da OAB (linhas 301-347):** Remover o estilo card (`p-3 bg-muted/30 rounded-lg`), deixar como um layout inline simples — apenas `flex items-center justify-between py-2`. Os botões de ação (editar, excluir, importar CNJ) ficam na mesma linha, sem borda/fundo.

---

### 2. `src/components/Controladoria/OABTab.tsx` — Seções de Instância

**`InstanciaSection` (linhas 316-327):** Trocar o estilo card do `CollapsibleTrigger`:

```text
Antes:  ┌─────────────────────────────────┐
        │ 📄 1ª Instância     (12)     ▼  │  ← border, bg, rounded, p-3
        └─────────────────────────────────┘

Depois:  📄 1ª Instância (12)          ▼    ← sem borda/fundo, nome clicável
```

Na linha 318, substituir:
```
className={`w-full flex items-center gap-2 p-3 rounded-lg border ${corBg} ${corBorder} hover:opacity-90 transition-opacity`}
```
Por:
```
className={`w-full flex items-center gap-2 py-2 hover:opacity-80 transition-opacity`}
```

Remover `p-3`, `rounded-lg`, `border`, `${corBg}`, `${corBorder}`. Manter o texto colorido (`${corText}`), o badge e o chevron. A `border-l-2` colorida nos processos abaixo permanece.

---

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/components/Controladoria/OABManager.tsx` | Tabs → texto clicável com underline; Toolbar → sem estilo card |
| `src/components/Controladoria/OABTab.tsx` | `InstanciaSection` header → sem estilo card, minimalista |

