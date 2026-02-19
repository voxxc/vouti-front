

## Drawer de Projetos ocupando largura total

### Problema

O drawer de projetos no CRM abre com largura fixa (384px na lista, 900px com projeto selecionado), parando no meio da tela em vez de ir ate o final.

### Solucao

Alterar o `SheetContent` do `WhatsAppProjects.tsx` para incluir `right-0`, fazendo o drawer se estender da sidebar ate a borda direita da tela -- comportamento identico ao variant `inset`.

### Mudanca tecnica

**`src/components/WhatsApp/sections/WhatsAppProjects.tsx`**

Remover a logica de largura condicional (`isExpanded ? "!w-[900px]" : "!w-96"`) e adicionar `!right-0 !w-auto` ao className para que o drawer ocupe todo o espaco disponivel:

```text
// Antes:
className={cn(
  "p-0 flex flex-col transition-all duration-300",
  isExpanded ? "!w-[900px]" : "!w-96"
)}

// Depois:
className="p-0 flex flex-col !right-0 !w-auto"
```

Isso faz com que o drawer va de `left-[224px]` (definido pelo variant `left-offset`) ate `right-0`, ocupando toda a largura restante.

### Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/WhatsApp/sections/WhatsAppProjects.tsx` | Alterar className do SheetContent para largura total |

