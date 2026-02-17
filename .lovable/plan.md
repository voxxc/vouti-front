

## Restaurar aba "Processos" no CRM (manter Processos + Colunas)

### O que muda

Atualmente, quando `module === 'crm'`, todas as 3 abas de navegacao (Processos, Casos, Colunas) estao escondidas e o view vai direto para "Colunas". O usuario quer que o CRM tenha **duas** abas visiveis:

- **Processos** - para organizar por protocolos/processos
- **Colunas** (Kanban) - para organizar visualmente em colunas

A aba **"Casos"** continua escondida no CRM.

---

### Arquivo a modificar

| Arquivo | Acao |
|---|---|
| `src/pages/ProjectView.tsx` | Alterar a condicao das tabs para mostrar "Processos" e "Colunas" no CRM, escondendo apenas "Casos" |

---

### Detalhes tecnicos

**ProjectView.tsx (linhas ~1144-1189)**

Substituir o bloco `{module !== 'crm' && ( <div className="flex gap-6"> ... </div> )}` por uma logica que:

1. **Sempre mostra** as tabs de navegacao (remover o wrapper `module !== 'crm'`)
2. **Esconde apenas** o botao "Casos" quando `module === 'crm'`
3. O `activeTab` default para CRM pode ser `'protocolos'` ou `'colunas'` (manter `'colunas'` como ja esta)

O resultado sera:

```text
// Sempre visivel:
<div className="flex gap-6">
  <button>Processos</button>          // sempre visivel
  {module !== 'crm' && (
    <button>Casos</button>             // escondido no CRM
  )}
  <button>Colunas</button>            // sempre visivel
</div>
```

Nenhuma outra alteracao e necessaria -- o conteudo das abas (`ProjectProtocolosList` e o Kanban) ja esta implementado e funciona independente do modulo.

