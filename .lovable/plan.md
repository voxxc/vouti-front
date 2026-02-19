

## Aplicar redesign da Agenda ao Drawer

### Problema

O drawer da Agenda (`AgendaDrawer` -> `AgendaContent`) ainda usa o layout antigo com Cards pesados (~1485 linhas de codigo duplicado). A pagina `Agenda.tsx` ja foi redesenhada com o layout minimalista (duas colunas, filtro de usuario, linhas compactas), mas o drawer nao foi atualizado.

### Abordagem

Extrair a logica e UI redesenhada de `Agenda.tsx` para um componente compartilhado, e reutiliza-lo tanto na pagina quanto no drawer. Isso elimina a duplicacao massiva de codigo.

### Estrutura proposta

```text
Agenda.tsx (pagina)
  -> DashboardLayout wrapper
  -> Header com botao Voltar
  -> AgendaContentShared (logica + UI redesenhada)

AgendaDrawer.tsx
  -> Sheet wrapper com header proprio
  -> AgendaContentShared (mesma logica + UI)
```

### Detalhes tecnicos

**1. Reescrever `AgendaContent.tsx` (~1485 linhas) com o mesmo layout minimalista de `Agenda.tsx`**

- Copiar a logica e UI redesenhada (filtro de usuario no topo, layout duas colunas com calendario + listagem minimalista, `DeadlineRow`, agrupamento por secoes)
- Remover elementos especificos da pagina: `DashboardLayout`, botao "Voltar", `useNavigationLoading`, `useSearchParams`
- Adaptar o layout para funcionar dentro do drawer (sem largura fixa do calendario em telas menores -- empilhar verticalmente por padrao)
- Manter todos os dialogs (criacao, detalhes, extensao, edicao, confirmacao de conclusao)

**2. Simplificar `Agenda.tsx` para reutilizar `AgendaContent`**

- Manter apenas o wrapper `DashboardLayout`, header com botao Voltar, e renderizar `<AgendaContent />`
- Remover toda a logica duplicada (estados, fetches, handlers, computed values) que sera movida para `AgendaContent`

**3. Ajustar `AgendaDrawer.tsx`**

- Remover o `<ScrollArea>` wrapper redundante (o conteudo interno ja tera scroll proprio)
- Ajustar padding se necessario

| Arquivo | Mudanca |
|---|---|
| `src/components/Agenda/AgendaContent.tsx` | Reescrever com layout minimalista (filtro usuario, calendario compacto, listagem em linhas, DeadlineRow) |
| `src/pages/Agenda.tsx` | Simplificar para wrapper DashboardLayout + header + `<AgendaContent />` |
| `src/components/Agenda/AgendaDrawer.tsx` | Ajuste menor de padding/scroll |

### Resultado

- Drawer e pagina terao exatamente o mesmo visual e funcionalidade
- Eliminacao de ~1400 linhas de codigo duplicado
- Manutencao futura: qualquer mudanca na Agenda aplica automaticamente em ambos os contextos
