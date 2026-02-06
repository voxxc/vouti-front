
# Exibir Nome do Responsavel ao Lado do Titulo na Agenda

## Objetivo

Modificar a exibicao dos prazos na Agenda para mostrar o nome do responsavel junto com o titulo, no formato:

```
Alan | Documento de JG - Agravo...
```

---

## Locais a Modificar

A mudanca sera aplicada em todos os locais onde o titulo do prazo e exibido:

| Arquivo | Secao | Linha Atual |
|---------|-------|-------------|
| `src/pages/Agenda.tsx` | Prazos do dia selecionado | `{deadline.title}` |
| `src/pages/Agenda.tsx` | Prazos Vencidos | `{deadline.title}` |
| `src/pages/Agenda.tsx` | Proximos Prazos | `{deadline.title}` |
| `src/pages/Agenda.tsx` | Tabela Admin | `{deadline.title}` |
| `src/pages/Agenda.tsx` | Historico Cumpridos | `{deadline.title}` |
| `src/components/Agenda/AgendaContent.tsx` | Prazos do dia selecionado | `{deadline.title}` |
| `src/components/Agenda/AgendaContent.tsx` | Prazos Vencidos | `{deadline.title}` |
| `src/components/Agenda/AgendaContent.tsx` | Proximos Prazos | `{deadline.title}` |
| `src/components/Agenda/AgendaContent.tsx` | Tabela Admin | `{deadline.title}` |
| `src/components/Agenda/AgendaContent.tsx` | Historico Cumpridos | `{deadline.title}` |

---

## Formato de Exibicao

**De:**
```
Documento de JG - Agravo de Instrumento
```

**Para:**
```
Alan | Documento de JG - Agravo de Instrumento
```

Se nao houver responsavel atribuido, exibe apenas o titulo:
```
Documento de JG - Agravo de Instrumento
```

---

## Implementacao

Criar uma funcao helper para formatar o titulo com o nome do responsavel:

```typescript
const formatDeadlineTitle = (deadline: Deadline) => {
  const nome = deadline.advogadoResponsavel?.name;
  if (nome) {
    // Pega apenas o primeiro nome
    const primeiroNome = nome.split(' ')[0];
    return `${primeiroNome} | ${deadline.title}`;
  }
  return deadline.title;
};
```

Substituir todas as ocorrencias de `{deadline.title}` por `{formatDeadlineTitle(deadline)}`.

---

## Observacoes

- O primeiro nome sera usado para manter a exibicao compacta
- Nas tabelas de historico, a coluna "Responsavel" ja existe, entao o formato com nome fica redundante - mas manteremos para consistencia visual
- O separador `|` foi escolhido por ser visualmente limpo e nao conflitar com caracteres comuns em titulos

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Agenda.tsx` | Adicionar helper e atualizar ~5 locais de exibicao de titulo |
| `src/components/Agenda/AgendaContent.tsx` | Adicionar helper e atualizar ~5 locais de exibicao de titulo |
