

## Diagnóstico

O código do campo "Motivo da alteração" **já está implementado** no `EditarPrazoDialog.tsx` (linhas 278-290). Porém, ele só aparece quando **as duas condições** são verdadeiras:

1. `advogadoId !== originalAdvogadoId` — o responsável foi trocado
2. `originalAdvogadoId !== null` — o prazo **já tinha** um responsável antes

**Problema**: Se o prazo não tem responsável atribuído (campo vazio), `originalAdvogadoId` fica `null`, e o campo de motivo **nunca aparece** — nem ao selecionar um responsável pela primeira vez, nem ao trocar.

### Solução

Alterar a condição na linha 62 para mostrar o campo sempre que o responsável mudar, independente de ter um anterior ou não:

```typescript
// De:
const responsavelChanged = advogadoId !== originalAdvogadoId && originalAdvogadoId !== null;

// Para:
const responsavelChanged = advogadoId !== originalAdvogadoId;
```

Isso garante que o campo de motivo apareça em qualquer cenário de alteração do responsável.

### Arquivo
| Arquivo | Mudança |
|---------|---------|
| `src/components/Agenda/EditarPrazoDialog.tsx` | Remover `&& originalAdvogadoId !== null` da condição |

