

# Notificação de etapa deve abrir EtapaModal diretamente

## Problema

Ao clicar numa notificação de menção em etapa, o código atual chama `onProjectNavigation` que faz `navigate('/project/...')` — uma navegação de página inteira. O esperado é abrir o **EtapaModal** diretamente no dashboard.

## Dados disponíveis

Notificações de etapa já salvam:
- `related_task_id` = ID da etapa
- `related_project_id` = ID do projeto
- Da tabela `project_protocolo_etapas` podemos obter `protocolo_id`

## Solução

### 1. `NotificationCenter.tsx` — nova prop `onEtapaNavigation`

Adicionar:
```
onEtapaNavigation?: (etapaId: string) => void;
```

No bloco `target === 'etapa'`, chamar `onEtapaNavigation(entityId)` em vez de `onProjectNavigation`.

### 2. `DashboardLayout.tsx` — abrir EtapaModal

- Importar `EtapaModal` e tipo `ProjectProtocoloEtapa`
- Novo state: `pendingEtapaId`, `etapaModalData` (etapa object, protocoloId, projectId)
- Handler `onEtapaNavigation(etapaId)`: busca a etapa no Supabase (`project_protocolo_etapas` + `project_protocolos.project_id`), monta o objeto `ProjectProtocoloEtapa`, e abre o `EtapaModal`
- Renderizar `<EtapaModal>` no layout com `onUpdate` e `onDelete` que fazem operações diretas no Supabase
- Passar `onEtapaNavigation` ao `NotificationCenter`

### 3. Fallback para notificações antigas

No fallback existente (quando `related_project_id` é null), tentar também buscar em `project_protocolo_etapas` se não encontrar em `project_protocolos`.

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `NotificationCenter.tsx` | Nova prop `onEtapaNavigation`; usar no `target === 'etapa'` |
| `DashboardLayout.tsx` | State + fetch da etapa + render `EtapaModal` + handler passado ao NotificationCenter |

