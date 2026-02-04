
# Correção: Botão "Ver Projeto" não Funciona na Agenda

## Problema Identificado

No detalhe do prazo na Agenda, quando o prazo tem um **Protocolo de Origem** vinculado, o botão "Ver Projeto" não funciona.

**Causa raiz:** A rota está escrita incorretamente no código.

| Atual (errado) | Correto |
|----------------|---------|
| `/projects/${projectId}` | `/project/${projectId}` |

A rota de projetos é `/:tenant/project/:id` (singular), mas o código usa "projects" (plural).

---

## Localização do Erro

**Arquivo:** `src/pages/Agenda.tsx` (linha 1523)

```typescript
// ERRADO
navigate(`/projects/${selectedDeadline.protocoloOrigem?.projectId}`);

// CORRETO  
navigate(`/project/${selectedDeadline.protocoloOrigem?.projectId}`);
```

---

## Correção

Alterar a linha 1523 de:
```typescript
navigate(`/projects/${selectedDeadline.protocoloOrigem?.projectId}`);
```

Para:
```typescript
navigate(`/project/${selectedDeadline.protocoloOrigem?.projectId}`);
```

---

## Observação

O hook `useTenantNavigation` já está sendo usado corretamente. Ele adiciona automaticamente o prefixo do tenant (ex: `/solvenza/`), então só precisamos corrigir o nome da rota de "projects" para "project".

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Agenda.tsx` | Corrigir rota na linha 1523: `/projects/` → `/project/` |
