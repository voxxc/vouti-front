
# Plano: Adicionar Filtro "Monitorados" na Aba OABs

## Contexto

O `OABTab.tsx` já possui um sistema de filtros implementado através de um `Select` com as opções:
- "Todos os processos"
- "Compartilhados" (processos em múltiplas OABs)
- "Com novos andamentos" (andamentos não lidos)
- Filtros por UF (SP, PR, RJ, etc.)

## O Que Será Adicionado

Um novo filtro **"Monitorados"** que exibe apenas os processos com `monitoramento_ativo = true`.

---

## Alterações no Arquivo

**Arquivo:** `src/components/Controladoria/OABTab.tsx`

### 1. Adicionar Contagem de Monitorados (após linha ~435)

```tsx
// Contagem de processos monitorados
const monitoradosCount = useMemo(() => {
  return processos.filter(p => p.monitoramento_ativo === true).length;
}, [processos]);
```

### 2. Adicionar Condição no Filtro (linhas 450-459)

Atualizar o `processosFiltrados` para incluir o filtro de monitorados:

```tsx
const processosFiltrados = useMemo(() => {
  if (filtroUF === 'todos') return processos;
  if (filtroUF === 'compartilhados') {
    return processos.filter(p => compartilhadosMap[p.numero_cnj]);
  }
  if (filtroUF === 'nao-lidos') {
    return processos.filter(p => (p.andamentos_nao_lidos || 0) > 0);
  }
  // NOVO: Filtro de monitorados
  if (filtroUF === 'monitorados') {
    return processos.filter(p => p.monitoramento_ativo === true);
  }
  return processos.filter(p => extrairUF(p.tribunal_sigla, p.numero_cnj) === filtroUF);
}, [processos, filtroUF, compartilhadosMap]);
```

### 3. Adicionar Item no Select (na área de renderização do Select)

Adicionar a opção após "Com novos andamentos":

```tsx
{monitoradosCount > 0 && (
  <SelectItem value="monitorados">
    <span className="flex items-center gap-2">
      <Bell className="w-4 h-4 text-green-500" />
      Monitorados ({monitoradosCount})
    </span>
  </SelectItem>
)}
```

---

## Layout Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│ Filtro por UF:  [▼ Todos os processos                        ]  │
│                 ├─ Todos os processos                           │
│                 ├─ 👥 Compartilhados (3)                        │
│                 ├─ 🔔 Com novos andamentos (5)                  │
│                 ├─ 🟢 Monitorados (12)         ← NOVO          │
│                 ├─ SP (45)                                      │
│                 ├─ PR (23)                                      │
│                 └─ RJ (8)                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Controladoria/OABTab.tsx` | Adicionar contagem, condição de filtro e item no Select |

---

## Resultado Esperado

1. Novo item "Monitorados (X)" aparece no dropdown de filtros
2. Ao selecionar, exibe apenas processos com `monitoramento_ativo = true`
3. Contador mostra quantos processos estão sendo monitorados
4. Ícone de sino verde diferencia visualmente dos outros filtros
