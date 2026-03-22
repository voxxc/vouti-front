

# Ocultar `cliente_id` do registro de atividades

## Problema

Na aba **Info** → **Registro de Atividades**, a linha 808 renderiza todos os campos de `entry.details` como pares chave-valor brutos:

```tsx
{Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
```

Isso faz com que campos internos como `cliente_id` (UUID) apareçam para o usuário, sem valor informativo.

## Solução

**Arquivo:** `PlanejadorTaskDetail.tsx` (linha ~808)

Filtrar campos com sufixo `_id` (UUIDs internos) antes de renderizar os detalhes da atividade, mantendo apenas campos legíveis como `nome`, `status`, etc.:

```tsx
{Object.entries(entry.details)
  .filter(([k]) => !k.endsWith('_id'))
  .map(([k, v]) => `${k}: ${v}`)
  .join(' · ')}
```

Isso remove `cliente_id`, `processo_id`, `user_id` e qualquer outro UUID interno da exibição, mantendo apenas informações úteis como o nome do cliente ou status.

