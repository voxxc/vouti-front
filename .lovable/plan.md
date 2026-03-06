

## Exibir criador do prazo e garantir rastreio completo

### O que muda

**`src/components/Controladoria/PrazosCasoTab.tsx`**

1. **Incluir criador no select**: Adicionar join com `profiles` via `user_id` para buscar o nome de quem criou o prazo:
   ```
   criador:profiles!deadlines_user_id_fkey(full_name, avatar_url)
   ```

2. **Expandir interface `PrazoCaso`**: Adicionar campo `criador` com `full_name` e `avatar_url`

3. **Renderizar criador**: Abaixo da linha do advogado responsável, exibir de forma sutil (texto `text-[11px]` muted) algo como:
   ```
   Criado por Fulano
   ```
   Apenas texto simples, sem avatar, para manter minimalista e diferenciar do advogado responsável.

4. **Manter advogado responsável** como já está (com avatar) — ele é quem deve cumprir o prazo. O criador é informação secundária.

### Resultado visual (por prazo)

```text
⏰ Título do Prazo                    [toggle]
   📅 01/01/2025  |  Pendente  |  Protocolo › Etapa
   Descrição do prazo...
   👤 Nome do Advogado Responsável
   Criado por Nome do Criador
```

### 1 arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `PrazosCasoTab.tsx` | Buscar e exibir nome do criador do prazo |

