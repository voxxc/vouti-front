
# Fix: Notificação de protocolo deve abrir o ProjectDrawer (não navegar para página)

## Problema

Quando o usuário clica na notificação de menção em protocolo, o `onProjectNavigation` faz `navigate(/project/${pid})` — navegando para uma **página inteira**. O esperado é abrir o **ProjectDrawer** no dashboard atual, já na aba de protocolos com o protocolo correto selecionado.

## Solução

### 1. Adicionar callback `onProtocoloNavigation` no NotificationCenter

Em vez de reutilizar `onProjectNavigation` para protocolos, criar um callback dedicado:
```
onProtocoloNavigation?: (projectId: string, protocoloId: string) => void;
```

No `handleNotificationClick`, para `target === 'protocolo'`, chamar `onProtocoloNavigation(projectId, entityId)` em vez de `onProjectNavigation`.

### 2. Implementar handler no DashboardLayout

No `DashboardLayout`, passar `onProtocoloNavigation` ao `NotificationCenter`. O handler vai:
1. Setar `selectedProjectId` com o `projectId`
2. Abrir o `ProjectDrawer` (`setProjectDrawerOpen(true)`)
3. Guardar o `protocoloId` em um novo state para deep-linking

### 3. Propagar `protocoloId` para dentro do ProjectDrawer

Passar o `protocoloId` como prop ao `ProjectDrawer` → `ProjectDrawerContent`. Dentro do conteúdo, quando esse prop estiver presente, auto-selecionar a aba "Protocolos" e abrir o protocolo específico (reaproveitando a lógica de `?protocolo=UUID` que já existe no `ProjectProtocolosList`).

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `NotificationCenter.tsx` | Nova prop `onProtocoloNavigation`; usar no target `'protocolo'` |
| `DashboardLayout.tsx` | Novo state `pendingProtocoloId`; handler que abre ProjectDrawer com projeto+protocolo; passar ao NotificationCenter e ProjectDrawer |
| `ProjectDrawer.tsx` | Aceitar prop `protocoloId` opcional e repassar ao `ProjectDrawerContent` |
| `ProjectDrawerContent.tsx` | Receber `protocoloId` e auto-navegar para aba Protocolos + selecionar o protocolo |
