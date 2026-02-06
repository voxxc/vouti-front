
# Ajustar Estilo dos Nomes de Clientes

## Resumo
Alterar a cor dos nomes dos clientes nas listas de Clientes e Financeiro para que fiquem em branco no modo escuro, mantendo legibilidade no modo claro, e remover o efeito de sublinhado ao passar o mouse.

---

## Problema Atual

Os nomes de clientes usam `text-primary hover:underline`:
- A cor `text-primary` pode não ficar ideal em modo escuro
- O sublinhado no hover adiciona ruído visual desnecessário

---

## Solução

Trocar a classe de estilo para:
```
text-foreground hover:text-foreground/80
```

Isso garante:
- **Modo claro**: texto em cor escura (padrão do tema)
- **Modo escuro**: texto em branco (padrão do tema)
- **Sem sublinhado** no hover
- **Efeito sutil** de opacidade ao passar o mouse

---

## Arquivos a Modificar

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `src/components/CRM/ClientesLista.tsx` | 160 | Trocar classe do botão de nome |
| `src/components/Financial/FinancialContent.tsx` | 292 | Trocar classe do botão de nome |

---

## Alterações

### ClientesLista.tsx (linha 160)

**De:**
```tsx
className="font-medium text-primary hover:underline text-left"
```

**Para:**
```tsx
className="font-medium text-foreground hover:text-foreground/80 text-left transition-colors"
```

### FinancialContent.tsx (linha 292)

**De:**
```tsx
className="text-sm font-medium text-primary hover:underline text-left"
```

**Para:**
```tsx
className="text-sm font-medium text-foreground hover:text-foreground/80 text-left transition-colors"
```

---

## Resultado Visual

| Modo | Antes | Depois |
|------|-------|--------|
| Claro | Azul com sublinhado | Texto escuro, sem sublinhado |
| Escuro | Azul com sublinhado | Texto branco, sem sublinhado |

O texto continua clicável mas com aparência mais limpa e integrada ao design minimalista do sistema.
