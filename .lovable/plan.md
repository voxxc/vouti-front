

## Plano: Adicionar data de envio nas mensagens do chat de tarefa

### Objetivo
Exibir a data junto com o horário em cada mensagem do bate-papo da tarefa. Atualmente só mostra "HH:mm", passará a mostrar "dd/MM/yyyy HH:mm".

### Implementação

**Arquivo**: `src/components/Planejador/PlanejadorTaskChat.tsx`

Na linha 477, alterar o formato de `"HH:mm"` para `"dd/MM/yyyy HH:mm"`:

```tsx
// De:
{format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}

// Para:
{format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
```

Mudança de uma única linha, sem impacto em nenhum outro componente.

