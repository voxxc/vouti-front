

## Plano: Alerta verde "Em processamento" + Botão de notificação no Super Admin

### Alterações

**1. `src/components/Controladoria/ProcessoOABDetalhes.tsx` — Mudar alerta**
- Trocar cor de vermelho/destructive para **verde** (`bg-green-50 border-green-200`)
- Trocar ícone de `AlertTriangle` para `Clock` ou `Loader2`
- Texto: "Seu processo está sendo processado. Ao finalizar, você será notificado." (sem mencionar "não encontrado")

**2. `src/components/SuperAdmin/SuperAdminProcessosSemAndamentos.tsx` — Botão "Notificar Conclusão"**
- Adicionar coluna "Quem adicionou" mostrando o `created_by`
- Adicionar botão **"Notificar"** ao lado de "Reprocessar" para cada processo
- Ao clicar, inserir uma notificação na tabela `notifications` para o `created_by` do processo com mensagem sobre conclusão/resolução do processo
- Marcar visualmente o processo como "notificado" (pode usar campo local ou um campo `notificado_em` na tabela)

**3. Migration: Novo tipo de notificação + campo de controle**
- Adicionar `processo_processado` ao `notifications_type_check` constraint
- Adicionar coluna `notificado_em timestamptz` em `processos_oab` para rastrear se o super admin já notificou o usuário

### Arquivos

| Ação | Arquivo |
|------|---------|
| Migration | Adicionar tipo `processo_processado` + coluna `notificado_em` |
| Editar | `ProcessoOABDetalhes.tsx` — alerta verde "em processamento" |
| Editar | `SuperAdminProcessosSemAndamentos.tsx` — botão notificar conclusão |

